import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, Text } from 'react-native';
import { InboxAPI } from '@/constants/config';
import { AuthStorage } from '@/utils/AuthStorage';

export default function PegawaiTabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    
    // Update unread count setiap 30 detik
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const user = await AuthStorage.getUser();
      if (!user) return;
      
      // Gunakan endpoint pegawai inbox yang benar
      const response = await fetch(`http://10.251.102.188:3000/pegawai/inbox/api/notifications?user_id=${user.id_user || user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Hitung unread count dari notifikasi yang belum completed
        const unread = data.data.filter((notif: any) => !notif.isCompleted && !notif.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const InboxIcon = ({ color, focused }: { color: string; focused: boolean }) => (
    <View style={{ position: 'relative' }}>
      <Ionicons 
        name={focused ? "mail" : "mail-outline"} 
        size={24} 
        color={color} 
      />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: -8,
          right: -8,
          backgroundColor: '#FF4444',
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#004643',
        }}>
          <Text style={{
            color: '#fff',
            fontSize: 11,
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false, 
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        tabBarStyle: { 
          height: Platform.OS === 'ios' ? 90 : 80, 
          paddingBottom: Platform.OS === 'ios' ? 8 : 15,
          paddingTop: 8,
          backgroundColor: '#004643',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        }
      }}
    >
      <Tabs.Screen 
        name="dashboard-pegawai" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={24} 
              color={color} 
            />
          )
        }} 
      />
      <Tabs.Screen 
        name="inbox" 
        options={{ 
          title: 'Kotak Masuk',
          tabBarIcon: ({ color, focused }) => (
            <InboxIcon color={color} focused={focused} />
          )
        }} 
      />
      <Tabs.Screen 
        name="presensi" 
        options={{ 
          title: 'Presensi',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: '#43A047',
              borderRadius: 30,
              width: 60,
              height: 60,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: -30,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              borderWidth: 4,
              borderColor: '#004643',
            }}>
              <Ionicons 
                name="finger-print" 
                size={32} 
                color="#fff" 
              />
            </View>
          ),
          tabBarLabel: () => null,
        }} 
      />
      <Tabs.Screen 
        name="bantuan" 
        options={{ 
          title: 'Bantuan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "help-circle" : "help-circle-outline"} 
              size={24} 
              color={color} 
            />
          )
        }} 
      />
      <Tabs.Screen 
        name="profil" 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={24} 
              color={color} 
            />
          )
        }} 
      />
    </Tabs>
  );
}
