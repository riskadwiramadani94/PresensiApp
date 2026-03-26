import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../constants/config';
import { AppHeader } from '../components';
import FaceScanner from './FaceScanner';

interface Props {
  visible: boolean;
  userId?: number | null;       // kalau ada → langsung enroll ke API
  onSuccess: (photoUri?: string) => void; // kalau userId null → kembalikan uri
  onClose: () => void;
  title?: string;
}

export default function FaceEnrollModal({ visible, userId, onSuccess, onClose, title }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<'idle' | 'match' | 'nomatch' | 'success'>('idle');
  const [message, setMessage] = useState('Arahkan wajah ke kamera');
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (visible && permission?.granted) {
      setStatus('idle');
      setMessage('Arahkan wajah ke kamera');
      startScanning();
    }
    if (!visible) stopScanning();
    return () => stopScanning();
  }, [visible, permission?.granted]);

  const startScanning = () => {
    if (scanIntervalRef.current) return;
    scanIntervalRef.current = setInterval(scanFace, 2000);
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

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        shutterSound: false,
      });
      if (!photo) return;

      const formData = new FormData();
      formData.append('foto', { uri: photo.uri, name: `face_${Date.now()}.jpg`, type: 'image/jpeg' } as any);

      if (userId) {
        // Ada userId → langsung enroll
        formData.append('user_id', userId.toString());
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/face/enroll`, { method: 'POST', body: formData });
        const result = await res.json();

        if (result.success) {
          stopScanning();
          setStatus('success');
          setMessage('Wajah berhasil didaftarkan!');
          setTimeout(() => { onSuccess(); }, 1200);
        } else {
          setStatus('nomatch');
          setMessage(result.message || 'Wajah tidak memenuhi syarat');
          setTimeout(() => {
            setStatus(prev => prev !== 'success' ? 'idle' : prev);
            setMessage(prev => prev !== 'Wajah berhasil didaftarkan!' ? 'Arahkan wajah ke kamera' : prev);
          }, 1500);
        }
      } else {
        // Tidak ada userId → validasi dulu, simpan uri sementara
        formData.append('user_id', '0');
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/face/validate`, { method: 'POST', body: formData });
        const result = await res.json();

        if (result.valid) {
          stopScanning();
          setStatus('success');
          setMessage('Foto wajah siap!');
          setTimeout(() => { onSuccess(photo.uri); }, 1200);
        } else {
          setStatus('nomatch');
          setMessage(result.message || 'Wajah tidak memenuhi syarat');
          setTimeout(() => {
            setStatus(prev => prev !== 'success' ? 'idle' : prev);
            setMessage(prev => prev !== 'Foto wajah siap!' ? 'Arahkan wajah ke kamera' : prev);
          }, 1500);
        }
      }
    } catch {
      // silent
    } finally {
      isProcessingRef.current = false;
    }
  };

  const borderColor =
    status === 'match' || status === 'success' ? '#4CAF50' :
    status === 'nomatch' ? '#F44336' : '#ffffff';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.container}>
        <AppHeader
          title={title || 'Daftarkan Wajah'}
          showBack
          onBackPress={() => { stopScanning(); onClose(); }}
        />

        {!permission?.granted ? (
          <View style={styles.center}>
            <Ionicons name="camera-outline" size={64} color="#ccc" />
            <Text style={styles.permText}>Izin kamera diperlukan</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
              <Text style={styles.btnText}>Izinkan Kamera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cameraContainer}>
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
                <View style={styles.overlay}>
                  <FaceScanner
                    color={borderColor}
                    scanning={status === 'idle' || status === 'match'}
                  />
                  {status === 'success' && (
                    <View style={{ position: 'absolute' }}>
                      <Ionicons name="checkmark-circle" size={72} color="#4CAF50" />
                    </View>
                  )}
                </View>
              </CameraView>
            </View>

            <View style={styles.footer}>
              <View style={[styles.statusBadge, { borderColor, backgroundColor: borderColor + '22' }]}>
                {status === 'match' || status === 'success'
                  ? <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  : status === 'nomatch'
                  ? <Ionicons name="close-circle" size={20} color="#F44336" />
                  : <Ionicons name="scan-outline" size={20} color="#fff" />
                }
                <Text style={[styles.statusText, { color: borderColor === '#ffffff' ? '#fff' : borderColor }]}>
                  {message}
                </Text>
              </View>
              <Text style={styles.hint}>Sistem akan otomatis mengambil foto saat wajah terdeteksi</Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#004643' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16, backgroundColor: '#000' },
  cameraContainer: { flex: 1, marginHorizontal: 16, marginTop: 8, borderRadius: 20, overflow: 'hidden' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: 24, alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, borderWidth: 1 },
  statusText: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 12, color: '#888', textAlign: 'center' },
  btnPrimary: { backgroundColor: '#004643', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  permText: { color: '#fff', textAlign: 'center', fontSize: 15 },
});
