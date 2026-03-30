import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, Text, AppState } from 'react-native';
import { AuthStorage } from '@/utils/AuthStorage';
import { PresensiCardProvider } from '@/contexts/PresensiCardContext';
import { API_CONFIG } from '@/constants/config';

function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Heartbeat: kirim ping ke backend setiap 30 detik selama app aktif
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const user = await AuthStorage.getUser();
        if (!user) return;
        const id_user = user.id_user || user.id;
        await fetch(`${API_CONFIG.BASE_URL}/admin/presensi/api/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_user }),
        });
      } catch {}
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sendHeartbeat();
    });

    return () => {
      clearInterval(heartbeatInterval);
      appStateSub.remove();
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const user = await AuthStorage.getUser();
      if (!user) return;
      
      // Gunakan endpoint pegawai inbox yang benar
      const response = await fetch(`http://10.251.102.188:3000/pegawai/inbox/api/notifications?user_id=${user.id_user || user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Hitung unread count dari notifikasi yang belum completed
        const unread = data.data.filter((notif: any) => {
          const isRead = notif.isRead || notif.is_read || notif.isCompleted;
          return !isRead;
        }).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      // Silent fail - jangan log error untuk menghindari spam console
      setUnreadCount(0);
    }
  };

  const PresensiIcon = ({ color, focused }: { color: string; focused: boolean }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        backgroundColor: focused ? '#43A047' : '#2d7a47',
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
        <Ionicons name="finger-print" size={32} color="#fff" />
      </View>
    </View>
  );

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
            <PresensiIcon color={color} focused={focused} />
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

export default function PegawaiTabLayout() {
  return (
    <PresensiCardProvider>
      <TabLayout />
    </PresensiCardProvider>
  );
}
