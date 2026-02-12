import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  Image,
  Animated,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthAPI } from '../constants/config';
import { AuthStorage } from '../utils/AuthStorage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const passwordRef = useRef<TextInput>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (text.length > 0) {
      setEmailValid(validateEmail(text));
    } else {
      setEmailValid(null);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (text.length > 0) {
      setPasswordValid(text.length >= 6);
    } else {
      setPasswordValid(null);
    }
  };

  const checkLoginStatus = async () => {
    try {
      const user = await AuthStorage.getUser();
      if (user) {
        if (user.role === 'admin') {
          router.replace('/admin/dashboard-admin' as any);
        } else {
          router.replace('/(pegawai)/dashboard-pegawai');
        }
        return;
      }
    } catch (error) {
      console.log('Error checking login status:', error);
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(logoAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }),
      Animated.timing(formAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      })
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Peringatan", "Email dan Password harus diisi!");
      return;
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      })
    ]).start();

    setLoading(true);
    try {
      const result = await AuthAPI.login(email, password);
      
      if (result.success) {
        // Simpan data user yang sebenarnya dari database
        const userData = {
          id_user: result.data.id, // Backend login response menggunakan 'id'
          email: result.data.email,
          role: result.data.role,
          nama_lengkap: result.data.nama_lengkap || result.data.nama || 'User',
          jabatan: result.data.jabatan || '',
          divisi: result.data.divisi || '',
          nip: result.data.nip || '',
          no_telepon: result.data.no_telepon || '',
          jenis_kelamin: result.data.jenis_kelamin || '',
          tanggal_lahir: result.data.tanggal_lahir || '',
          alamat: result.data.alamat || ''
        };
        
        await AuthStorage.setUser(userData);
        
        // Redirect berdasarkan role dari database
        if (result.data.role === 'admin') {
          router.replace('/admin/dashboard-admin' as any);
        } else {
          router.replace('/(pegawai)/dashboard-pegawai');
        }
      } else {
        Alert.alert("Login Gagal", result.message || "Email atau password salah");
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert("Error", "Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <LinearGradient
        colors={['#F8FAFB', '#E8F4F8', '#F0F9FF']}
        style={styles.container}
      >
        <View style={styles.loadingSessionContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingSessionText}>Checking session...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#F8FAFB', '#E8F4F8', '#F0F9FF']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.headerArea, { 
          transform: [{ 
            scale: logoAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1]
            })
          }]
        }]}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/validin.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.welcomeText}>Selamat Datang!</Text>
          <Text style={styles.descriptionText}>Masuk ke akun Anda untuk melanjutkan</Text>
        </Animated.View>

        <Animated.View style={[styles.formArea, { transform: [{ translateY: formAnim }] }]}>
          <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color={emailFocused ? "#004643" : "#666"} 
              style={styles.inputIcon} 
            />
            <TextInput 
              placeholder="Email" 
              style={styles.input}
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              placeholderTextColor="#999"
            />
            {emailValid !== null && (
              <Ionicons 
                name={emailValid ? "checkmark-circle" : "close-circle"} 
                size={20} 
                color={emailValid ? "#10B981" : "#EF4444"} 
              />
            )}
          </View>

          <View style={[styles.inputWrapper, passwordFocused && styles.inputFocused]}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={passwordFocused ? "#004643" : "#666"} 
              style={styles.inputIcon} 
            />
            <TextInput 
              ref={passwordRef}
              placeholder="Password" 
              style={styles.input}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={handlePasswordChange}
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                handleLogin();
              }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholderTextColor="#999"
            />
            {passwordValid !== null && (
              <Ionicons 
                name={passwordValid ? "checkmark-circle" : "close-circle"} 
                size={20} 
                color={passwordValid ? "#10B981" : "#EF4444"} 
                style={{ marginRight: 8 }}
              />
            )}
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color={passwordFocused ? "#004643" : "#666"} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Lupa Password?</Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity 
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]} 
              onPress={handleLogin} 
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={[styles.loginText, { marginLeft: 10 }]}>Memproses...</Text>
                </View>
              ) : (
                <Text style={styles.loginText}>Masuk</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1
  },
  keyboardView: {
    flex: 1
  },
  innerContainer: { 
    flex: 1, 
    padding: 30, 
    justifyContent: 'center' 
  },
  headerArea: { 
    alignItems: 'center', 
    marginBottom: 40 
  },
  logoContainer: { 
    width: 70,
    height: 70,
    backgroundColor: '#E6F0EF',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#004643',
    elevation: 6,
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8
  },
  logoImage: {
    width: 140,
    height: 105
  },
  welcomeText: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#004643', 
    marginBottom: 8,
    letterSpacing: 0.5
  },
  descriptionText: { 
    fontSize: 15, 
    color: '#666', 
    textAlign: 'center',
    lineHeight: 22,
    marginHorizontal: 20
  },
  formArea: { 
    width: '100%' 
  },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderWidth: 1.5, 
    borderColor: '#E8E8E8', 
    borderRadius: 14, 
    paddingHorizontal: 16, 
    marginBottom: 16,
    height: 58,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  inputFocused: {
    borderColor: '#004643',
    elevation: 4,
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12
  },
  inputIcon: { 
    marginRight: 12 
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#333',
    fontWeight: '500'
  },
  eyeButton: {
    padding: 4
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rememberText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500'
  },
  forgotPassword: {
    padding: 4
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#004643',
    fontWeight: '600'
  },
  loginBtn: { 
    backgroundColor: '#004643', 
    height: 58, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 10,
    elevation: 6,
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  loginBtnDisabled: {
    backgroundColor: '#7A9B99',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loginText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 17,
    letterSpacing: 0.5
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  loadingSessionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingSessionText: {
    marginTop: 16,
    fontSize: 16,
    color: '#004643',
    fontWeight: '500'
  }
});