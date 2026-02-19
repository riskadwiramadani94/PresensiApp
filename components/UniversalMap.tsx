import React, { forwardRef } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

interface UniversalMapProps {
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onPress?: (event: any) => void;
  children?: React.ReactNode;
}

const UniversalMap = forwardRef<MapView, UniversalMapProps>(({ style, initialRegion, region, onPress, children }, ref) => {
  return (
    <MapView
      ref={ref}
      style={style}
      initialRegion={initialRegion || region}
      onPress={onPress}
      provider={PROVIDER_GOOGLE}
    >
      {children}
    </MapView>
  );
});

export default UniversalMap;
export { MapView, Marker };
