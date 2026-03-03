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
  const slideAnim = useRef(new Animated.Value(30)).current;
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
      console.log('Check login - User data:', user);
      
      if (user) {
        console.log('User role:', user.role);
        
        if (user.role === 'admin') {
          console.log('Redirecting to admin dashboard');
          router.replace('/admin/dashboard-admin' as any);
        } else {
          console.log('Redirecting to pegawai dashboard');
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
    
    // Smooth fade + subtle slide animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Peringatan", "Email dan Password harus diisi!");
      return;
    }

    // Subtle button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
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
      <View style={styles.container}>
        <View style={styles.loadingSessionContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingSessionText}>Checking session...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
      <Animated.View style={[styles.innerContainer, { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        <View style={styles.headerArea}>          
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/validin.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.welcomeText}>Selamat Datang</Text>
          <Text style={styles.descriptionText}>Silakan masuk untuk melanjutkan</Text>
        </View>

        <View style={styles.formArea}>
          <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color={emailFocused ? "#004643" : "#999"} 
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
              color={passwordFocused ? "#004643" : "#999"} 
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
                color={passwordFocused ? "#004643" : "#999"} 
              />
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
                <>
                  <Text style={styles.loginText}>Masuk</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#F8FAFB'
  },
  keyboardView: {
    flex: 1
  },
  innerContainer: { 
    flex: 1, 
    paddingHorizontal: 24, 
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40
  },
  headerArea: { 
    alignItems: 'center', 
    marginBottom: 48
  },
  logoContainer: { 
    width: 90,
    height: 90,
    backgroundColor: '#fff',
    borderRadius: 22,
    marginBottom: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8
  },
  logoImage: {
    width: 180,
    height: 135
  },
  welcomeText: { 
    fontSize: 26, 
    fontWeight: '700', 
    color: '#1F2937', 
    marginBottom: 8,
    letterSpacing: -0.3
  },
  descriptionText: { 
    fontSize: 15, 
    color: '#6B7280', 
    textAlign: 'center',
    fontWeight: '400'
  },
  formArea: { 
    width: '100%' 
  },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderWidth: 1.5, 
    borderColor: '#E5E7EB', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    marginBottom: 16,
    height: 54,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2
  },
  inputFocused: {
    borderColor: '#004643',
    elevation: 2,
    shadowOpacity: 0.06
  },
  inputIcon: { 
    marginRight: 12 
  },
  input: { 
    flex: 1, 
    fontSize: 15, 
    color: '#1F2937',
    fontWeight: '500'
  },
  eyeButton: {
    padding: 4
  },
  loginBtn: { 
    backgroundColor: '#004643', 
    height: 54, 
    borderRadius: 12, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  loginBtnDisabled: {
    backgroundColor: '#9CA3AF',
    elevation: 1
  },
  loginText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16,
    letterSpacing: 0.3
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
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500'
  }
});