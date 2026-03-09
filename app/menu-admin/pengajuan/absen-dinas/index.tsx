import React, { useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  ActivityIndicator, ScrollView, Platform, RefreshControl, Modal, Image, Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { AppHeader } from '../../../../components';
import { KelolaDinasAPI } from '../../../../constants/config';
import { CustomAlert } from '../../../../components/CustomAlert';
import { useCustomAlert } from '../../../../hooks/useCustomAlert';

const { width } = Dimensions.get('window');

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
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [validationData, setValidationData] = useState<{
    absenId: number;
    type: 'approve' | 'reject';
    nama: string;
  } | null>(null);
  const { visible, config, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  
  const calendarRef = useRef<ScrollView>(null);

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

  const getAttendanceStatus = (jamAbsen: string | null, jamKerja: string, selectedDate: string) => {
    const [jamMasuk] = jamKerja.split(' - ');
    const [jamMasukHour, jamMasukMinute] = jamMasuk.split(':').map(Number);
    
    // Waktu sekarang
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Jika tanggal yang dipilih adalah hari besok atau masa depan
    if (selectedDate > today) {
      return { status: 'belum_waktunya', text: 'Belum Waktunya Absen', color: '#94A3B8' };
    }
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMenit = currentHour * 60 + currentMinute;
    
    const jamMasukMenit = jamMasukHour * 60 + jamMasukMinute;
    
    if (!jamAbsen) {
      // Jika tanggal yang dipilih adalah hari ini
      if (selectedDate === today) {
        if (currentMenit < jamMasukMenit) {
          return { status: 'belum_absen', text: 'Belum Absen', color: '#F59E0B' };
        } else {
          return { status: 'tidak_hadir', text: 'Tidak Hadir', color: '#EF4444' };
        }
      } else {
        // Jika tanggal yang dipilih adalah hari kemarin atau masa lalu
        return { status: 'tidak_hadir', text: 'Tidak Hadir', color: '#EF4444' };
      }
    }
    
    const [jamAbsenHour, jamAbsenMinute] = jamAbsen.split(':').map(Number);
    const jamAbsenMenit = jamAbsenHour * 60 + jamAbsenMinute;
    
    if (jamAbsenMenit <= jamMasukMenit) {
      return { status: 'hadir', text: jamAbsen, color: '#10B981' };
    } else {
      return { status: 'terlambat', text: jamAbsen, color: '#F59E0B' };
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

  const handleValidation = (absenId: number, type: 'approve' | 'reject', nama: string) => {
    setValidationData({ absenId, type, nama });
    setShowValidationAlert(true);
  };

  const confirmValidation = async () => {
    if (!validationData) return;
    
    try {
      const result = await KelolaDinasAPI.validateAbsen(validationData.absenId, validationData.type);
      if (result.success) {
        showAlert({ type: 'success', title: 'Sukses', message: 'Status berhasil diperbarui' });
        fetchDinasData(selectedDate);
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: 'Gagal memproses data' });
    }
    setValidationData(null);
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
            const attendanceStatus = getAttendanceStatus(p.jamAbsen, item.jamKerja, selectedDate);
            const canValidate = p.jamAbsen && p.isLokasiSesuai && p.fotoAbsen && 
              attendanceStatus.status !== 'belum_absen' && attendanceStatus.status !== 'belum_waktunya' &&
              p.statusValidasi !== 'disetujui' && p.statusValidasi !== 'ditolak';
            
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
                <View style={styles.statusContainer}>
                   <View style={[styles.dot, { backgroundColor: attendanceStatus.color }]} />
                   <Text style={[styles.statusTxt, { color: attendanceStatus.status === 'hadir' ? '#065F46' : attendanceStatus.status === 'terlambat' ? '#92400E' : '#991B1B' }]}>
                     {attendanceStatus.text}
                   </Text>
                </View>
              </View>

              {p.lokasiAbsen && (
                <View style={styles.empLocationBox}>
                  <Ionicons name="map-outline" size={14} color="#64748B" />
                  <Text style={styles.locationTxt} numberOfLines={1}>
                    {p.lokasiAbsen} 
                    <Text style={{ color: p.isLokasiSesuai ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                      {p.isLokasiSesuai ? ' (Sesuai)' : ' (Luar Radius)'}
                    </Text>
                  </Text>
                </View>
              )}

              <View style={styles.empActions}>
                <TouchableOpacity 
                  onPress={() => { setSelectedPhoto(p.fotoAbsen!); setShowPhotoModal(true); }}
                  disabled={!p.fotoAbsen}
                  style={[styles.btnCircle, !p.fotoAbsen && styles.btnDisabled]}
                >
                  <Ionicons name="image" size={20} color={p.fotoAbsen ? '#004643' : '#CBD5E1'} />
                </TouchableOpacity>

                <View style={styles.validGroup}>
                  <TouchableOpacity 
                    onPress={() => handleValidation(p.absenId, 'approve', p.nama)}
                    disabled={!canValidate}
                    style={[styles.btnValid, styles.btnCheck, p.statusValidasi === 'disetujui' && styles.activeApprove, !canValidate && styles.btnDisabled]}
                  >
                    <Ionicons name="checkmark-done" size={20} color={!canValidate ? '#CBD5E1' : p.statusValidasi === 'disetujui' ? '#FFF' : '#10B981'} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => handleValidation(p.absenId, 'reject', p.nama)}
                    disabled={!canValidate}
                    style={[styles.btnValid, styles.btnCross, p.statusValidasi === 'ditolak' && styles.activeReject, !canValidate && styles.btnDisabled]}
                  >
                    <Ionicons name="close" size={20} color={!canValidate ? '#CBD5E1' : p.statusValidasi === 'ditolak' ? '#FFF' : '#EF4444'} />
                  </TouchableOpacity>
                </View>
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
                  <View style={styles.statusContainer}>
                    <View style={styles.skeletonDot} />
                    <View style={styles.skeletonStatusText} />
                  </View>
                </View>
                <View style={styles.empLocationBox}>
                  <View style={styles.skeletonLocationIcon} />
                  <View style={styles.skeletonLocationText} />
                </View>
                <View style={styles.empActions}>
                  <View style={styles.skeletonBtnCircle} />
                  <View style={styles.validGroup}>
                    <View style={styles.skeletonBtnValid} />
                    <View style={styles.skeletonBtnValid} />
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

      <Modal visible={showPhotoModal} transparent animationType="slide" onRequestClose={() => setShowPhotoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTitle}>Bukti Kehadiran</Text>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: selectedPhoto }} style={styles.fullImage} resizeMode="contain" />
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={showValidationAlert}
        type="confirm"
        title={validationData?.type === 'approve' ? 'Setujui Absensi' : 'Tolak Absensi'}
        message={`Konfirmasi validasi untuk ${validationData?.nama}?`}
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
  btnCircle: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.3 },
  validGroup: { flexDirection: 'row', gap: 10 },
  btnValid: { width: 48, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  btnCheck: { borderColor: '#D1FAE5', backgroundColor: '#ECFDF5' },
  btnCross: { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
  activeApprove: { backgroundColor: '#10B981', borderColor: '#10B981' },
  activeReject: { backgroundColor: '#EF4444', borderColor: '#EF4444' },

  emptyState: { padding: 40, alignItems: 'center', gap: 12 },
  emptyStateTxt: { color: '#94A3B8', fontWeight: '600', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', overflow: 'hidden' },
  modalTopBar: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  closeBtn: { padding: 4 },
  fullImage: { width: '100%', height: '100%', backgroundColor: '#000' },

  /* ========================================
     SKELETON STYLES
  ======================================== */
  // Premium Card Skeleton
  skeletonTagBadge: {
    width: 60,
    height: 16,
    backgroundColor: '#E0F2F1',
    borderRadius: 8,
  },
  skeletonSptText: {
    width: 80,
    height: 11,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonTitle: {
    width: '80%',
    height: 20,
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
    width: 60,
    height: 11,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 2,
  },
  skeletonInfoValue: {
    width: 80,
    height: 13,
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
  skeletonDot: {
    width: 8,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonStatusText: {
    width: 50,
    height: 9,
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
    height: 9,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  skeletonBtnCircle: {
    width: 42,
    height: 42,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
  },
  skeletonBtnValid: {
    width: 48,
    height: 42,
    backgroundColor: '#F0F0F0',
    borderRadius: 14,
  },
});