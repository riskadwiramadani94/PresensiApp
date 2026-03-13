import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Animated, Image, Text, 
  Dimensions, StatusBar, ActivityIndicator, Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AuthStorage } from '../utils/AuthStorage';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  
  // Animasi Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Jalankan animasi masuk
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Munculkan loading indicator sedikit terlambat (delicate touch)
    Animated.timing(loadingOpacity, {
      toValue: 1,
      duration: 800,
      delay: 500,
      useNativeDriver: true,
    }).start();

    // Cek status login dengan durasi 7 detik
    const timer = setTimeout(() => {
      checkLoginStatus();
    }, 7000);

    return () => clearTimeout(timer);
  }, []);

  const checkLoginStatus = async () => {
    try {
      const user = await AuthStorage.getUser();
      // Transisikan ke halaman yang tepat
      if (user) {
        user.role === 'admin' 
          ? router.replace('/admin/dashboard-admin' as any) 
          : router.replace('/(pegawai)/dashboard-pegawai');
      } else {
        router.replace('/login' as any);
      }
    } catch (error) {
      router.replace('/login' as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Pastikan StatusBar konsisten dengan Login Screen */}
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <LinearGradient colors={['#FFFFFF', '#F1F5F9']} style={styles.background}>
        
        {/* Dekorasi Latar Belakang yang lebih artistik */}
        <View style={styles.blobContainer}>
          <View style={styles.topBlob} />
          <View style={styles.bottomBlob} />
        </View>

        <View style={styles.content}>
          <Animated.View 
            style={[
              styles.imageWrapper,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}
          >
            <Image 
              source={require('../assets/images/presensi-logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [{ translateY: textTranslateY }],
            alignItems: 'center' 
          }}>
            <Text style={styles.appName}>PresensiApp</Text>
            <View style={styles.taglineWrapper}>
              <View style={styles.dash} />
              <Text style={styles.tagline}>SISTEM PRESENSI DIGITAL</Text>
              <View style={styles.dash} />
            </View>
          </Animated.View>

          {/* Loading Indicator yang lebih subtle */}
          <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
            <ActivityIndicator size="small" color="#004643" />
            <Text style={styles.loadingText}>Loading...</Text>
          </Animated.View>
        </View>

        <Animated.Text style={[styles.footerText, { opacity: fadeAnim }]}>
          Build with Excellence • v1.0.0
        </Animated.Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', zIndex: 10 },
  
  // Logo Wrapper dengan Soft Shadow
  imageWrapper: {
    width: 140,
    height: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#004643',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 15,
      },
      android: { elevation: 8 },
    }),
  },
  logo: { width: 100, height: 100, borderRadius: 50 },
  
  // Typography
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  taglineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  tagline: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 2,
    marginHorizontal: 10,
  },
  dash: { width: 15, height: 1.5, backgroundColor: '#CBD5E1' },
  
  // Loading
  loadingContainer: { marginTop: 60, alignItems: 'center' },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Abstract Background Decor
  blobContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  topBlob: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width,
    backgroundColor: '#F0FDF4',
    top: -height * 0.15,
    left: -width * 0.2,
  },
  bottomBlob: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width,
    backgroundColor: '#F8FAFC',
    bottom: -height * 0.1,
    right: -width * 0.3,
  },

  footerText: {
    position: 'absolute',
    bottom: 50,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 1,
  },
});