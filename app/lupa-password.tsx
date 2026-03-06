import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Image, Animated, 
  ActivityIndicator, StatusBar 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomAlert } from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { API_CONFIG } from '../constants/config';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const alert = useCustomAlert();
  
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  
  const otpRefs = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 9, useNativeDriver: true })
    ]).start();
  }, []);

  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const getResendCooldown = () => {
    const cooldowns = [60, 180, 600, 1800];
    return cooldowns[resendCount] || 3600;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async () => {
    if (!email) {
      alert.showAlert({ type: 'error', message: 'Masukkan email Anda terlebih dahulu' });
      return;
    }

    if (resendCount >= 4) {
      alert.showAlert({ type: 'error', message: 'Anda telah mencapai batas maksimal. Tunggu 1 jam untuk mencoba lagi.' });
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/lupa-password/kirim-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert.showAlert({ type: 'success', message: data.message });
        setStep(2);
        setTimer(getResendCooldown());
        setCanResend(false);
        setResendCount(prev => prev + 1);
      } else {
        alert.showAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Gagal mengirim kode OTP' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      alert.showAlert({ type: 'error', message: 'Masukkan kode OTP lengkap' });
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/lupa-password/verifikasi-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, kode_otp: otpCode })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert.showAlert({ type: 'success', message: 'Kode OTP valid' });
        setStep(3);
      } else {
        alert.showAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Gagal memverifikasi kode OTP' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      alert.showAlert({ type: 'error', message: 'Lengkapi semua field password' });
      return;
    }

    if (newPassword !== confirmPassword) {
      alert.showAlert({ type: 'error', message: 'Konfirmasi password tidak cocok' });
      return;
    }

    if (newPassword.length < 6) {
      alert.showAlert({ type: 'error', message: 'Password minimal 6 karakter' });
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/lupa-password/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, kode_otp: otp.join(''), password_baru: newPassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert.showAlert({ type: 'success', message: 'Password berhasil direset' });
        setTimeout(() => router.back(), 2000);
      } else {
        alert.showAlert({ type: 'error', message: data.message });
      }
    } catch (error) {
      alert.showAlert({ type: 'error', message: 'Gagal mereset password' });
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.brandName}>Lupa Password?</Text>
            <Text style={styles.tagline}>
              Masukkan email yang terdaftar dan kami akan mengirimkan kode OTP untuk mengatur ulang password Anda.
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Alamat Email</Text>
              <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
                <Ionicons name="mail-outline" size={20} color={emailFocused ? "#004643" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput 
                  placeholder="user@example.com" 
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
            <TouchableOpacity style={[styles.primaryButton, loading && styles.disabled]} onPress={handleSendOTP} disabled={loading}>
              <LinearGradient colors={['#004643', '#012c2a']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.gradientButton}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kirim Kode OTP</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.brandName}>Masukkan Kode OTP</Text>
            <Text style={styles.tagline}>
              Kami telah mengirimkan kode OTP 6 digit ke email {email}.
            </Text>
            
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={18} color={timer > 0 ? "#004643" : "#EF4444"} />
              <Text style={[styles.timerText, timer === 0 && styles.timerExpired]}>
                {timer > 0 ? `Kode berlaku ${formatTime(timer)}` : 'Kode OTP telah expired'}
              </Text>
            </View>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => otpRefs.current[index] = ref}
                  style={[styles.otpBox, digit && styles.otpBoxFilled]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.disabled]} 
              onPress={handleVerifyOTP} 
              disabled={loading}
            >
              <LinearGradient colors={['#004643', '#012c2a']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.gradientButton}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verifikasi Kode</Text>}
              </LinearGradient>
            </TouchableOpacity>

            {canResend && (
              <TouchableOpacity 
                style={styles.resendButton} 
                onPress={handleSendOTP}
                disabled={loading}
              >
                <Text style={styles.resendText}>Kirim Ulang Kode OTP</Text>
              </TouchableOpacity>
            )}
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.brandName}>Password Baru</Text>
            <Text style={styles.tagline}>
              Masukkan password baru Anda. Pastikan password minimal 6 karakter.
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password Baru</Text>
              <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
                <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? "#004643" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput 
                  placeholder="Masukkan password baru" 
                  style={styles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Konfirmasi Password</Text>
              <View style={[styles.inputContainer, confirmPasswordFocused && styles.inputContainerFocused]}>
                <Ionicons name="lock-closed-outline" size={20} color={confirmPasswordFocused ? "#004643" : "#94A3B8"} style={styles.inputIcon} />
                <TextInput 
                  placeholder="Ulangi password baru" 
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={[styles.primaryButton, loading && styles.disabled]} onPress={handleResetPassword} disabled={loading}>
              <LinearGradient colors={['#004643', '#012c2a']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.gradientButton}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={28} color="#0F172A" />
      </TouchableOpacity>

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
                source={require('../assets/images/lupa-password.png')} 
                style={styles.heroImage}
                resizeMode="contain"
              />
              <View style={styles.imageBlob} />
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {getStepContent()}
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
  keyboardView: { flex: 1 },
  scrollContent: { paddingHorizontal: 32, paddingTop: 20, paddingBottom: 40 },
  
  backButton: {
    marginTop: Platform.OS === 'ios' ? 50 : 20,
    marginLeft: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },

  // Reusing your exact styles for consistency
  header: { marginBottom: 40, marginTop: 10 },
  imageContainer: { marginBottom: 32, position: 'relative' },
  heroImage: { width: 140, height: 140, zIndex: 2 },
  imageBlob: { 
    position: 'absolute', 
    width: 100, 
    height: 100, 
    backgroundColor: '#F0FDF4', // Tetap pakai warna hijau muda yang sama
    borderRadius: 50, 
    top: 20, 
    left: -10, 
    zIndex: 1 
  },
  brandName: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#0F172A', 
    letterSpacing: -0.5,
  },
  tagline: { 
    fontSize: 15, 
    color: '#64748B', 
    marginTop: 10, 
    lineHeight: 22, 
    fontWeight: '500' 
  },

  formContainer: { width: '100%' },
  inputWrapper: { marginBottom: 24 },
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
  },
  inputContainerFocused: {
    borderColor: '#004643',
  },
  inputIcon: { marginRight: 12 },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500'
  },

  primaryButton: { 
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#004643', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 }
    })
  },
  gradientButton: {
    paddingVertical: 16,
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
  
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  timerText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#004643',
  },
  timerExpired: {
    color: '#EF4444',
  },
  
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#fff',
  },
  otpBoxFilled: {
    borderColor: '#004643',
    backgroundColor: '#F0FDF4',
  },
  
  resendButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#004643',
  },
});