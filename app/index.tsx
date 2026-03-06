import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Image, Animated, 
  ActivityIndicator, StatusBar, Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthAPI } from '../constants/config';
import { AuthStorage } from '../utils/AuthStorage';
import { CustomAlert } from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const alert = useCustomAlert();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkLoginStatus();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 30, useNativeDriver: true })
    ]).start();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const user = await AuthStorage.getUser();
      if (user) {
        user.role === 'admin' 
          ? router.replace('/admin/dashboard-admin' as any) 
          : router.replace('/(pegawai)/dashboard-pegawai');
        return;
      }
    } catch (e) { console.log(e); } 
    finally { setCheckingSession(false); }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert.showAlert({ type: 'error', message: 'Email dan password wajib diisi' });
      return;
    }
    setLoading(true);
    
    // Haptic-like feedback animation
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start();

    try {
      const result = await AuthAPI.login(email, password);
      if (result.success) {
        await AuthStorage.setUser({ ...result.data, id_user: result.data.id });
        result.data.role === 'admin' 
          ? router.replace('/admin/dashboard-admin' as any) 
          : router.replace('/(pegawai)/dashboard-pegawai');
      } else {
        alert.showAlert({ type: 'error', message: result.message || 'Kredensial salah' });
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Masalah koneksi server' });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004643" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <Animated.ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.imageContainer}>
              <Image 
                source={require('../assets/images/collaborative.png')} 
                style={styles.heroImage}
                resizeMode="contain"
              />
              <View style={styles.imageBlob} />
            </View>
            <Text style={styles.brandName}>Selamat Datang</Text>
            <Text style={styles.tagline}>
              Masuk ke akun Anda untuk mengakses{"\n"}
              <Text style={{color: '#475569'}}>semua fitur dan layanan yang tersedia</Text>
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
                <Ionicons name="mail-outline" size={20} color={emailFocused ? "#004643" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput 
                  placeholder="Contoh: user@example.com" 
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
                <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? "#004643" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput 
                  placeholder="Masukkan password" 
                  style={styles.textInput}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#94A3B8" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.forgotPasswordContainer}
              onPress={() => router.push('/lupa-password' as any)}
            >
              <Text style={styles.forgotPasswordText}>Lupa Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 20 }}>
              <TouchableOpacity 
                activeOpacity={0.9}
                style={[styles.primaryButton, loading && styles.disabled]} 
                onPress={handleLogin} 
                disabled={loading}
              >
                <LinearGradient 
                  colors={['#004643', '#012c2a']} 
                  start={{x: 0, y: 0}} 
                  end={{x: 1, y: 1}}
                  style={styles.gradientButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Masuk Sekarang</Text>
                      <View style={styles.buttonIconCircle}>
                        <Ionicons name="arrow-forward" size={16} color="#004643" />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert 
        visible={alert.visible} 
        type={alert.config.type} 
        message={alert.config.message} 
        onClose={alert.hideAlert} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  keyboardView: { flex: 1 },
  scrollContent: { paddingHorizontal: 32, paddingTop: 40, paddingBottom: 40 },
  
  // Header Style
  header: { marginBottom: 40, marginTop: 20 },
  imageContainer: { marginBottom: 32, position: 'relative' },
  heroImage: { width: 140, height: 140, zIndex: 2 },
  imageBlob: { 
    position: 'absolute', 
    width: 100, 
    height: 100, 
    backgroundColor: '#F0FDF4', 
    borderRadius: 50, 
    top: 20, 
    left: -10, 
    zIndex: 1 
  },
  brandName: { 
    fontSize: 34, 
    fontWeight: '800', 
    color: '#0F172A', 
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed'
  },
  tagline: { 
    fontSize: 15, 
    color: '#94A3B8', 
    marginTop: 10, 
    lineHeight: 22, 
    fontWeight: '500' 
  },

  // Form Style
  formContainer: { width: '100%' },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 8,
    marginLeft: 4
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2
  },
  inputContainerFocused: {
    borderColor: '#004643',
    elevation: 2,
    shadowOpacity: 0.06
  },
  inputIcon: {
    marginRight: 12
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500'
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 0
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#004643',
    fontWeight: '500'
  },

  // Premium Button
  primaryButton: { 
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { 
        shadowColor: '#004643', 
        shadowOffset: { width: 0, height: 8 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 12 
      },
      android: { elevation: 6 }
    })
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 17, marginRight: 12 },
  buttonIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  disabled: { opacity: 0.7 },
});