import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Platform, Text } from 'react-native';
import { AuthStorage } from '../../utils/AuthStorage';
import { InboxAPI } from '../../constants/config';

export default function AdminTabLayout() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    checkAdminRole();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchUnreadCount();
      
      // Update unread count setiap 30 detik
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const fetchUnreadCount = async () => {
    try {
      const user = await AuthStorage.getUser();
      if (!user) return;
      
      const data = await InboxAPI.getUnreadCount(user.id_user || user.id, 'admin');
      if (data.success) {
        setUnreadCount(data.unread_count || 0);
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

  const checkAdminRole = async () => {
    try {
      const user = await AuthStorage.getUser();
      console.log('Admin Layout - User role:', user?.role);
      
      if (!user) {
        console.log('No user, redirecting to login');
        router.replace('/');
        return;
      }
      
      if (user.role !== 'admin') {
        console.log('Not admin, redirecting to pegawai');
        router.replace('/(pegawai)/dashboard-pegawai');
        return;
      }
      
      console.log('User is admin, showing admin layout');
    } catch (error) {
      console.log('Error checking role:', error);
      router.replace('/');
      return;
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#004643' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

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
        name="dashboard-admin"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox-admin"
        options={{
          title: 'Kotak Masuk',
          tabBarIcon: ({ color, focused }) => (
            <InboxIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracking-pegawai"
        options={{
          title: 'Tracking',
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
              <Ionicons name="location" size={32} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="bantuan-admin"
        options={{
          title: 'Bantuan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "help-circle" : "help-circle-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil-admin"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
