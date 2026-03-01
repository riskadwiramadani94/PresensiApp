import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// Import polyfills for Expo Go compatibility
if (Platform.OS === 'web') {
  // Web-specific polyfills
  if (typeof global === 'undefined') {
    window.global = window;
  }
}

// Import the main App component
import App from './App';

// Register the main component
registerRootComponent(App);