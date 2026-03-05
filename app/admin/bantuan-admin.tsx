import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import { API_CONFIG } from '../../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ========================================
   TYPES & INTERFACES
======================================== */
interface FAQ {
  id_faq: number;
  kategori: string;
  pertanyaan: string;
  jawaban: string;
  urutan: number;
}

interface FAQByCategory {
  [key: string]: FAQ[];
}

/* ========================================
   MAIN COMPONENT
======================================== */
export default function BantuanAdminScreen() {
  const [faqData, setFaqData] = useState<FAQByCategory>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const categoryLabels: { [key: string]: string } = {
    pegawai_akun: 'Pegawai & Akun',
    validasi: 'Validasi & Persetujuan',
    kelola_dinas: 'Kelola Dinas',
    laporan: 'Laporan',
    pengaturan: 'Pengaturan',
    umum: 'Umum'
  };

  /* ========================================
     DATA FETCHING
  ======================================== */
  useEffect(() => {
    fetchFAQ();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchFAQ();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchFAQ = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/faq?role=admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setFaqData(result.data);
      }
    } catch (error) {
      console.error('Error fetching FAQ:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchFAQ = async () => {
    if (searchQuery.length < 2) return;
    
    setSearching(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/faq/search?q=${encodeURIComponent(searchQuery)}&role=admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setSearchResults(result.data);
      }
    } catch (error) {
      console.error('Error searching FAQ:', error);
    } finally {
      setSearching(false);
    }
  };

  /* ========================================
     EVENT HANDLERS
  ======================================== */
  const handleContact = (type: string) => {
    switch(type) {
      case 'whatsapp':
        Linking.openURL('https://wa.me/62895326830287');
        break;
      case 'email':
        Linking.openURL('mailto:riskadwiramadani94@gmail.com');
        break;
      case 'phone':
        Linking.openURL('tel:+62896326830287');
        break;
    }
  };

  /* ========================================
     RENDER FUNCTIONS
  ======================================== */
  const renderFAQItem = (faq: FAQ) => {
    const isExpanded = expandedFaq === faq.id_faq;
    return (
      <TouchableOpacity 
        key={faq.id_faq} 
        style={styles.faqCard}
        onPress={() => setExpandedFaq(isExpanded ? null : faq.id_faq)}
        activeOpacity={0.7}
      >
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{faq.pertanyaan}</Text>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>
        {isExpanded && (
          <Text style={styles.faqAnswer}>{faq.jawaban}</Text>
        )}
      </TouchableOpacity>
    );
  };

  /* ========================================
     MAIN RENDER
  ======================================== */
  return (
    <View style={styles.container}>
      <AppHeader title="Bantuan" showBack={false} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {loading ? (
            /* ========================================
                 SKELETON LOADING STATE - BANTUAN
            ======================================== */
            <>
              <View style={styles.skeletonSectionTitle} />
              {[1, 2, 3].map((item) => (
                <View key={item} style={styles.skeletonContactCard}>
                  <View style={styles.skeletonIconBox} />
                  <View style={styles.skeletonContactContent}>
                    <View style={styles.skeletonContactTitle} />
                    <View style={styles.skeletonContactSubtitle} />
                  </View>
                  <View style={styles.skeletonChevron} />
                </View>
              ))}

              <View style={[styles.skeletonSectionTitle, { marginTop: 24 }]} />
              <View style={styles.skeletonSearchBar} />
              {[1, 2, 3].map((item) => (
                <View key={item}>
                  <View style={styles.skeletonCategoryTitle} />
                  <View style={styles.skeletonFaqCard} />
                  <View style={styles.skeletonFaqCard} />
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hubungi Kami</Text>
            
            <TouchableOpacity style={styles.card} onPress={() => handleContact('whatsapp')}>
              <View style={[styles.iconBox, { backgroundColor: '#25D366' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>WhatsApp</Text>
                <Text style={styles.cardSubtitle}>Chat dengan kami</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => handleContact('email')}>
              <View style={[styles.iconBox, { backgroundColor: '#EA4335' }]}>
                <Ionicons name="mail" size={24} color="#fff" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Email</Text>
                <Text style={styles.cardSubtitle}>riskadwiramadani94@gmail.com</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => handleContact('phone')}>
              <View style={[styles.iconBox, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="call" size={24} color="#fff" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Telepon</Text>
                <Text style={styles.cardSubtitle}>+62 896-3268-30287</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FAQ</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari Pegawai..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
              {searching && <ActivityIndicator size="small" color="#2196F3" />}
            </View>

            {loading ? (
              <View>
                <View style={styles.skeletonSearchBar} />
                {[1, 2, 3].map((item) => (
                  <View key={item}>
                    <View style={styles.skeletonCategoryTitle} />
                    <View style={styles.skeletonFaqCard} />
                    <View style={styles.skeletonFaqCard} />
                  </View>
                ))}
              </View>
            ) : searchQuery.length >= 2 ? (
              <View>
                <Text style={styles.searchResultTitle}>Hasil Pencarian ({searchResults.length})</Text>
                {searchResults.length > 0 ? (
                  searchResults.map(renderFAQItem)
                ) : (
                  <Text style={styles.noResultText}>Tidak ada hasil yang ditemukan</Text>
                )}
              </View>
            ) : (
              Object.keys(faqData).map(category => (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{categoryLabels[category] || category}</Text>
                  {faqData[category].map(renderFAQItem)}
                </View>
              ))
            )}
          </View>
          </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ========================================
   STYLES
======================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  content: { padding: 20, paddingBottom: 20, backgroundColor: '#FAFBFC' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#999' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E8F0EF',
    gap: 12,
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '400',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  noResultText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    paddingVertical: 24,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  faqCard: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', flex: 1, marginRight: 8 },
  faqAnswer: { fontSize: 13, color: '#666', lineHeight: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },

  /* ========================================
     SKELETON STYLES - BANTUAN
  ======================================== */
  skeletonSectionTitle: {
    width: '30%',
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  skeletonIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  skeletonContactContent: {
    flex: 1,
  },
  skeletonContactTitle: {
    width: '40%',
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonContactSubtitle: {
    width: '70%',
    height: 14,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonChevron: {
    width: 20,
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonSearchBar: {
    height: 48,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 16,
  },
  skeletonCategoryTitle: {
    width: '40%',
    height: 18,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonFaqCard: {
    height: 80,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    marginBottom: 12,
  },
});
