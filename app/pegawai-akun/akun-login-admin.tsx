import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getApiUrl, API_CONFIG } from '../../constants/config';

interface LoginAccount {
  id_user: number;
  email: string;
  role: string;
  nama_lengkap?: string;
  nip?: string;
  jabatan?: string;
  divisi?: string;
}

export default function AkunLoginAdminScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<LoginAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<LoginAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [searchQuery, accounts]);

  const filterAccounts = () => {
    if (searchQuery.trim() === '') {
      setFilteredAccounts(accounts);
    } else {
      const filtered = accounts.filter(account =>
        account.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAccounts(filtered);
    }
  };

  const fetchAccounts = async () => {
    try {
      console.log('Fetching login accounts...');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.DATA_PEGAWAI));
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API Result:', result);
      
      if (result.success) {
        setAccounts(result.data || []);
        setFilteredAccounts(result.data || []);
      } else {
        console.log('API Error:', result.message);
        Alert.alert('Error', result.message || 'Gagal memuat data akun login');
      }
    } catch (error) {
      console.log('Fetch Error:', error);
      Alert.alert('Koneksi Error', 'Pastikan XAMPP Apache dan MySQL sudah berjalan.');
    } finally {
      setLoading(false);
    }
  };

  const showActionMenu = (id: number) => {
    Alert.alert(
      'Pilih Aksi',
      'Pilih tindakan yang ingin dilakukan:',
      [
        {
          text: 'Lihat Detail',
          onPress: () => {
            Alert.alert('Info', 'Fitur lihat detail akan segera tersedia');
          }
        },
        {
          text: 'Edit',
          onPress: () => {
            Alert.alert('Info', 'Fitur edit akan segera tersedia');
          }
        },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => deleteAccount(id)
        },
        {
          text: 'Batal',
          style: 'cancel'
        }
      ]
    );
  };

  const deleteAccount = async (id: number) => {
    Alert.alert(
      "Konfirmasi",
      "Yakin ingin menghapus akun login ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.DELETE_PEGAWAI), {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_user: id })
              });
              
              const result = await response.json();
              if (result.success) {
                fetchAccounts();
                Alert.alert('Sukses', 'Akun login berhasil dihapus');
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus akun login');
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.stickyHeader}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#004643" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kelola Akun Login</Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.statsText}>{filteredAccounts.length} Akun</Text>
        </View>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama, email, atau role..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAccounts}
          keyExtractor={(item) => item.id_user.toString()}
          ListHeaderComponent={renderHeader}
          stickyHeaderIndices={[0]}
          renderItem={({ item }) => (
            <View style={styles.accountCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.nama_lengkap?.charAt(0) || item.email.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{item.nama_lengkap || 'Nama belum diisi'}</Text>
                <Text style={styles.accountEmail}>{item.email}</Text>
                <Text style={styles.accountPassword}>••••••••</Text>
              </View>
              <View style={styles.accountActions}>
                <View style={[styles.roleBadge, { 
                  backgroundColor: item.role === 'admin' ? '#E3F2FD' : '#E8F5E9' 
                }]}>
                  <Text style={[styles.roleText, {
                    color: item.role === 'admin' ? '#1976D2' : '#388E3C'
                  }]}>{item.role}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.detailBtn}
                    onPress={() => Alert.alert('Info', 'Fitur lihat detail akan segera tersedia')}
                  >
                    <Ionicons name="eye-outline" size={15} color="#2196F3" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.editBtn}
                    onPress={() => Alert.alert('Info', 'Fitur edit akan segera tersedia')}
                  >
                    <Ionicons name="create-outline" size={15} color="#FF9800" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteBtn}
                    onPress={() => deleteAccount(item.id_user)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.floatingAddBtn}
        onPress={() => router.push('/pegawai-akun/add-data-pegawai' as any)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  stickyHeader: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  backBtn: {
    padding: 10,
    marginRight: 15,
    borderRadius: 10,
    backgroundColor: '#F5F5F5'
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#004643',
    flex: 1
  },
  headerStats: {
    backgroundColor: '#E6F0EF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#004643'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  listContent: {
    paddingBottom: 20,
  },
  accountCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    marginTop: 15,
    marginBottom: 0,
    marginHorizontal: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#E6F0EF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  avatarText: { color: '#004643', fontWeight: 'bold', fontSize: 20 },
  accountName: { fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 2 },
  accountEmail: { color: '#888', fontSize: 12, marginBottom: 2 },
  accountPassword: { color: '#666', fontSize: 12, marginBottom: 2 },
  accountActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 5
  },
  detailBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#E3F2FD'
  },
  editBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FFF3E0'
  },
  roleBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginBottom: 8 
  },
  roleText: { fontSize: 10, fontWeight: 'bold' },
  deleteBtn: { 
    padding: 6, 
    borderRadius: 6, 
    backgroundColor: '#FFEBEE' 
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#004643',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  }
});
