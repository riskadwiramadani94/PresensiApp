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
      results.push('🔍 Testing Node.js Backend...');
      results.push(`Base URL: ${API_CONFIG.BASE_URL}`);
      
      // Test 1: Node.js server health
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/api/admin`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000)
        });
        const data = await response.json();
        results.push(`✅ Node.js Server: OK (Status ${response.status})`);
        results.push(`   Response: ${JSON.stringify(data).substring(0, 50)}...`);
      } catch (error: any) {
        results.push(`❌ Node.js Server: Failed`);
        results.push(`   Error: ${error.message}`);
      }

      // Test 2: Login endpoint
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
          signal: AbortSignal.timeout(10000)
        });
        const data = await response.json();
        results.push(`✅ Login Endpoint: OK (Status ${response.status})`);
        results.push(`   Response: ${data.message || 'OK'}`);
      } catch (error: any) {
        results.push(`❌ Login Endpoint: Failed`);
        results.push(`   Error: ${error.message}`);
      }

      // Test 3: Alternative servers
      const servers = ['http://192.168.1.8:3000', 'http://10.0.2.2:3000', 'http://localhost:3000'];
      for (const server of servers) {
        try {
          const response = await fetch(`${server}/admin/api/admin`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          results.push(`✅ ${server}: OK`);
        } catch (error: any) {
          results.push(`❌ ${server}: ${error.message}`);
        }
      }

      // Show results
      const resultText = results.join('\n');
      const suggestions = [
        '',
        '💡 Troubleshooting:',
        '1. HP & PC harus di WiFi yang sama',
        '2. Backend harus running (npm start)',
        '3. Test di browser HP: http://192.168.1.8:3000',
        '4. Cek firewall Windows (allow port 3000)',
        '5. Rebuild app: expo start --clear'
      ].join('\n');

      showAlert({ 
        type: 'info', 
        title: 'Network Test Results', 
        message: `${resultText}\n${suggestions}` 
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