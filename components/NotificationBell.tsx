import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationBellProps {
  userRole?: string;
}

export default function NotificationBell({ userRole }: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentRole, setCurrentRole] = useState<string>('');

  useEffect(() => {
    loadUserRole();
    fetchUnreadCount();
    
    // Refresh count setiap 30 detik
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUserRole = async () => {
    try {
      const role = userRole || await AsyncStorage.getItem('userRole') || 'pegawai';
      setCurrentRole(role);
    } catch (error) {
      console.error('Error loading user role:', error);
      setCurrentRole('pegawai');
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      const role = userRole || await AsyncStorage.getItem('userRole') || 'pegawai';
      const API_URL = await AsyncStorage.getItem('API_URL') || 'http://192.168.1.100:3000';
      
      if (!token || !userId) return;

      const response = await fetch(
        `${API_URL}/api/inbox/notifications?user_id=${userId}&role=${role}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Hitung notifikasi yang belum dibaca (untuk demo, anggap semua belum dibaca)
        const unread = data.data.length;
        setUnreadCount(unread);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  const handlePress = () => {
    // Navigate berdasarkan role
    if (currentRole === 'admin') {
      router.push('/notifications-admin');
    } else {
      router.push('/notifications');
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name="notifications-outline" 
          size={24} 
          color="#FFFFFF" 
        />
        
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});