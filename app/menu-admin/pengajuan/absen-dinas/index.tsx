import React, { useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  ActivityIndicator, ScrollView, Platform, RefreshControl, Modal, Image, Dimensions, Animated, PanResponder
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { AppHeader } from '../../../../components';
import { KelolaDinasAPI } from '../../../../constants/config';
import { CustomAlert } from '../../../../components/CustomAlert';
import { useCustomAlert } from '../../../../hooks/useCustomAlert';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    absenMasukId?: number;
    absenPulangId?: number;
    nama: string;
    nip: string;
    status: string;
    jamAbsen: string | null;
    jamMasuk: string | null;
    jamPulang: string | null;
    lokasiAbsen?: string;
    lokasiAbsenMasuk?: string;
    lokasiAbsenPulang?: string;
    isLokasiSesuai?: boolean;
    isLokasiSesuaiMasuk?: boolean;
    isLokasiSesuaiPulang?: boolean;
    fotoAbsen?: string;
    fotoAbsenMasuk?: string;
    fotoAbsenPulang?: string;
    statusValidasi?: string;
    statusValidasiMasuk?: string;
    statusValidasiPulang?: string;
    // Tambahan field dari database presensi
    jam_masuk?: string;
    jam_pulang?: string;
    foto_masuk?: string;
    foto_pulang?: string;
    lintang_masuk?: number;
    bujur_masuk?: number;
    lintang_pulang?: number;
    bujur_pulang?: number;
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
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [validationData, setValidationData] = useState<{
    absenId: number;
    type: 'approve' | 'reject';
    nama: string;
    absenType: 'masuk' | 'pulang';
  } | null>(null);
  const { visible, config, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  
  const calendarRef = useRef<ScrollView>(null);
  const photoTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useFocusEffect(
    useCallback(() => {
      fetchDinasData();
      if (Platform.OS === 'android') {
        NavigationBar.setBackgroundColorAsync('#FFFFFF');
        NavigationBar.setButtonStyleAsync('dark');
      }
    }, [])
  );

  const getTodayDateString = () => {
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("sv-SE", {timeZone: "Asia/Jakarta"}));
    return jakartaTime.toISOString().split('T')[0];
  };

  const fetchDinasData = async (tanggal?: string) => {
    try {
      setLoading(true);
      const todayString = tanggal || getTodayDateString();
      const result = await KelolaDinasAPI.getDinasAktif(undefined, todayString);
      
      if (result.success) {
        let finalData = result.data;
        if (dinasId) {
          finalData = result.data.filter((d: DinasItem) => d.id === Number(dinasId));
        }

        setDinasData(finalData);
        setSelectedDate(todayString);
        if (finalData.length > 0) {
          setPegawaiData(finalData[0].pegawai || []);
        }
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: 'Gagal memuat data dinas' });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDinasData(selectedDate);
    setRefreshing(false);
  };

  const generateDates = (startDate: string, endDate: string): DateItem[] => {
    const dates: DateItem[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    while (start <= end) {
      dates.push({
        date: new Date(start),
        day: start.getDate(),
        month: start.toLocaleDateString('id-ID', { month: 'short' }),
        fullDate: start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0'),
        dayName: start.toLocaleDateString('id-ID', { weekday: 'short' })
      });
      start.setDate(start.getDate() + 1);
    }
    return dates;
  };

  const getAttendanceStatus = (jamMasuk: string | null, jamPulang: string | null, jamKerja: string, selectedDate: string, type: 'masuk' | 'pulang') => {
    const [jamMasukStandar, jamPulangStandar] = jamKerja.split(' - ');
    const [jamMasukHour, jamMasukMinute] = jamMasukStandar.split(':').map(Number);
    const [jamPulangHour, jamPulangMinute] = jamPulangStandar.split(':').map(Number);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (selectedDate > today) {
      return { status: 'belum_waktunya', text: 'Belum Waktunya', color: '#94A3B8' };
    }
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMenit = currentHour * 60 + currentMinute;
    
    if (type === 'masuk') {
      const jamMasukMenit = jamMasukHour * 60 + jamMasukMinute;
      
      if (!jamMasuk) {
        if (selectedDate === today) {
          if (currentMenit < jamMasukMenit) {
            return { status: 'belum_absen', text: 'Belum Absen', color: '#F59E0B' };
          } else {
            return { status: 'tidak_hadir', text: 'Tidak Hadir', color: '#EF4444' };
          }
        } else {
          return { status: 'tidak_hadir', text: 'Tidak Hadir', color: '#EF4444' };
        }
      }
      
      const [jamAbsenHour, jamAbsenMinute] = jamMasuk.split(':').map(Number);
      const jamAbsenMenit = jamAbsenHour * 60 + jamAbsenMinute;
      
      if (jamAbsenMenit <= jamMasukMenit + 15) {
        return { status: 'hadir', text: jamMasuk, color: '#10B981' };
      } else {
        return { status: 'terlambat', text: jamMasuk, color: '#F59E0B' };
      }
    } else {
      const jamPulangMenit = jamPulangHour * 60 + jamPulangMinute;
      
      if (!jamPulang) {
        if (selectedDate === today) {
          if (currentMenit < jamPulangMenit) {
            return { status: 'belum_absen', text: 'Belum Pulang', color: '#F59E0B' };
          } else {
            return { status: 'tidak_hadir', text: 'Tidak Pulang', color: '#EF4444' };
          }
        } else {
          return { status: 'tidak_hadir', text: 'Tidak Pulang', color: '#EF4444' };
        }
      }
      
      const [jamAbsenHour, jamAbsenMinute] = jamPulang.split(':').map(Number);
      const jamAbsenMenit = jamAbsenHour * 60 + jamAbsenMinute;
      
      if (jamAbsenMenit >= jamPulangMenit - 30) {
        return { status: 'hadir', text: jamPulang, color: '#10B981' };
      } else {
        return { status: 'pulang_cepat', text: jamPulang, color: '#F59E0B' };
      }
    }
  };

  const handleDateClick = async (date: string, dinasId: number) => {
    setSelectedDate(date);
    try {
      const result = await KelolaDinasAPI.getDinasAktif(undefined, date);
      if (result.success) {
        const selectedDinas = result.data.find((d: DinasItem) => d.id === dinasId);
        setPegawaiData(selectedDinas ? selectedDinas.pegawai : []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openPhotoModal = (photoUrl: string) => {
    if (!photoUrl) return;
    
    console.log('Opening photo modal with URL:', photoUrl);
    
    setSelectedPhoto(photoUrl);
    setPhotoLoading(true);
    setPhotoError(false);
    setShowPhotoModal(true);
    
    // Timeout untuk loading jika terlalu lama
    setTimeout(() => {
      if (photoLoading) {
        setPhotoLoading(false);
        setPhotoError(true);
      }
    }, 10000); // 10 detik timeout
    
    Animated.spring(photoTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const closePhotoModal = () => {
    Animated.timing(photoTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setShowPhotoModal(false);
      setSelectedPhoto('');
      setPhotoLoading(false);
      setPhotoError(false);
    });
  };

  const photoPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        photoTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closePhotoModal();
      } else {
        Animated.spring(photoTranslateY, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    }
  });

  const handleValidation = (absenId: number, type: 'approve' | 'reject', nama: string, absenType: 'masuk' | 'pulang') => {
    setValidationData({ absenId, type, nama, absenType });
    setShowValidationAlert(true);
  };

  const confirmValidation = async () => {
    if (!validationData) return;
    
    try {
      const result = await KelolaDinasAPI.validateAbsen(
        validationData.absenId, 
        validationData.type, 
        validationData.absenType
      );
      if (result.success) {
        showAlert({ type: 'success', title: 'Sukses', message: 'Status berhasil diperbarui' });
        // Refresh data setelah validasi berhasil
        await fetchDinasData(selectedDate);
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Gagal memproses validasi' });
      }
    } catch (error) {
      console.error('Validation error:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Gagal memproses data' });
    } finally {
      setShowValidationAlert(false);
      setValidationData(null);
    }
  };

  const renderDinasCard = ({ item }: { item: DinasItem }) => {
    const dates = generateDates(item.tanggal_mulai, item.tanggal_selesai);
    
    return (
      <View style={styles.mainWrapper}>
        <View style={styles.premiumCard}>
          <View style={styles.cardTagRow}>
            <View style={[styles.tagBadge, { backgroundColor: '#E0F2F1' }]}>
              <Text style={styles.tagText}>{item.jenisDinas?.replace('_', ' ').toUpperCase() || 'DINAS'}</Text>
            </View>
            <Text style={styles.sptText}>{item.nomorSpt}</Text>
          </View>

          <Text style={styles.titleText}>{item.namaKegiatan}</Text>
          
          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Ionicons name="time-outline" size={18} color="#004643" />
              <View>
                <Text style={styles.infoLabel}>Jam Kerja</Text>
                <Text style={styles.infoValue}>{item.jamKerja}</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <Ionicons name="people-outline" size={18} color="#004643" />
              <View>
                <Text style={styles.infoLabel}>Personel</Text>
                <Text style={styles.infoValue}>{item.pegawai?.length || 0} Pegawai</Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoBox, { marginTop: 12, alignItems: 'flex-start' }]}>
            <Ionicons name="location-outline" size={18} color="#004643" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Lokasi Terdaftar</Text>
              {item.lokasi_list?.map((loc, i) => (
                <Text key={i} style={styles.infoValue}>• {loc.nama_lokasi} ({loc.radius}m)</Text>
              )) || <Text style={styles.infoValue}>Lokasi tidak ditemukan</Text>}
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pilih Tanggal Tugas</Text>
          <View style={styles.activeIndicator} />
        </View>

        <ScrollView 
          horizontal 
          ref={calendarRef}
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.calendarContainer}
        >
          {dates.map((d) => {
            const isSelected = selectedDate === d.fullDate;
            const isToday = d.fullDate === getTodayDateString();
            return (
              <TouchableOpacity 
                key={d.fullDate} 
                onPress={() => handleDateClick(d.fullDate, item.id)}
                style={[
                  styles.dateCard, 
                  isSelected && styles.dateCardSelected,
                  isToday && !isSelected && styles.dateCardToday
                ]}
              >
                <Text style={[styles.dateDay, isSelected && styles.textWhite]}>{d.dayName}</Text>
                <Text style={[styles.dateNum, isSelected && styles.textWhite]}>{d.day}</Text>
                <Text style={[styles.dateMonth, isSelected && styles.textWhite]}>{d.month}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Status Kehadiran</Text>
          <Text style={styles.dateLabel}>{selectedDate}</Text>
        </View>

        {pegawaiData.length > 0 ? (
          pegawaiData.map((p, idx) => {
            // Enhanced fallback mapping untuk backward compatibility
            const jamMasukFinal = p.jamMasuk || p.jamAbsen || p.jam_masuk;
            const jamPulangFinal = p.jamPulang || p.jam_pulang;
            const fotoMasukFinal = p.fotoAbsenMasuk || p.fotoAbsen || p.foto_masuk;
            const fotoPulangFinal = p.fotoAbsenPulang || p.foto_pulang;
            const lokasiMasukFinal = p.lokasiAbsenMasuk || p.lokasiAbsen;
            const lokasiPulangFinal = p.lokasiAbsenPulang || p.lokasiAbsen; // Fallback ke lokasi yang sama
            const isLokasiSesuaiMasukFinal = p.isLokasiSesuaiMasuk ?? p.isLokasiSesuai ?? true; // Default true untuk yang sudah absen
            const isLokasiSesuaiPulangFinal = p.isLokasiSesuaiPulang ?? p.isLokasiSesuai ?? (jamPulangFinal ? true : false);
            const statusValidasiMasukFinal = p.status_validasi_masuk || p.statusValidasiMasuk || p.statusValidasi || 'menunggu';
            const statusValidasiPulangFinal = p.status_validasi_pulang || p.statusValidasiPulang || (jamPulangFinal ? 'menunggu' : null);
            const absenMasukIdFinal = p.absenMasukId || p.absenId || p.absen_id;
            const absenPulangIdFinal = p.absenPulangId || p.absenId || p.absen_id;
            
            const attendanceStatusMasuk = getAttendanceStatus(jamMasukFinal, jamPulangFinal, item.jamKerja, selectedDate, 'masuk');
            const attendanceStatusPulang = getAttendanceStatus(jamMasukFinal, jamPulangFinal, item.jamKerja, selectedDate, 'pulang');
            
            // Kondisi validasi yang benar - hanya bisa validasi jika belum disetujui/ditolak
            const canValidateMasuk = jamMasukFinal && 
              attendanceStatusMasuk.status !== 'belum_absen' && 
              attendanceStatusMasuk.status !== 'belum_waktunya' &&
              statusValidasiMasukFinal === 'menunggu';
              
            const canValidatePulang = jamPulangFinal && 
              attendanceStatusPulang.status !== 'belum_absen' && 
              attendanceStatusPulang.status !== 'belum_waktunya' &&
              statusValidasiPulangFinal === 'menunggu';
            
            return (
            <View key={idx} style={styles.employeeCard}>
              <View style={styles.empRow}>
                <View style={styles.empAvatar}>
                  <Text style={styles.avatarTxt}>{p.nama.charAt(0)}</Text>
                </View>
                <View style={styles.empMainInfo}>
                  <Text style={styles.empName} numberOfLines={1}>{p.nama}</Text>
                  <Text style={styles.empNip}>NIP. {p.nip || '-'}</Text>
                </View>
              </View>

              {/* Absen Masuk Section */}
              <View style={styles.absenSection}>
                <Text style={styles.absenSectionTitle}>Absen Masuk</Text>
                <View style={styles.absenRow}>
                  <View style={styles.statusContainer}>
                    <View style={[styles.dot, { backgroundColor: attendanceStatusMasuk.color }]} />
                    <Text style={[styles.statusTxt, { color: attendanceStatusMasuk.status === 'hadir' ? '#065F46' : attendanceStatusMasuk.status === 'terlambat' ? '#92400E' : '#991B1B' }]}>
                      {attendanceStatusMasuk.text}
                    </Text>
                  </View>
                  <View style={styles.validGroup}>
                    <TouchableOpacity 
                      onPress={() => openPhotoModal(fotoMasukFinal!)}
                      disabled={!fotoMasukFinal}
                      style={[styles.btnCircle, !fotoMasukFinal && styles.btnDisabled]}
                    >
                      <Ionicons name="image" size={16} color={fotoMasukFinal ? '#004643' : '#CBD5E1'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleValidation(absenMasukIdFinal, 'approve', p.nama, 'masuk')}
                      disabled={!canValidateMasuk}
                      style={[styles.btnValid, styles.btnCheck, statusValidasiMasukFinal === 'disetujui' && styles.activeApprove, !canValidateMasuk && styles.btnDisabled]}
                    >
                      <Ionicons name="checkmark-done" size={16} color={statusValidasiMasukFinal === 'disetujui' ? '#FFF' : !canValidateMasuk ? '#CBD5E1' : '#10B981'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleValidation(absenMasukIdFinal, 'reject', p.nama, 'masuk')}
                      disabled={!canValidateMasuk}
                      style={[styles.btnValid, styles.btnCross, statusValidasiMasukFinal === 'ditolak' && styles.activeReject, !canValidateMasuk && styles.btnDisabled]}
                    >
                      <Ionicons name="close" size={16} color={statusValidasiMasukFinal === 'ditolak' ? '#FFF' : !canValidateMasuk ? '#CBD5E1' : '#EF4444'} />
                    </TouchableOpacity>
                  </View>
                </View>
                {!jamMasukFinal ? (
                  <View style={styles.empLocationBox}>
                    <Ionicons name="map-outline" size={12} color="#64748B" />
                    <Text style={styles.locationTxt} numberOfLines={1}>
                      Belum melakukan absen masuk
                    </Text>
                  </View>
                ) : lokasiMasukFinal ? (
                  <View style={styles.empLocationBox}>
                    <Ionicons name="map-outline" size={12} color="#64748B" />
                    <Text style={styles.locationTxt} numberOfLines={1}>
                      {lokasiMasukFinal} 
                      <Text style={{ color: isLokasiSesuaiMasukFinal ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                        {isLokasiSesuaiMasukFinal ? ' (Sesuai)' : ' (Luar Radius)'}
                      </Text>
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Absen Pulang Section - Selalu tampil */}
              <View style={styles.absenSection}>
                <Text style={styles.absenSectionTitle}>Absen Pulang</Text>
                <View style={styles.absenRow}>
                  <View style={styles.statusContainer}>
                    <View style={[styles.dot, { backgroundColor: attendanceStatusPulang.color }]} />
                    <Text style={[styles.statusTxt, { color: attendanceStatusPulang.status === 'hadir' ? '#065F46' : attendanceStatusPulang.status === 'pulang_cepat' ? '#92400E' : '#991B1B' }]}>
                      {attendanceStatusPulang.text}
                    </Text>
                  </View>
                  <View style={styles.validGroup}>
                    <TouchableOpacity 
                      onPress={() => openPhotoModal(fotoPulangFinal!)}
                      disabled={!fotoPulangFinal}
                      style={[styles.btnCircle, !fotoPulangFinal && styles.btnDisabled]}
                    >
                      <Ionicons name="image" size={16} color={fotoPulangFinal ? '#004643' : '#CBD5E1'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleValidation(absenPulangIdFinal, 'approve', p.nama, 'pulang')}
                      disabled={!canValidatePulang}
                      style={[styles.btnValid, styles.btnCheck, statusValidasiPulangFinal === 'disetujui' && styles.activeApprove, !canValidatePulang && styles.btnDisabled]}
                    >
                      <Ionicons name="checkmark-done" size={16} color={statusValidasiPulangFinal === 'disetujui' ? '#FFF' : !canValidatePulang ? '#CBD5E1' : '#10B981'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleValidation(absenPulangIdFinal, 'reject', p.nama, 'pulang')}
                      disabled={!canValidatePulang}
                      style={[styles.btnValid, styles.btnCross, statusValidasiPulangFinal === 'ditolak' && styles.activeReject, !canValidatePulang && styles.btnDisabled]}
                    >
                      <Ionicons name="close" size={16} color={statusValidasiPulangFinal === 'ditolak' ? '#FFF' : !canValidatePulang ? '#CBD5E1' : '#EF4444'} />
                    </TouchableOpacity>
                  </View>
                </View>
                {!jamPulangFinal ? (
                  <View style={styles.empLocationBox}>
                    <Ionicons name="map-outline" size={12} color="#64748B" />
                    <Text style={styles.locationTxt} numberOfLines={1}>
                      Belum melakukan absen pulang
                    </Text>
                  </View>
                ) : (lokasiPulangFinal || jamPulangFinal) ? (
                  <View style={styles.empLocationBox}>
                    <Ionicons name="map-outline" size={12} color="#64748B" />
                    <Text style={styles.locationTxt} numberOfLines={1}>
                      {lokasiPulangFinal || 'Lokasi sama dengan masuk'} 
                      <Text style={{ color: isLokasiSesuaiPulangFinal ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                        {isLokasiSesuaiPulangFinal ? ' (Sesuai)' : ' (Luar Radius)'}
                      </Text>
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )})
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyStateTxt}>Belum ada data di tanggal ini</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      
      <AppHeader 
        title="Validasi Kehadiran" 
        showBack={true}
        fallbackRoute="/menu-admin/pengajuan"
      />
      
      {loading ? (
        <View style={styles.scrollContent}>
          <View style={styles.mainWrapper}>
            {/* Skeleton Premium Card */}
            <View style={styles.premiumCard}>
              <View style={styles.cardTagRow}>
                <View style={styles.skeletonTagBadge} />
                <View style={styles.skeletonSptText} />
              </View>
              <View style={styles.skeletonTitle} />
              <View style={styles.divider} />
              <View style={styles.infoGrid}>
                <View style={styles.infoBox}>
                  <View style={styles.skeletonIcon} />
                  <View>
                    <View style={styles.skeletonInfoLabel} />
                    <View style={styles.skeletonInfoValue} />
                  </View>
                </View>
                <View style={styles.infoBox}>
                  <View style={styles.skeletonIcon} />
                  <View>
                    <View style={styles.skeletonInfoLabel} />
                    <View style={styles.skeletonInfoValue} />
                  </View>
                </View>
              </View>
              <View style={[styles.infoBox, { marginTop: 12, alignItems: 'flex-start' }]}>
                <View style={[styles.skeletonIcon, { marginTop: 2 }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.skeletonInfoLabel} />
                  <View style={[styles.skeletonInfoValue, { width: '85%', marginTop: 2 }]} />
                  <View style={[styles.skeletonInfoValue, { width: '70%', marginTop: 2 }]} />
                </View>
              </View>
            </View>

            {/* Skeleton Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.skeletonSectionTitle} />
              <View style={styles.activeIndicator} />
            </View>

            {/* Skeleton Calendar */}
            <View style={[styles.calendarContainer, { flexDirection: 'row' }]}>
              {[1, 2, 3, 4, 5].map((item) => (
                <View key={item} style={styles.skeletonDateCard}>
                  <View style={styles.skeletonDateDay} />
                  <View style={styles.skeletonDateNum} />
                  <View style={styles.skeletonDateMonth} />
                </View>
              ))}
            </View>

            {/* Skeleton Section Header 2 */}
            <View style={styles.sectionHeader}>
              <View style={styles.skeletonSectionTitle} />
              <View style={styles.skeletonDateLabel} />
            </View>

            {/* Skeleton Employee Cards */}
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.employeeCard}>
                <View style={styles.empRow}>
                  <View style={styles.skeletonAvatar} />
                  <View style={styles.empMainInfo}>
                    <View style={styles.skeletonEmpName} />
                    <View style={styles.skeletonEmpNip} />
                  </View>
                </View>

                {/* Skeleton Absen Masuk Section */}
                <View style={styles.absenSection}>
                  <View style={styles.skeletonAbsenSectionTitle} />
                  <View style={styles.absenRow}>
                    <View style={styles.statusContainer}>
                      <View style={styles.skeletonDot} />
                      <View style={styles.skeletonStatusText} />
                    </View>
                    <View style={styles.validGroup}>
                      <View style={styles.skeletonBtnCircle} />
                      <View style={styles.skeletonBtnValid} />
                      <View style={styles.skeletonBtnValid} />
                    </View>
                  </View>
                  <View style={styles.empLocationBox}>
                    <View style={styles.skeletonLocationIcon} />
                    <View style={styles.skeletonLocationText} />
                  </View>
                </View>

                {/* Skeleton Absen Pulang Section */}
                <View style={styles.absenSection}>
                  <View style={styles.skeletonAbsenSectionTitle} />
                  <View style={styles.absenRow}>
                    <View style={styles.statusContainer}>
                      <View style={styles.skeletonDot} />
                      <View style={styles.skeletonStatusText} />
                    </View>
                    <View style={styles.validGroup}>
                      <View style={styles.skeletonBtnCircle} />
                      <View style={styles.skeletonBtnValid} />
                      <View style={styles.skeletonBtnValid} />
                    </View>
                  </View>
                  <View style={styles.empLocationBox}>
                    <View style={styles.skeletonLocationIcon} />
                    <View style={styles.skeletonLocationText} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={dinasData}
          renderItem={renderDinasCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Photo Modal - Bottom Sheet */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent
        onRequestClose={closePhotoModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closePhotoModal} />
          <Animated.View style={[styles.photoBottomSheet, { transform: [{ translateY: photoTranslateY }] }]}>
            <View {...photoPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.photoSheetContent}>
              <Text style={styles.photoSheetTitle}>Bukti Kehadiran</Text>
              
              <ScrollView style={styles.photoScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.photoImageContainer}>
                  {photoLoading && (
                    <View style={styles.photoLoadingContainer}>
                      <ActivityIndicator size="large" color="#004643" />
                      <Text style={styles.photoLoadingText}>Memuat foto...</Text>
                    </View>
                  )}
                  
                  {photoError && (
                    <View style={styles.photoErrorContainer}>
                      <Ionicons name="image-outline" size={48} color="#CBD5E1" />
                      <Text style={styles.photoErrorText}>Gagal memuat foto</Text>
                      <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={() => {
                          console.log('Retrying photo load for:', selectedPhoto);
                          setPhotoError(false);
                          setPhotoLoading(true);
                          // Force re-render dengan timestamp
                          const urlWithTimestamp = selectedPhoto.includes('?') 
                            ? `${selectedPhoto}&t=${Date.now()}`
                            : `${selectedPhoto}?t=${Date.now()}`;
                          setSelectedPhoto(urlWithTimestamp);
                        }}
                      >
                        <Text style={styles.retryButtonText}>Coba Lagi</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {selectedPhoto && !photoError && (
                    <Image 
                      source={{ uri: selectedPhoto }} 
                      style={[styles.photoImage, photoLoading && { opacity: 0 }]} 
                      resizeMode="cover"
                      onLoadStart={() => {
                        console.log('Image load start');
                        setPhotoLoading(true);
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully');
                        setPhotoLoading(false);
                      }}
                      onError={(error) => {
                        console.log('Image load error:', error.nativeEvent.error);
                        setPhotoLoading(false);
                        setPhotoError(true);
                      }}
                    />
                  )}
                  
                  {!selectedPhoto && (
                    <View style={styles.photoErrorContainer}>
                      <Ionicons name="image-outline" size={48} color="#CBD5E1" />
                      <Text style={styles.photoErrorText}>Tidak ada foto</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <CustomAlert
        visible={showValidationAlert}
        type="confirm"
        title={validationData?.type === 'approve' ? 'Setujui Absensi' : 'Tolak Absensi'}
        message={`Konfirmasi ${validationData?.type === 'approve' ? 'setujui' : 'tolak'} absen ${validationData?.absenType} untuk ${validationData?.nama}?`}
        confirmText="Konfirmasi"
        cancelText="Batal"
        onConfirm={confirmValidation}
        onClose={() => {
          setShowValidationAlert(false);
          setValidationData(null);
        }}
      />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 30 },
  mainWrapper: { padding: 16 },
  
  premiumCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E0E0E0' },
  cardTagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 10, fontWeight: '800', color: '#004643' },
  sptText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  titleText: { fontSize: 20, fontWeight: '800', color: '#0F172A', lineHeight: 28 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  infoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 13, color: '#334155', fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  activeIndicator: { width: 40, height: 4, backgroundColor: '#004643', borderRadius: 2, position: 'absolute', bottom: -6 },
  dateLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },

  calendarContainer: { paddingBottom: 10 },
  dateCard: { width: 68, height: 95, backgroundColor: '#FFF', borderRadius: 12, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  dateCardSelected: { backgroundColor: '#004643', borderColor: '#004643' },
  dateCardToday: { borderStyle: 'dashed', borderColor: '#004643', borderWidth: 1.5 },
  dateDay: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  dateNum: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  dateMonth: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  textWhite: { color: '#FFF' },

  employeeCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  empRow: { flexDirection: 'row', alignItems: 'center' },
  empAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 20, fontWeight: '800', color: '#004643' },
  empMainInfo: { flex: 1, marginLeft: 12 },
  empName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  empNip: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 11, fontWeight: '800' },
  empLocationBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 12, marginTop: 12 },
  locationTxt: { fontSize: 11, color: '#64748B', flex: 1, fontWeight: '500' },
  empActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  btnCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 1 },
  validGroup: { flexDirection: 'row', gap: 8 },
  btnValid: { width: 36, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  btnCheck: { borderColor: '#D1FAE5', backgroundColor: '#ECFDF5' },
  btnCross: { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
  activeApprove: { backgroundColor: '#10B981', borderColor: '#10B981' },
  activeReject: { backgroundColor: '#EF4444', borderColor: '#EF4444' },

  absenSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  absenSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  absenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  emptyState: { padding: 40, alignItems: 'center', gap: 12 },
  emptyStateTxt: { color: '#94A3B8', fontWeight: '600', fontSize: 14 },

  // Modal Overlay Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  
  // Photo Bottom Sheet Styles
  photoBottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
  },
  photoSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  photoSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  photoScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  photoImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    borderRadius: 16,
    padding: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
  },
  photoLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
    gap: 12,
  },
  photoLoadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  photoErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
    gap: 12,
  },
  photoErrorText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#004643',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },


  /* ========================================
     SKELETON STYLES
  ======================================== */
  // Premium Card Skeleton
  skeletonTagBadge: {
    width: 80,
    height: 20,
    backgroundColor: '#E0F2F1',
    borderRadius: 8,
  },
  skeletonSptText: {
    width: 100,
    height: 14,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonTitle: {
    width: '85%',
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonIcon: {
    width: 18,
    height: 18,
    backgroundColor: '#F0F0F0',
    borderRadius: 9,
  },
  skeletonInfoLabel: {
    width: 80,
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonInfoValue: {
    width: 100,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  
  // Section Header Skeleton
  skeletonSectionTitle: {
    width: 140,
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonDateLabel: {
    width: 70,
    height: 18,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  
  // Calendar Skeleton
  skeletonDateCard: {
    width: 68,
    height: 95,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  skeletonDateDay: {
    width: 25,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonDateNum: {
    width: 18,
    height: 18,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonDateMonth: {
    width: 20,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  
  // Employee Card Skeleton
  skeletonAvatar: {
    width: 48,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
  },
  skeletonEmpName: {
    width: '75%',
    height: 13,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonEmpNip: {
    width: '55%',
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonAbsenSectionTitle: {
    width: '35%',
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonDot: {
    width: 8,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonStatusText: {
    width: 60,
    height: 11,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonLocationIcon: {
    width: 14,
    height: 14,
    backgroundColor: '#F0F0F0',
    borderRadius: 7,
  },
  skeletonLocationText: {
    flex: 1,
    height: 11,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonBtnCircle: {
    width: 32,
    height: 32,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
  },
  skeletonBtnValid: {
    width: 36,
    height: 32,
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
  },
});