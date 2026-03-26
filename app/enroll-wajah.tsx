import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/config';

const PANDUAN = [
  { icon: 'glasses-outline', text: 'Lepas kacamata', ok: false },
  { icon: 'medical-outline', text: 'Lepas masker', ok: false },
  { icon: 'sunny-outline', text: 'Pastikan pencahayaan cukup', ok: true },
  { icon: 'person-outline', text: 'Hanya 1 wajah dalam frame', ok: true },
  { icon: 'scan-outline', text: 'Hadapkan wajah lurus ke kamera', ok: true },
];

export default function EnrollWajahScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<'panduan' | 'kamera'>('panduan');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('Posisikan wajah di dalam kotak lalu tekan tombol');

  const handleAmbilFoto = async () => {
    if (!cameraRef.current || loading) return;
    setLoading(true);
    setMessage('Memproses wajah...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        shutterSound: false,
      });
      if (!photo) throw new Error('Gagal mengambil foto');

      const userData = await AsyncStorage.getItem('userData');
      if (!userData) throw new Error('Data user tidak ditemukan');
      const user = JSON.parse(userData);
      const userId = user.id_user || user.id;

      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('foto', { uri: photo.uri, name: `enroll_${userId}_${Date.now()}.jpg`, type: 'image/jpeg' } as any);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/face/enroll`, { method: 'POST', body: formData });
      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setMessage('Wajah berhasil didaftarkan!');
        setTimeout(() => {
          const role = user.role;
          role === 'admin'
            ? router.replace('/admin/dashboard-admin' as any)
            : router.replace('/(pegawai)/dashboard-pegawai');
        }, 1500);
      } else {
        setStatus('error');
        setMessage(result.message || 'Gagal mendaftarkan wajah');
        setTimeout(() => { setStatus('idle'); setMessage('Posisikan wajah di dalam kotak lalu tekan tombol'); }, 2500);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage('Terjadi kesalahan: ' + error.message);
      setTimeout(() => { setStatus('idle'); setMessage('Posisikan wajah di dalam kotak lalu tekan tombol'); }, 2500);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={64} color="#004643" />
          <Text style={styles.permissionTitle}>Izin Kamera Diperlukan</Text>
          <Text style={styles.permissionSubtitle}>Untuk mendaftarkan wajah, aplikasi memerlukan akses kamera</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
            <Text style={styles.btnText}>Izinkan Kamera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Halaman panduan
  if (step === 'panduan') {
    return (
      <SafeAreaView style={styles.containerLight}>
        <ScrollView contentContainerStyle={styles.panduanContent}>
          <View style={styles.panduanHeader}>
            <Ionicons name="shield-checkmark-outline" size={56} color="#004643" />
            <Text style={styles.panduanTitle}>Sebelum Mendaftarkan Wajah</Text>
            <Text style={styles.panduanSubtitle}>Pastikan kondisi berikut terpenuhi agar wajah dapat terdaftar dengan benar</Text>
          </View>

          {PANDUAN.map((item, i) => (
            <View key={i} style={styles.panduanItem}>
              <View style={[styles.panduanIcon, { backgroundColor: item.ok ? '#E8F5E9' : '#FFEBEE' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.ok ? '#4CAF50' : '#F44336'} />
              </View>
              <Text style={styles.panduanText}>{item.text}</Text>
              <Ionicons name={item.ok ? 'checkmark-circle' : 'close-circle'} size={20} color={item.ok ? '#4CAF50' : '#F44336'} />
            </View>
          ))}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#004643" />
            <Text style={styles.infoText}>Wajah Anda akan digunakan sebagai identitas untuk absensi. Pastikan foto seperti foto KTP.</Text>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => setStep('kamera')}>
            <Text style={styles.btnText}>Saya Siap, Lanjutkan</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Halaman kamera
  const borderColor = status === 'success' ? '#4CAF50' : status === 'error' ? '#F44336' : '#fff';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('panduan')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Daftarkan Wajah</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          <View style={styles.overlay}>
            <View style={[styles.faceFrame, { borderColor }]}>
              {status === 'success' && <Ionicons name="checkmark-circle" size={56} color="#4CAF50" />}
              {status === 'error' && <Ionicons name="close-circle" size={56} color="#F44336" />}
            </View>
          </View>
        </CameraView>
      </View>

      <View style={styles.footer}>
        <Text style={[
          styles.statusText,
          status === 'success' && { color: '#4CAF50' },
          status === 'error' && { color: '#F44336' },
          status === 'idle' && { color: '#fff' },
        ]}>
          {message}
        </Text>

        <TouchableOpacity
          style={[styles.btnPrimary, (loading || status === 'success') && styles.btnDisabled]}
          onPress={handleAmbilFoto}
          disabled={loading || status === 'success'}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Ambil Foto & Daftarkan</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  containerLight: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cameraContainer: { flex: 1, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  faceFrame: { width: 220, height: 280, borderWidth: 3, borderRadius: 120, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: 24, gap: 12 },
  statusText: { textAlign: 'center', fontSize: 14, marginBottom: 4 },
  btnPrimary: { backgroundColor: '#004643', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#555' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#333', textAlign: 'center' },
  permissionSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  panduanContent: { padding: 24, gap: 12 },
  panduanHeader: { alignItems: 'center', marginBottom: 8, gap: 8 },
  panduanTitle: { fontSize: 20, fontWeight: '700', color: '#333', textAlign: 'center' },
  panduanSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  panduanItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#f9f9f9', borderRadius: 12 },
  panduanIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  panduanText: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#E6F0EF', padding: 12, borderRadius: 10, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 13, color: '#004643', lineHeight: 18 },
});
