import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

export default function PegawaiTabLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false, 
        tabBarActiveTintColor: '#004643',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { 
          height: 70, 
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0'
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500'
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
        name="riwayat" 
        options={{ 
          title: 'Riwayat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "stats-chart" : "stats-chart-outline"} 
              size={24} 
              color={color} 
            />
          )
        }} 
      />
      <Tabs.Screen 
        name="presensi" 
        options={{ 
          title: 'Presensi',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: '#004643',
              borderRadius: 25,
              width: 50,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: -20,
              elevation: 5,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84
            }}>
              <Ionicons 
                name={focused ? "time" : "time-outline"} 
                size={24} 
                color="#fff" 
              />
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="inbox" 
        options={{ 
          title: 'Inbox',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "mail" : "mail-outline"} 
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