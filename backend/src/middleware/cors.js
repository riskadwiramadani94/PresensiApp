const cors = require('cors');

const corsOptions = {
  origin: [
    // Development ports
    'http://localhost:8081', 
    'http://192.168.1.8:8081',
    'http://10.251.109.41:8081',
    'http://192.168.1.100:8081',
    'http://10.0.2.2:8081',
    
    // APK/Mobile access
    'http://localhost:3000',
    'http://192.168.1.8:3000',
    'http://10.0.2.2:3000',
    'http://127.0.0.1:3000',
    
    // Expo/React Native
    'exp://192.168.1.8:8081',
    'exp://localhost:8081',
    
    // Tunnel services
    'https://plenty-lizards-read.loca.lt'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 3600
};

// For APK builds, allow all origins in development
if (process.env.NODE_ENV === 'development') {
  corsOptions.origin = '*';
}

module.exports = cors(corsOptions);