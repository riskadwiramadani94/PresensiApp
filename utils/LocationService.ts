import * as Location from 'expo-location';
import { API_CONFIG, getApiUrl } from '../constants/config';
import { AuthStorage } from './AuthStorage';

let locationSubscription: Location.LocationSubscription | null = null;

export const LocationService = {
  // Start tracking location
  startTracking: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return false;
      }

      const user = await AuthStorage.getUser();
      if (!user || user.role !== 'pegawai') {
        return false;
      }

      // Stop existing subscription
      if (locationSubscription) {
        locationSubscription.remove();
      }

      // Start watching location
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 50, // Or when moved 50 meters
        },
        async (location) => {
          await LocationService.updateLocation(
            user.id_user,
            location.coords.latitude,
            location.coords.longitude
          );
        }
      );

      console.log('Location tracking started');
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  },

  // Stop tracking location
  stopTracking: () => {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
      console.log('Location tracking stopped');
    }
  },

  // Update location to server
  updateLocation: async (id_user: number, latitude: number, longitude: number) => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_LOCATION), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_user, latitude, longitude }),
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error updating location:', error);
      return false;
    }
  },

  // Get current location once
  getCurrentLocation: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  },
};
