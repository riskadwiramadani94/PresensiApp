import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppHeader } from "../../../../components";
import { API_CONFIG, getApiUrl } from "../../../../constants/config";
import { CustomAlert } from '../../../../components/CustomAlert';
import { useCustomAlert } from '../../../../hooks/useCustomAlert';

export default function DetailPegawai() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [pegawai, setPegawai] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { visible, config, showAlert, hideAlert, handleConfirm } = useCustomAlert();

  const formatDateFromISO = (isoDate: string) => {
    if (!isoDate) return "-";
    try {
      // Handle format YYYY-MM-DD dari database
      if (typeof isoDate === 'string' && isoDate.includes('-')) {
        const parts = isoDate.split('T')[0].split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          const day = parts[2].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[0];
          return `${day}/${month}/${year}`;
        }
      }
      return "-";
    } catch (error) {
      return "-";
    }
  };

  const isDataComplete = (data: any) => {
    return (
      data &&
      data.email?.trim() !== "" &&
      data.has_password === true &&
      data.nama_lengkap?.trim() !== "" &&
      data.nip?.trim() !== ""
    );
  };

  useEffect(() => {
    fetchPegawaiDetail();
  }, [id]);

  const fetchPegawaiDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.DETAIL_PEGAWAI)}/${id}`
      );
      const result = await response.json();
      if (result.success) {
        console.log('Data pegawai:', result.data);
        console.log('Tanggal lahir:', result.data.tanggal_lahir);
        setPegawai(result.data);
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Gagal memuat data' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Koneksi Error', message: 'Gagal terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !pegawai) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <AppHeader title="Detail Pegawai" showBack fallbackRoute="/menu-admin/pegawai-akun/data-pegawai-admin" />
        
        {/* ========================================
             SKELETON LOADING STATE - DETAIL PEGAWAI
        ======================================== */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Skeleton Header */}
          <LinearGradient colors={["#004643", "#065f46"]} style={styles.profileHeader}>
            <View style={styles.profileContent}>
              <View style={styles.photoWrapper}>
                <View style={styles.skeletonAvatar} />
              </View>
              <View style={styles.profileTextInfo}>
                <View style={styles.skeletonName} />
                <View style={styles.skeletonNip} />
                <View style={styles.skeletonBadge} />
              </View>
            </View>
          </LinearGradient>

          <View style={styles.infoSection}>
            {/* Skeleton Card 1 */}
            <View style={styles.elegantCard}>
              <View style={styles.cardHeader}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonCardTitle} />
              </View>
              <View style={styles.separator} />
              <View style={styles.infoRowModern}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
              <View style={styles.infoRowModern}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
              <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonDescription} />
                </View>
              </View>
            </View>

            {/* Skeleton Card 2 */}
            <View style={styles.elegantCard}>
              <View style={styles.cardHeader}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonCardTitle} />
              </View>
              <View style={styles.separator} />
              <View style={styles.infoRowModern}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
              <View style={styles.infoRowModern}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
              <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
            </View>

            {/* Skeleton Card 3 */}
            <View style={styles.elegantCard}>
              <View style={styles.cardHeader}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonCardTitle} />
              </View>
              <View style={styles.separator} />
              <View style={styles.infoRowModern}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
              <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
                <View style={styles.skeletonIconBox} />
                <View style={styles.infoContentModern}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <AppHeader
        title="Detail Pegawai"
        showBack={true}
        fallbackRoute="/menu-admin/pegawai-akun/data-pegawai-admin"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* PROFILE HEADER SECTION */}
        <LinearGradient
          colors={["#004643", "#00695C"]}
          style={styles.profileHeader}
        >
          <View style={styles.profileContent}>
            <View style={styles.photoWrapper}>
              {pegawai.foto_profil ? (
                <Image
                  source={{ uri: `${API_CONFIG.BASE_URL}/${pegawai.foto_profil}` }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {pegawai.nama_lengkap?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileTextInfo}>
              <Text style={styles.mainName}>{pegawai.nama_lengkap}</Text>
              <Text style={styles.subText}>NIP: {pegawai.nip || "-"}</Text>
              <View style={styles.badgeMini}>
                <Text style={styles.badgeTextMini}>{pegawai.role || "Pegawai"}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.infoSection}>
          {/* Card 1: Informasi Pribadi */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle-outline" size={20} color="#004643" />
              <Text style={styles.cardTitle}>Informasi Pribadi</Text>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="call" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>NOMOR TELEPON</Text>
                <Text style={styles.valueModern}>{pegawai.no_telepon || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="transgender-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>JENIS KELAMIN</Text>
                <Text style={styles.valueModern}>{pegawai.jenis_kelamin || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="calendar-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>TANGGAL LAHIR</Text>
                <Text style={styles.valueModern}>{pegawai.tanggal_lahir ? formatDateFromISO(pegawai.tanggal_lahir) : '-'}</Text>
              </View>
            </View>

            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.infoIconBox}>
                <Ionicons name="location-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>ALAMAT LENGKAP</Text>
                <Text style={styles.descriptionText}>{pegawai.alamat || 'Alamat belum diisi'}</Text>
              </View>
            </View>
          </View>

          {/* Card 2: Informasi Kepegawaian */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="briefcase-outline" size={20} color="#004643" />
              <Text style={styles.cardTitle}>Informasi Kepegawaian</Text>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="ribbon-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>JABATAN</Text>
                <Text style={styles.valueModern}>{pegawai.jabatan || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="business-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>DIVISI</Text>
                <Text style={styles.valueModern}>{pegawai.divisi || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>STATUS PEGAWAI</Text>
                <Text style={styles.valueModern}>{pegawai.status_pegawai || 'Aktif'}</Text>
              </View>
            </View>

            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.infoIconBox}>
                <Ionicons name="calendar-number-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>TERDAFTAR SEJAK</Text>
                <Text style={styles.valueModern}>{pegawai.tanggal_masuk ? formatDateFromISO(pegawai.tanggal_masuk) : '-'}</Text>
              </View>
            </View>
          </View>

          {/* Card 3: Akses Akun */}
          <View style={styles.elegantCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#004643" />
              <Text style={styles.cardTitle}>Akses Akun</Text>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.infoRowModern}>
              <View style={styles.infoIconBox}>
                <Ionicons name="mail-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>EMAIL LOGIN</Text>
                <Text style={styles.valueModern}>{pegawai.email || '-'}</Text>
              </View>
            </View>

            <View style={[styles.infoRowModern, { marginBottom: 0 }]}>
              <View style={styles.infoIconBox}>
                <Ionicons name="key-outline" size={16} color="#00695C" />
              </View>
              <View style={styles.infoContentModern}>
                <Text style={styles.labelModern}>STATUS PASSWORD</Text>
                <Text style={styles.valueModern}>{pegawai.has_password ? 'Password Aktif' : 'Belum diatur'}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      {!isDataComplete(pegawai) && (
        <TouchableOpacity
          style={styles.fabButton}
          activeOpacity={0.8}
          onPress={() =>
            router.push(
              `/pegawai-akun/detail/edit/${pegawai.id_pegawai || pegawai.id_user}` as any
            )
          }
        >
          <Ionicons name="pencil" size={22} color="#fff" />
          <Text style={styles.fabText}>Lengkapi Data</Text>
        </TouchableOpacity>
      )}
      
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  /* Header Section */
  profileHeader: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  photoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  profileTextInfo: {
    marginLeft: 20,
    flex: 1,
  },
  mainName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: "#E0F2F1",
    marginBottom: 8,
  },
  badgeMini: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeTextMini: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  // Info Section
  infoSection: { marginTop: -20, paddingHorizontal: 16 },
  elegantCard: {
    backgroundColor: '#FFF',
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginLeft: 10 },
  separator: { height: 1, backgroundColor: '#F0F3F3', marginBottom: 18 },
  
  // Modern Info Rows
  infoRowModern: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  infoIconBox: { 
    width: 34, height: 34, backgroundColor: '#F0F7F7',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, marginTop: 2 
  },
  infoContentModern: { flex: 1 },
  labelModern: { fontSize: 10, fontWeight: '800', color: '#95A5A6', letterSpacing: 1.1, marginBottom: 5 },
  valueModern: { fontSize: 15, fontWeight: '600', color: '#2C3E50', lineHeight: 20 },
  descriptionText: { fontSize: 14, color: '#576574', lineHeight: 22, fontWeight: '400' },
  /* Floating Button */
  fabButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    left: 20,
    backgroundColor: "#FF9800",
    height: 55,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF9800",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  
  // Skeleton Styles
  skeletonAvatar: { width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 40 },
  skeletonName: { width: '70%', height: 20, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginBottom: 8 },
  skeletonNip: { width: '50%', height: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginBottom: 8 },
  skeletonBadge: { width: '40%', height: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6 },
  skeletonIcon: { width: 20, height: 20, backgroundColor: '#E2E8F0', borderRadius: 4 },
  skeletonCardTitle: { width: '60%', height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, marginLeft: 10 },
  skeletonIconBox: { width: 34, height: 34, backgroundColor: '#E2E8F0', borderRadius: 12, marginRight: 15, marginTop: 2 },
  skeletonLabel: { width: '80%', height: 10, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 5 },
  skeletonValue: { width: '60%', height: 15, backgroundColor: '#E2E8F0', borderRadius: 4 },
  skeletonDescription: { width: '90%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 },
});