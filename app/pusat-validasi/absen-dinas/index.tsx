import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  Alert, ActivityIndicator, ScrollView, Platform, RefreshControl, Modal, Image, StatusBar as RNStatusBar
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { AppHeader } from '../../../components';
import { KelolaDinasAPI } from '../../../constants/config';

interface DinasItem {
  id: number;
  namaKegiatan: string;
  nomorSpt: string;
  jenisDinas?: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jamKerja: string;
  lokasi: string;
  radius: number;
  lokasi_list?: Array<{
    id: number;
    nama_lokasi: string;
    radius: number;
  }>;
  pegawai: Array<{
    absenId?: number;
    nama: string;
    nip: string;
    status: string;
    jamAbsen: string | null;
    lokasiAbsen?: string;
    isLokasiSesuai?: boolean;
    fotoAbsen?: string;
    statusValidasi?: string;
  }>;
}

interface DateItem {
  date: Date;
  day: number;
  month: string;
  fullDate: string;
  dayName: string;
}

export default function AbsenDinasValidasiScreen() {
  const router = useRouter();
  const { dinasId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dinasData, setDinasData] = useState<DinasItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [pegawaiData, setPegawaiData] = useState<any[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      fetchDinasData();
      if (Platform.OS === 'android') {
        NavigationBar.setBackgroundColorAsync('transparent');
      }
    }, [])
  );

  const fetchDinasData = async (tanggal?: string) => {
    try {
      setLoading(true);
      const todayString = tanggal || getTodayDateString();
      
      if (dinasId) {
        const result = await KelolaDinasAPI.getDinasAktif(undefined, todayString);
        if (result.success) {
          const selectedDinas = result.data.find((d: DinasItem) => d.id === Number(dinasId));
          if (selectedDinas) {
            setDinasData([selectedDinas]);
            setSelectedDate(todayString);
            setPegawaiData(selectedDinas.pegawai || []);
          }
        }
      } else {
        const result = await KelolaDinasAPI.getDinasAktif(undefined, todayString);
        
        if (result.success) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const dinasAktif = result.data.filter((dinas: DinasItem) => {
            const mulai = new Date(dinas.tanggal_mulai);
            const selesai = new Date(dinas.tanggal_selesai);
            
            mulai.setHours(0, 0, 0, 0);
            selesai.setHours(23, 59, 59, 999);
            
            return today >= mulai && today <= selesai;
          });
          
          setDinasData(dinasAktif);
          
          if (dinasAktif.length > 0) {
            const todayString = getTodayDateString();
            setSelectedDate(todayString);
            setPegawaiData(dinasAktif[0].pegawai || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dinas:', error);
      Alert.alert('Error', 'Gagal memuat data dinas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDinasData(selectedDate || undefined);
    setRefreshing(false);
  };

  const generateDates = (startDate: string, endDate: string): DateItem[] => {
    const dates: DateItem[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    while (start <= end) {
      const dayName = start.toLocaleDateString('id-ID', { weekday: 'short' });
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');
      const fullDate = `${year}-${month}-${day}`;
      
      dates.push({
        date: new Date(start),
        day: start.getDate(),
        month: start.toLocaleDateString('id-ID', { month: 'short' }),
        fullDate: fullDate,
        dayName: dayName
      });
      start.setDate(start.getDate() + 1);
    }
    
    return dates;
  };

  const getTodayDateString = () => {
    const today = new Date();
    // Adjust to WIB (UTC+7)
    const wibOffset = 7 * 60; // 7 hours in minutes
    const localOffset = today.getTimezoneOffset(); // device timezone offset in minutes
    const wibTime = new Date(today.getTime() + (wibOffset + localOffset) * 60000);
    
    const year = wibTime.getFullYear();
    const month = String(wibTime.getMonth() + 1).padStart(2, '0');
    const day = String(wibTime.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    console.log('Today WIB:', dateString, 'Device time:', today.toLocaleString('id-ID'));
    return dateString;
  };



  const handleDateClick = async (date: string, dinas: DinasItem) => {
    setSelectedDate(date);
    // Fetch pegawai data for selected date
    try {
      const result = await KelolaDinasAPI.getDinasAktif(undefined, date);
      if (result.success && result.data.length > 0) {
        const selectedDinas = result.data.find((d: DinasItem) => d.id === dinas.id);
        if (selectedDinas) {
          setPegawaiData(selectedDinas.pegawai || []);
        }
      }
    } catch (error) {
      console.error('Error fetching pegawai for date:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateLong = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const renderDinasCard = ({ item }: { item: DinasItem }) => {
    const totalPegawai = item.pegawai?.length || 0;
    
    // Parse jam kerja untuk mendapatkan batas waktu absen
    const jamKerjaParts = item.jamKerja?.split('-') || [];
    const batasAbsen = jamKerjaParts[0]?.trim() || '08:00';
    
    // Get current time
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const lewatBatasAbsen = currentTime > batasAbsen;

    return (
      <View>
        {/* Info Dinas Card */}
        <View style={styles.dinasInfoCard}>
          <Text style={styles.dinasKegiatanName}>{item.namaKegiatan}</Text>
          <Text style={styles.dinasSptNumber}>{item.nomorSpt}</Text>
          
          {item.jenisDinas && (
            <View style={styles.dinasInfoRow}>
              <Ionicons name="business-outline" size={14} color="#666" />
              <Text style={styles.dinasInfoText}>
                {item.jenisDinas === 'lokal' ? 'Dinas Lokal' : 
                 item.jenisDinas === 'luar_kota' ? 'Dinas Luar Kota' : 
                 item.jenisDinas === 'luar_negeri' ? 'Dinas Luar Negeri' : item.jenisDinas}
              </Text>
            </View>
          )}
          
          <View style={styles.dinasInfoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <View style={styles.lokasiTextContainer}>
                {item.lokasi_list && item.lokasi_list.length > 0 ? (
                  item.lokasi_list.map((lokasi: any, idx: number) => (
                    <Text key={lokasi.id || idx} style={styles.dinasInfoText}>
                      • {lokasi.nama_lokasi} <Text style={styles.radiusText}>(Radius: {lokasi.radius}m)</Text>
                    </Text>
                  ))
                ) : (
                  <Text style={[styles.dinasInfoText, styles.warningText]}>
                    ⚠️ Belum ada lokasi terdaftar
                  </Text>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.dinasInfoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.dinasInfoText}>{item.jamKerja}</Text>
            </View>
          </View>
          
          <View style={styles.dinasInfoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={14} color="#666" />
              <Text style={styles.dinasInfoText}>{totalPegawai} orang</Text>
            </View>
          </View>
        </View>

        {/* Section Header: Pilih Tanggal */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pilih Tanggal</Text>
        </View>

        {/* Kalender - Tanpa Card */}
        <View style={styles.calendarContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarScrollContent}
            ref={(ref) => {
              if (ref && selectedDate) {
                const todayString = getTodayDateString();
                const dates = generateDates(item.tanggal_mulai, item.tanggal_selesai);
                const todayIndex = dates.findIndex(d => d.fullDate === todayString);
                if (todayIndex > 0) {
                  setTimeout(() => {
                    ref.scrollTo({ x: todayIndex * 80, animated: true });
                  }, 100);
                }
              }
            }}
          >
            {generateDates(item.tanggal_mulai, item.tanggal_selesai).map((dateItem) => {
              const todayString = getTodayDateString();
              const isToday = dateItem.fullDate === todayString;
              const isSelected = selectedDate === dateItem.fullDate;
              
              return (
                <TouchableOpacity
                  key={dateItem.fullDate}
                  style={[
                    styles.dateBox,
                    isSelected && styles.dateBoxActive,
                    isToday && !isSelected && styles.dateBoxToday
                  ]}
                  onPress={() => handleDateClick(dateItem.fullDate, item)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayName,
                    isSelected && styles.dayNameActive,
                    isToday && !isSelected && styles.dayNameToday
                  ]}>
                    {dateItem.dayName}
                  </Text>
                  <Text style={[
                    styles.dateDay,
                    isSelected && styles.dateDayActive,
                    isToday && !isSelected && styles.dateDayToday
                  ]}>
                    {dateItem.day}
                  </Text>
                  <Text style={[
                    styles.dateMonth,
                    isSelected && styles.dateMonthActive,
                    isToday && !isSelected && styles.dateMonthToday
                  ]}>
                    {dateItem.month}
                  </Text>
                  {isToday && !isSelected && (
                    <View style={styles.todayIndicator} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Section Header: Daftar Pegawai */}
        {selectedDate && (
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={16} color="#004643" />
            <Text style={styles.sectionTitle}>{formatDateLong(selectedDate)}</Text>
          </View>
        )}

        {/* Daftar Pegawai - Multiple Small Cards */}
        {selectedDate && pegawaiData.length > 0 && (
          <View style={styles.pegawaiList}>
            {pegawaiData.map((pegawai, index) => {
              // Cek apakah tanggal yang dipilih sudah tiba
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const selectedDateObj = new Date(selectedDate);
              selectedDateObj.setHours(0, 0, 0, 0);
              const belumWaktuAbsen = selectedDateObj > today;
              
              // Tentukan status berdasarkan kondisi
              const sudahAbsen = pegawai.status === 'hadir';
              const belumAbsen = !sudahAbsen;
              
              // Cek apakah terlambat (absen setelah batas)
              const jamAbsenPegawai = pegawai.jamAbsen || '00:00';
              const terlambat = sudahAbsen && jamAbsenPegawai > batasAbsen;
              
              // Cek apakah tidak hadir (belum absen & sudah lewat batas & bukan tanggal masa depan)
              const tidakHadir = belumAbsen && lewatBatasAbsen && !belumWaktuAbsen;
              
              return (
              <View key={index} style={styles.pegawaiCard}>
                <View style={styles.pegawaiInfo}>
                  <View style={styles.pegawaiNameRow}>
                    <Ionicons name="person-circle" size={20} color="#004643" style={styles.statusIcon} />
                    <Text style={styles.pegawaiName}>{pegawai.nama}</Text>
                  </View>
                  <Text style={styles.pegawaiNip}>NIP: {pegawai.nip || 'Tidak ada NIP'}</Text>
                  
                  {pegawai.lokasiAbsen && (
                    <View style={styles.lokasiRow}>
                      <Ionicons name="location" size={12} color="#666" />
                      <Text style={styles.lokasiText}>
                        Lokasi: {pegawai.lokasiAbsen}
                        <Text style={pegawai.isLokasiSesuai ? styles.lokasiSesuai : styles.lokasiTidakSesuai}>
                          {pegawai.isLokasiSesuai ? ' (Sesuai radius)' : ' (Di luar radius)'}
                        </Text>
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.statusRow}>
                    {sudahAbsen ? (
                      terlambat ? (
                        <Ionicons name="warning" size={14} color="#FF9800" />
                      ) : (
                        <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                      )
                    ) : belumWaktuAbsen ? (
                      <Ionicons name="calendar-outline" size={14} color="#2196F3" />
                    ) : tidakHadir ? (
                      <Ionicons name="close-circle" size={14} color="#F44336" />
                    ) : (
                      <Ionicons name="time-outline" size={14} color="#FF9800" />
                    )}
                    <Text style={[
                      styles.statusText,
                      sudahAbsen ? (terlambat ? styles.statusTerlambat : styles.statusHadir) : belumWaktuAbsen ? styles.statusBelumWaktu : tidakHadir ? styles.statusTidakHadir : styles.statusBelum
                    ]}>
                      {sudahAbsen 
                        ? (terlambat ? `Terlambat - ${pegawai.jamAbsen}` : `Sudah Absen - ${pegawai.jamAbsen}`) 
                        : belumWaktuAbsen ? 'Belum Waktunya Absen' : tidakHadir ? 'Tidak Hadir' : 'Belum Absen'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.actionButtons}>
                  {pegawai.status === 'hadir' && pegawai.fotoAbsen ? (
                    <TouchableOpacity 
                      style={styles.actionIconBtn}
                      onPress={() => {
                        console.log('Opening photo:', pegawai.fotoAbsen);
                        setSelectedPhoto(pegawai.fotoAbsen);
                        setShowPhotoModal(true);
                      }}
                    >
                      <Ionicons name="camera" size={18} color="#004643" />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.actionIconBtn, styles.actionIconBtnDisabled]}>
                      <Ionicons name="camera-outline" size={18} color="#ccc" />
                    </View>
                  )}
                  
                  {pegawai.status === 'hadir' && pegawai.statusValidasi === 'menunggu' ? (
                    <TouchableOpacity 
                      style={styles.actionIconBtn}
                      onPress={async () => {
                        Alert.alert(
                          'Terima Validasi',
                          `Terima validasi absen ${pegawai.nama}?`,
                          [
                            { text: 'Batal', style: 'cancel' },
                            { 
                              text: 'Terima', 
                              onPress: async () => {
                                try {
                                  const result = await KelolaDinasAPI.validateAbsen(pegawai.absenId, 'approve');
                                  if (result.success) {
                                    Alert.alert('Berhasil', `Absen ${pegawai.nama} berhasil divalidasi`);
                                    await fetchDinasData(selectedDate || undefined);
                                  } else {
                                    Alert.alert('Error', result.message || 'Gagal memvalidasi absen');
                                  }
                                } catch (error) {
                                  Alert.alert('Error', 'Gagal memvalidasi absen');
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
                    </TouchableOpacity>
                  ) : pegawai.statusValidasi === 'disetujui' ? (
                    <View style={styles.actionIconBtn}>
                      <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                    </View>
                  ) : (
                    <View style={[styles.actionIconBtn, styles.actionIconBtnDisabled]}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ccc" />
                    </View>
                  )}
                  
                  {pegawai.status === 'hadir' && pegawai.statusValidasi === 'menunggu' ? (
                    <TouchableOpacity 
                      style={[styles.actionIconBtn, styles.actionIconBtnReject]}
                      onPress={async () => {
                        Alert.alert(
                          'Tolak Validasi',
                          `Tolak validasi absen ${pegawai.nama}?`,
                          [
                            { text: 'Batal', style: 'cancel' },
                            { 
                              text: 'Tolak',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  const result = await KelolaDinasAPI.validateAbsen(pegawai.absenId, 'reject');
                                  if (result.success) {
                                    Alert.alert('Berhasil', `Validasi absen ${pegawai.nama} ditolak`);
                                    await fetchDinasData(selectedDate || undefined);
                                  } else {
                                    Alert.alert('Error', result.message || 'Gagal menolak validasi');
                                  }
                                } catch (error) {
                                  Alert.alert('Error', 'Gagal menolak validasi absen');
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#F44336" />
                    </TouchableOpacity>
                  ) : pegawai.statusValidasi === 'ditolak' ? (
                    <View style={[styles.actionIconBtn, styles.actionIconBtnReject]}>
                      <Ionicons name="close-circle" size={18} color="#F44336" />
                    </View>
                  ) : (
                    <View style={[styles.actionIconBtn, styles.actionIconBtnDisabled]}>
                      <Ionicons name="close-circle-outline" size={18} color="#ccc" />
                    </View>
                  )}
                </View>
              </View>
            )})}
          </View>
        )}

        {selectedDate && pegawaiData.length === 0 && (
          <View style={styles.emptyPegawai}>
            <Ionicons name="people-outline" size={40} color="#ccc" />
            <Text style={styles.emptyPegawaiText}>Tidak ada data pegawai</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" translucent={true} backgroundColor="transparent" />
        <AppHeader 
          title="Validasi Absen Dinas"
          showBack={true}
          onBackPress={() => router.push('/admin/pusat-validasi' as any)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent={true} backgroundColor="transparent" />
      
      <AppHeader 
        title="Validasi Absen Dinas"
        showBack={true}
        onBackPress={() => router.push('/admin/pusat-validasi' as any)}
      />

      <FlatList
        data={dinasData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderDinasCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>Tidak ada dinas yang sedang berlangsung</Text>
          </View>
        )}
      />

      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Foto Absen Masuk</Text>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {selectedPhoto ? (
              <Image 
                source={{ uri: selectedPhoto }} 
                style={styles.photoImage}
                resizeMode="contain"
                onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                onLoad={() => console.log('Image loaded successfully')}
              />
            ) : (
              <View style={styles.photoImage}>
                <Text>Tidak ada foto</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFB',
  },
  listContent: { 
    padding: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },

  // Info Dinas Card
  dinasInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dinasKegiatanName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dinasSptNumber: {
    fontSize: 12,
    color: '#666',
  },
  eyeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 70, 67, 0.2)',
  },
  dinasInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  radiusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 70, 67, 0.2)',
  },
  radiusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  dinasInfoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  lokasiTextContainer: {
    flex: 1,
  },
  warningText: {
    color: '#FF9800',
    fontStyle: 'italic',
  },

  // Section Header (Tanpa Card)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  // Kalender Container (Tanpa Card)
  calendarContainer: {
    marginBottom: 20,
  },
  calendarScrollContent: {
    paddingRight: 20,
    paddingVertical: 8,
  },
  dateBox: {
    width: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateBoxActive: {
    backgroundColor: '#004643',
    borderColor: '#004643',
  },
  dateBoxToday: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  dayName: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  dayNameActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dayNameToday: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  dateDayActive: {
    color: '#fff',
  },
  dateDayToday: {
    color: '#2E7D32',
  },
  dateMonth: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  dateMonthActive: {
    color: '#fff',
  },
  dateMonthToday: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },

  // Pegawai List
  pegawaiList: {
    gap: 10,
  },
  pegawaiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pegawaiInfo: {
    flex: 1,
    marginRight: 12,
  },
  pegawaiNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIcon: {
    marginRight: 6,
  },
  pegawaiName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pegawaiNip: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  lokasiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 6,
  },
  lokasiText: {
    fontSize: 11,
    color: '#666',
    flex: 1,
    lineHeight: 16,
  },
  lokasiSesuai: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  lokasiTidakSesuai: {
    color: '#F44336',
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusHadir: {
    color: '#4CAF50',
  },
  statusBelum: {
    color: '#FF9800',
  },
  statusBelumWaktu: {
    color: '#2196F3',
  },
  statusTerlambat: {
    color: '#FF9800',
  },
  statusTidakHadir: {
    color: '#F44336',
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionIconBtnReject: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E0E0E0',
  },
  actionIconBtnDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyPegawai: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginTop: 10,
  },
  emptyPegawaiText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: RNStatusBar.currentHeight || 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  photoImage: {
    width: '100%',
    height: 400,
  },
});
