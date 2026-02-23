import React from 'react';
import { View, Text, StyleSheet, StatusBar as RNStatusBar } from 'react-native';
import { AppHeader } from '../../../components';

export default function LemburScreen() {
  return (
    <View style={styles.container}>
      <RNStatusBar 
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      
      <AppHeader 
        title="Lembur"
        showBack={true}
      />
      
      <View style={styles.content}>
        <Text>Lembur Screen</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
});
