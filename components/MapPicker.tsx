import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface MapPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: { latitude: number; longitude: number; address: string }) => void;
  initialLocation?: { latitude: number; longitude: number };
}

export default function MapPicker({ visible, onClose, onConfirm, initialLocation }: MapPickerProps) {
  const mapRef = useRef<MapView>(null);
  const [markerPosition, setMarkerPosition] = useState(initialLocation || { latitude: -6.2088, longitude: 106.8456 });

  useEffect(() => {
    if (visible && !initialLocation) {
      getCurrentLocation();
    }
  }, [visible]);

  useEffect(() => {
    if (initialLocation) {
      setMarkerPosition(initialLocation);
    }
  }, [initialLocation]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setMarkerPosition(coords);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleMapPress = (e: any) => {
    setMarkerPosition(e.nativeEvent.coordinate);
  };

  const handleConfirm = async () => {
    try {
      const result = await Location.reverseGeocodeAsync(markerPosition);
      let address = 'Indonesia';
      
      if (result.length > 0) {
        const addr = result[0];
        const parts = [];
        if (addr.street) parts.push(addr.street);
        if (addr.district) parts.push(addr.district);
        if (addr.city) parts.push(addr.city);
        if (addr.region) parts.push(addr.region);
        address = parts.join(', ') || 'Indonesia';
      }

      onConfirm({ ...markerPosition, address });
    } catch (error) {
      onConfirm({ ...markerPosition, address: 'Indonesia' });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Pilih Lokasi</Text>
          <View style={{ width: 40 }} />
        </View>

        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: markerPosition.latitude,
            longitude: markerPosition.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          }}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton
        >
          <Marker
            coordinate={markerPosition}
            draggable
            onDragEnd={(e) => setMarkerPosition(e.nativeEvent.coordinate)}
          />
        </MapView>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#004643" />
          <Text style={styles.infoText}>
            Ketuk peta atau seret marker untuk memilih lokasi
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Ionicons name="close-circle-outline" size={20} color="#666" />
            <Text style={styles.cancelText}>Batal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.confirmText}>Konfirmasi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  closeBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F5F5F5' },
  title: { fontSize: 18, fontWeight: '700', color: '#004643' },
  map: { flex: 1 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8
  },
  infoText: { flex: 1, fontSize: 12, color: '#004643' },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    gap: 6
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#666' },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#004643',
    gap: 6
  },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#fff' }
});
