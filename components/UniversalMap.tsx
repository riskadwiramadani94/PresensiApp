import React from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

interface UniversalMapProps {
  style?: any;
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onPress?: (event: any) => void;
  children?: React.ReactNode;
}

export default function UniversalMap({ style, region, onPress, children }: UniversalMapProps) {
  return (
    <MapView
      style={style}
      initialRegion={region}
      onPress={onPress}
      provider={PROVIDER_GOOGLE}
    >
      {children}
    </MapView>
  );
}

export { MapView, Marker };
