import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { API_CONFIG } from '../constants/config';
import { AppHeader } from '../components';
import FaceScanner from '../components/FaceScanner';

export default function AbsenFaceScreen() {
  const router = useRouter();
  const { jenis } = useLocalSearchParams<{ jenis: 'masuk' | 'pulang' }>();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'match' | 'nomatch' | 'success'>('idle');
  const [message, setMessage] = useState('Arahkan wajah ke kamera');
  const [confidence, setConfidence] = useState(0);
  const [faceRegistered, setFaceRegistered] = useState<boolean | null>(null);
  const [checkingFace, setCheckingFace] = useState(true);
  const lastPhotoRef = useRef<string | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    checkFaceRegistered();
    return () => stopScanning();
  }, []);

  useEffect(() => {
    if (permission?.granted && faceRegistered === true) startScanning();
  }, [permission?.granted, faceRegistered]);

  const checkFaceRegistered = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/face/status?user_id=${userId}`);
      const data = await res.json();
      setFaceRegistered(data.success && data.face_registered);
    } catch {
      setFaceRegistered(false);
    } finally {
      setCheckingFace(false);
    }
  };

  const startScanning = () => {
    if (scanIntervalRef.current) return;
    scanIntervalRef.current = setInterval(scanFace, 2500);
  };

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const scanFace = async () => {
    if (isProcessingRef.current || !cameraRef.current) return;
    isProcessingRef.current = true;
    setCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
        shutterSound: false,
        skipProcessing: true,
        animateShutter: false,
      });
      setCapturing(false);
      if (!photo) return;

      lastPhotoRef.current = photo.uri;

      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;

      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('foto', { uri: photo.uri, name: `scan_${Date.now()}.jpg`, type: 'image/jpeg' } as any);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/face/verify`, { method: 'POST', body: formData });
      const result = await response.json();

      if (result.face_not_registered) {
        stopScanning();
        setFaceRegistered(false);
        return;
      }

      if (result.success && result.match && result.confidence >= 60) {
        setConfidence(result.confidence);
        matchCountRef.current += 1;
        setMatchStatus('match');
        setMessage(`Wajah cocok (${result.confidence}%)`);

        if (matchCountRef.current >= 2) {
          stopScanning();
          setMatchStatus('success');
          setMessage('Memproses absensi...');
          await submitAbsen(userId, result.confidence);
        }
      } else {
        matchCountRef.current = 0;
        setMatchStatus('nomatch');
        setMessage(result.message || 'Wajah tidak dikenali');
        setTimeout(() => {
          setMatchStatus(prev => prev !== 'success' ? 'idle' : prev);
          setMessage(prev => prev === 'Memproses absensi...' ? prev : 'Arahkan wajah ke kamera');
        }, 1200);
      }
    } catch {
      matchCountRef.current = 0;
      setCapturing(false);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const submitAbsen = async (userId: string, faceConfidence: number) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMatchStatus('nomatch');
        setMessage('Izin lokasi diperlukan');
        setTimeout(() => { setMatchStatus('idle'); setMessage('Arahkan wajah ke kamera'); startScanning(); }, 2500);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const today = new Date().toISOString().split('T')[0];

      const dinasRes = await fetch(`${API_CONFIG.BASE_URL}/pegawai/presensi/api/check-dinas-status?user_id=${userId}&date=${today}`);
      const dinasData = await dinasRes.json();
      const lokasiList = dinasData.lokasi_valid || [];

      let lokasiValid = null;
      for (const lokasi of lokasiList) {
        const dist = getDistance(loc.coords.latitude, loc.coords.longitude, lokasi.latitude, lokasi.longitude);
        if (dist <= lokasi.radius) { lokasiValid = lokasi; break; }
      }

      if (!lokasiValid) {
        setMatchStatus('nomatch');
        setMessage('Anda di luar radius lokasi');
        setTimeout(() => { setMatchStatus('idle'); setMessage('Arahkan wajah ke kamera'); startScanning(); }, 2500);
        return;
      }

      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('jenis_presensi', jenis === 'pulang' ? 'pulang' : 'masuk');
      formData.append('latitude', loc.coords.latitude.toString());
      formData.append('longitude', loc.coords.longitude.toString());
      formData.append('lokasi_id', lokasiValid.id.toString());
      formData.append('face_confidence', faceConfidence.toString());
      if (lastPhotoRef.current) {
        formData.append('foto', { uri: lastPhotoRef.current, name: `presensi_${Date.now()}.jpg`, type: 'image/jpeg' } as any);
      }

      const res = await fetch(`${API_CONFIG.BASE_URL}/pegawai/presensi/api/presensi`, { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setMatchStatus('success');
        setMessage(`Absen ${jenis === 'pulang' ? 'Pulang' : 'Masuk'} Berhasil ✓`);
        setTimeout(() => router.back(), 2000);
      } else {
        setMatchStatus('nomatch');
        setMessage(data.message || 'Gagal absen');
        setTimeout(() => { setMatchStatus('idle'); setMessage('Arahkan wajah ke kamera'); startScanning(); }, 2500);
      }
    } catch (error: any) {
      setMatchStatus('nomatch');
      setMessage('Error: ' + error.message);
      setTimeout(() => { setMatchStatus('idle'); setMessage('Arahkan wajah ke kamera'); startScanning(); }, 2500);
    }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Loading cek status wajah
  if (checkingFace) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.permissionText}>Memeriksa data wajah...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Wajah belum terdaftar
  if (faceRegistered === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.noFaceTitle}>Wajah Belum Terdaftar</Text>
          <Text style={styles.noFaceSubtitle}>Anda harus mendaftarkan wajah terlebih dahulu sebelum bisa absen</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => { stopScanning(); router.replace('/enroll-wajah' as any); }}>
            <Text style={styles.btnText}>Daftarkan Wajah Sekarang</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnBack} onPress={() => { stopScanning(); router.back(); }}>
            <Text style={styles.btnBackText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={64} color="#ccc" />
          <Text style={styles.permissionText}>Izin kamera diperlukan</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
            <Text style={styles.btnText}>Izinkan Kamera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const borderColor =
    matchStatus === 'match' || matchStatus === 'success' ? '#4CAF50' :
    matchStatus === 'nomatch' ? '#F44336' : '#ffffff';

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={`Absen ${jenis === 'pulang' ? 'Pulang' : 'Masuk'}`}
        showBack
        onBackPress={() => { stopScanning(); router.back(); }}
      />

      <View style={styles.cameraContainer}>
        {/* Kamera terkunci ke depan, tidak ada tombol ganti */}
        <CameraView ref={cameraRef} style={styles.camera} facing="front" animateShutter={false}>
          <View style={styles.overlay}>
            {capturing && (
              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'rgba(0,0,0,0.15)',
                zIndex: 10,
              }} />
            )}
            <FaceScanner
              color={borderColor}
              scanning={matchStatus === 'idle' || matchStatus === 'match'}
            />
            {matchStatus === 'success' && (
              <View style={styles.successOverlay}>
                <Ionicons name="checkmark-circle" size={72} color="#4CAF50" />
              </View>
            )}
            {matchStatus === 'match' && (
              <Text style={styles.confidenceText}>{confidence}%</Text>
            )}
          </View>
        </CameraView>
      </View>

      <View style={styles.footer}>
        <View style={[styles.statusBadge, { backgroundColor: borderColor + '22', borderColor }]}>
          {matchStatus === 'match' || matchStatus === 'success'
            ? <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            : matchStatus === 'nomatch'
            ? <Ionicons name="close-circle" size={20} color="#F44336" />
            : <Ionicons name="scan-outline" size={20} color="#fff" />
          }
          <Text style={[styles.statusText, { color: borderColor === '#ffffff' ? '#fff' : borderColor }]}>
            {message}
          </Text>
        </View>
        {matchStatus === 'match' && (
          <Text style={styles.hintText}>Tahan sebentar...</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#004643' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16, backgroundColor: '#000' },
  cameraContainer: { flex: 1, marginHorizontal: 16, marginTop: 8, borderRadius: 20, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  successOverlay: { position: 'absolute' },
  confidenceText: { marginTop: 16, fontSize: 22, fontWeight: '700', color: '#4CAF50' },
  footer: { padding: 24, alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, borderWidth: 1 },
  statusText: { fontSize: 15, fontWeight: '600' },
  hintText: { fontSize: 13, color: '#aaa' },
  noFaceTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  noFaceSubtitle: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  btnPrimary: { backgroundColor: '#004643', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnBack: { paddingVertical: 10 },
  btnBackText: { color: '#aaa', fontSize: 14 },
  permissionText: { color: '#fff', textAlign: 'center', fontSize: 15 },
});
