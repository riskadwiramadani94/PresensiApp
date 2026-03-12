import { API_CONFIG } from '@/constants/config';

const SERVER_OPTIONS = [
  'http://10.251.102.191:3000',
  'http://10.0.2.2:3000', 
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

export class NetworkTest {
  static async testConnection() {
    const results = {
      baseUrl: API_CONFIG.BASE_URL,
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    };

    // Test all server options
    for (let i = 0; i < SERVER_OPTIONS.length; i++) {
      const serverUrl = SERVER_OPTIONS[i];
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${serverUrl}/admin/api/admin`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        results.tests.push({
          name: `Server ${i + 1} (${serverUrl})`,
          status: response.ok ? 'SUCCESS' : 'FAILED',
          statusCode: response.status,
          message: response.ok ? 'Server reachable ✅' : `HTTP ${response.status}`
        });
      } catch (error: any) {
        results.tests.push({
          name: `Server ${i + 1} (${serverUrl})`,
          status: 'ERROR',
          message: error.name === 'AbortError' ? 'Timeout (5s)' : error.message
        });
      }
    }

    // Test login endpoint with working server
    const workingServer = results.tests.find(t => t.status === 'SUCCESS');
    if (workingServer) {
      const serverUrl = workingServer.name.match(/\((.+)\)/)?.[1];
      if (serverUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(`${serverUrl}/auth/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const data = await response.json();
          
          results.tests.push({
            name: 'Login Endpoint Test',
            status: 'SUCCESS',
            statusCode: response.status,
            message: `Response: ${data.message || 'OK'} ✅`
          });
        } catch (error: any) {
          results.tests.push({
            name: 'Login Endpoint Test',
            status: 'ERROR',
            message: error.name === 'AbortError' ? 'Timeout (5s)' : error.message
          });
        }
      }
    } else {
      results.tests.push({
        name: 'Login Endpoint Test',
        status: 'SKIPPED',
        message: 'No working server found ❌'
      });
    }

    return results;
  }

  static async testAlternativeIPs() {
    const results = [];

    for (const serverUrl of SERVER_OPTIONS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${serverUrl}/admin/api/admin`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        results.push({
          ip: serverUrl,
          status: 'SUCCESS',
          statusCode: response.status
        });
      } catch (error: any) {
        results.push({
          ip: serverUrl,
          status: 'ERROR',
          message: error.name === 'AbortError' ? 'Timeout' : error.message
        });
      }
    }

    return results;
  }
}