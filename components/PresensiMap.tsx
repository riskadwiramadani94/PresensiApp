import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

interface PresensiMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  officeLocation?: { latitude: number; longitude: number; radius: number; nama: string } | null;
  locations?: Array<{ latitude: number; longitude: number; radius: number; nama: string; isInRadius?: boolean }>;
  style?: any;
}

export default function PresensiMap({ userLocation, officeLocation, locations, style }: PresensiMapProps) {
  const mapRef = useRef<MapView>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [hasInitialFit, setHasInitialFit] = useState(false);

  // Gunakan locations jika ada (untuk multiple lokasi dinas), atau officeLocation (untuk single lokasi)
  const displayLocations = locations || (officeLocation ? [officeLocation] : []);

  useEffect(() => {
    if (mapRef.current && userLocation && displayLocations.length > 0 && !hasInitialFit && !isUserInteracting) {
      const coordinates = [
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        ...displayLocations.map(loc => ({ latitude: loc.latitude, longitude: loc.longitude }))
      ];
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
      setHasInitialFit(true);
    }
  }, [userLocation, displayLocations]);

  const initialRegion = {
    latitude: userLocation?.latitude || displayLocations[0]?.latitude || -6.2088,
    longitude: userLocation?.longitude || displayLocations[0]?.longitude || 106.8456,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onPanDrag={() => setIsUserInteracting(true)}
        onRegionChangeComplete={() => {
          setTimeout(() => setIsUserInteracting(false), 1000);
        }}
      >
        {displayLocations.map((location, index) => {
          const isInRadius = location.isInRadius !== undefined ? location.isInRadius : true;
          const markerColor = isInRadius ? '#4CAF50' : '#F44336';
          const circleColor = isInRadius ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';
          const strokeColor = isInRadius ? '#4CAF50' : '#F44336';
          
          return (
            <React.Fragment key={index}>
              <Circle
                center={{ latitude: location.latitude, longitude: location.longitude }}
                radius={location.radius}
                fillColor={circleColor}
                strokeColor={strokeColor}
                strokeWidth={2}
              />
              <Marker
                coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                title={location.nama}
                description={isInRadius ? 'Dalam radius' : 'Di luar radius'}
                pinColor={markerColor}
              />
            </React.Fragment>
          );
        })}
        
        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
            title="Lokasi Anda"
            pinColor="#2196F3"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
