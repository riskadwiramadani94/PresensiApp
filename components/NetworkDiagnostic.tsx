import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../constants/config';
import { CustomAlert } from './CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

export const NetworkDiagnostic = () => {
  const [testing, setTesting] = useState(false);
  const { visible, config, showAlert, hideAlert, handleConfirm } = useCustomAlert();

  const runNetworkTest = async () => {
    setTesting(true);
    const results: string[] = [];

    try {
      // Test 1: Basic connectivity
      results.push('🔍 Testing network connectivity...');
      
      // Test localhost
      try {
        const response = await fetch('http://localhost/hadirinapp/test-connection.php', {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        results.push(`✅ Localhost: ${response.ok ? 'OK' : 'Failed'}`);
      } catch (error) {
        results.push(`❌ Localhost: Failed - ${(error as Error).message}`);
      }

      // Test current IP
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/test-connection.php`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        results.push(`✅ IP 192.168.1.8: ${response.ok ? 'OK' : 'Failed'}`);
      } catch (error) {
        results.push(`❌ IP 192.168.1.8: Failed - ${(error as Error).message}`);
      }

      // Test API endpoint
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/pengaturan/api/lokasi-kantor.php`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000)
        });
        results.push(`✅ API Endpoint: ${response.ok ? 'OK' : `Failed (${response.status})`}`);
      } catch (error) {
        results.push(`❌ API Endpoint: Failed - ${(error as Error).message}`);
      }

      // Show results
      const resultText = results.join('\\n\\n');
      const suggestions = [
        '💡 Troubleshooting Tips:',
        '1. Pastikan HP dan komputer di WiFi yang sama',
        '2. Periksa XAMPP/server backend sudah berjalan',
        '3. Coba akses http://192.168.1.8/hadirinapp di browser HP',
        '4. Restart router WiFi jika perlu',
        '5. Periksa firewall tidak memblokir port 80'
      ].join('\\n');

      showAlert({ 
        type: 'info', 
        title: 'Network Test Results', 
        message: `${resultText}\n\n${suggestions}` 
      });

    } catch (error) {
      showAlert({ 
        type: 'error', 
        title: 'Test Error', 
        message: `Failed to run network test: ${(error as Error).message}` 
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.diagnosticBtn} 
        onPress={runNetworkTest}
        disabled={testing}
      >
        <Ionicons name="wifi-outline" size={20} color="#004643" />
        <Text style={styles.diagnosticText}>
          {testing ? 'Testing Network...' : 'Test Network Connection'}
        </Text>
      </TouchableOpacity>
      
      <CustomAlert
        visible={visible}
        type={config.type}
        title={config.title}
        message={config.message}
        onClose={hideAlert}
        onConfirm={config.onConfirm ? handleConfirm : undefined}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
      />
    </>
  );
};

const styles = StyleSheet.create({
  diagnosticBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFEAA7'
  },
  diagnosticText: {
    fontSize: 14,
    color: '#004643',
    marginLeft: 8,
    fontWeight: '500'
  }
});