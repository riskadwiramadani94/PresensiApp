import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Platform } from 'react-native';
import { AuthStorage } from '../../utils/AuthStorage';

export default function AdminTabLayout() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminRole();
  }, []);

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
            <Ionicons name={focused ? "mail" : "mail-outline"} size={24} color={color} />
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
