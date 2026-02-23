import React from 'react';
import { View, Text, StyleSheet, StatusBar as RNStatusBar } from 'react-native';
import { AppHeader } from '../../../components';

export default function BantuanScreen() {
  return (
    <View style={styles.container}>
      <RNStatusBar 
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      
      <AppHeader 
        title="Bantuan"
        showBack={true}
      />
      
      <View style={styles.content}>
        <Text>Bantuan Screen</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
});
