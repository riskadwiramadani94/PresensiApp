import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_CONFIG } from "../../config/api-config";
import { useTheme } from "../../contexts/ThemeContext";
import { RootStackParamList } from "../../types/navigation";
import { playModalSound, MODAL_ANIMATION_DURATION } from "../../utils/soundUtils";

const { width } = Dimensions.get("window");

type EditProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Chat">;
  onClose?: () => void;
};

export default function EditProfileScreen({
  navigation,
  onClose,
}: EditProfileScreenProps) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const buttonBottomAnim = useState(new Animated.Value(0))[0];
  const lastKeyboardHeight = useRef(0);
  const successModalAnim = useRef(new Animated.Value(0)).current;
  const skeletonAnim = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets(); // Mengambil margin aman layar

  useEffect(() => {
    const backAction = () => {
      onClose ? onClose() : navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    // Skeleton animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    return () => backHandler.remove();
  }, [navigation, onClose]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        const targetHeight =
          Platform.OS === "ios"
            ? e.endCoordinates.height
            : e.endCoordinates.height - 240;
        if (Math.abs(lastKeyboardHeight.current - targetHeight) > 10) {
          lastKeyboardHeight.current = targetHeight;
          Animated.timing(buttonBottomAnim, {
            toValue: targetHeight,
            duration: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        lastKeyboardHeight.current = 0;
        Animated.timing(buttonBottomAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }).start();
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoadingData(true);
      try {
        const userEmail = await AsyncStorage.getItem("userEmail");
        const userName = await AsyncStorage.getItem("userName");

        if (userEmail) {
          setEmail(userEmail);
          const response = await fetch(
            `${API_CONFIG.BACKEND_URL}/api/profile/get?email=${userEmail}`,
            {
              headers: { "ngrok-skip-browser-warning": "true" },
            },
          );

          const text = await response.text();
          try {
            const data = JSON.parse(text);
            if (data.success && data.user) {
              const dbName = data.user.name;
              const dbPhone = data.user.phone;
              setName(dbName || userName || "");
              setPhone(dbPhone || "");
              if (dbName) await AsyncStorage.setItem("userName", dbName);
            } else {
              setName(userName || "");
            }
          } catch (e) {
            setName(userName || "");
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadUserData();
  }, []);

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!name.trim()) {
      Alert.alert("Error", "Nama tidak boleh kosong");
      return;
    }
    if (password && password !== confirmPassword) {
      Alert.alert("Error", "Password tidak cocok");
      return;
    }
    if (password && password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    setIsLoading(true);
    try {
      const profileResponse = await fetch(
        `${API_CONFIG.BACKEND_URL}/api/profile/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            email,
            name: name.trim(),
            phone: phone.trim(),
          }),
        },
      );

      const profileData = await profileResponse.json();
      if (!profileData.success) {
        Alert.alert("Error", profileData.error || "Gagal memperbarui profil");
        setIsLoading(false);
        return;
      }

      if (password && password.trim()) {
        const passwordResponse = await fetch(
          `${API_CONFIG.BACKEND_URL}/api/profile/update-password`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify({ email, newPassword: password.trim() }),
          },
        );
        const passwordData = await passwordResponse.json();
        if (!passwordData.success) {
          Alert.alert(
            "Error",
            passwordData.error || "Gagal memperbarui password",
          );
          setIsLoading(false);
          return;
        }
      }

      await AsyncStorage.setItem("userName", name.trim());
      setIsLoading(false);
      playModalSound();
      setShowSuccessModal(true);
      Animated.spring(successModalAnim, {
        toValue: 1,
        tension: 150,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Error", "Gagal menyimpan perubahan.");
    }
  };

  return (
    <View
      style={[styles.mainContainer, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header Dinamis */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerPlaceholder} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Edit Profil
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => (onClose ? onClose() : navigation.goBack())}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {isLoadingData ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Section Skeleton */}
          <View style={styles.section}>
            <Animated.View
              style={[
                styles.skeletonText,
                {
                  width: 60,
                  height: 12,
                  marginBottom: 16,
                  opacity: skeletonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.7],
                  }),
                },
              ]}
            />
            <View style={styles.inputGroup}>
              <Animated.View
                style={[
                  styles.skeletonText,
                  {
                    width: 50,
                    height: 14,
                    marginBottom: 8,
                    opacity: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.inputContainer,
                  styles.skeletonBox,
                  {
                    opacity: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.inputGroup}>
              <Animated.View
                style={[
                  styles.skeletonText,
                  {
                    width: 50,
                    height: 14,
                    marginBottom: 8,
                    opacity: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.inputContainer,
                  styles.skeletonBox,
                  {
                    opacity: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.inputGroup}>
              <Animated.View
                style={[
                  styles.skeletonText,
                  {
                    width: 50,
                    height: 14,
                    marginBottom: 8,
                    opacity: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.inputContainer,
                  styles.skeletonBox,
                  {
                    opacity: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  },
                ]}
              />
            </View>
          </View>

          {/* Security Section Skeleton */}
          <View style={styles.section}>
            <Animated.View
              style={[
                styles.skeletonText,
                {
                  width: 80,
                  height: 12,
                  marginBottom: 16,
                  opacity: skeletonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.7],
                  }),
                },
              ]}
            />
            <View style={styles.inputGroup}>
              <Animated.View
                style={[
                  styles.skeletonText,
                  {
                    width: 100,
                    height: 14,
                    marginBottom: 8,
                    opacity: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.inputContainer,
                  styles.skeletonBox,
                  {
                    opacity: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.inputGroup}>
              <Animated.View
                style={[
                  styles.skeletonText,
                  {
                    width: 140,
                    height: 14,
                    marginBottom: 8,
                    opacity: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.inputContainer,
                  styles.skeletonBox,
                  {
                    opacity: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.7],
                    }),
                  },
                ]}
              />
            </View>
            <Animated.View
              style={[
                styles.skeletonText,
                {
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  marginTop: 8,
                  opacity: skeletonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.7],
                  }),
                },
              ]}
            />
          </View>
        </ScrollView>
      ) : (
        <>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile Section */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.textSecondary }]}
              >
                PROFIL
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Nama
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={name}
                    onChangeText={setName}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  No HP
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="08*******"
                    placeholderTextColor={colors.textSecondary}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Email
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    styles.inputDisabled,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.textSecondary }]}
                    value={email}
                    editable={false}
                  />
                  <Ionicons
                    name="lock-closed"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* Security Section */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.textSecondary }]}
              >
                KEAMANAN
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Password Baru
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="* * * * * * * *"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#8E8E93"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Konfirmasi Password
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="* * * * * * * *"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={20}
                      color="#8E8E93"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={[
                  styles.noteContainer,
                  { backgroundColor: colors.background },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.noteText, { color: colors.textSecondary }]}
                >
                  Kosongkan jika tidak ingin mengubah password.
                </Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Tombol Simpan - Naik saat keyboard aktif */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                bottom: buttonBottomAnim,
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.saveButton,
                isLoading && styles.buttonDisabled,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              Animated.timing(successModalAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                setShowSuccessModal(false);
                onClose ? onClose() : navigation.goBack();
              });
            }}
          />
          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: successModalAnim,
                transform: [
                  {
                    scale: successModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.modalTitle}>Berhasil</Text>
            <Text style={styles.modalMessage}>Profil berhasil diperbarui</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                Animated.timing(successModalAnim, {
                  toValue: 0,
                  duration: MODAL_ANIMATION_DURATION,
                  useNativeDriver: true,
                }).start(() => {
                  setShowSuccessModal(false);
                  onClose ? onClose() : navigation.goBack();
                });
              }}
            >
              <Text style={styles.modalButtonText}>Tutup</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingTop: Platform.OS === "android" ? 10 : 60,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  headerPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000000",
  },
  closeButton: {
    padding: 4,
    marginRight: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonBox: {
    backgroundColor: "#E5E5EA",
  },
  skeletonText: {
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  inputDisabled: {
    backgroundColor: "#F2F2F7",
    borderColor: "#E5E5EA",
  },
  inputTextDisabled: {
    color: "#8E8E93",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginTop: -8,
  },
  noteText: {
    fontSize: 12,
    color: "#8E8E93",
    marginLeft: 8,
    textAlign: "center",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 19 : 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#C6C6C8",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 30,
    width: width * 0.85,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E5EA",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34C759",
  },
});