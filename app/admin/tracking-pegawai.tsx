/* ========================================
   TRACKING PEGAWAI
   • Peta dengan marker pegawai
   • Tap marker untuk lihat detail
   • Modal muncul dari bawah
======================================== */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Image,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { AppHeader } from "../../components";
import { getApiUrl, API_CONFIG } from "../../constants/config";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const BUBBLE_SIZE = 56;
const CARD_WIDTH = SCREEN_WIDTH - 32;
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 80;
const BUBBLE_MAX_Y = SCREEN_HEIGHT - BUBBLE_SIZE - TAB_BAR_HEIGHT - 16;

interface PegawaiData {
  id_user: number;
  nama_lengkap: string;
  nip: string;
  jabatan: string;
  divisi: string;
  foto_profil?: string;
  latitude: number;
  longitude: number;
  jam_masuk?: string;
  jam_pulang?: string;
  last_update?: string;
  alamat?: string;
  jarak_dari_kantor?: number;
  kantor_terdekat?: string;
  radius_kantor?: number;
  jenis_presensi?: 'kantor' | 'dinas';
  dinas_id?: number;
  is_online?: boolean;
  // Data untuk dinas
  jarak_dari_lokasi_dinas?: number;
  lokasi_dinas_terdekat?: string;
  total_lokasi_dinas?: number;
  lokasi_dalam_radius?: number;
}

export default function TrackingPegawaiScreen() {
  const mapRef = useRef<MapView>(null);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const collapseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bubblePos = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - BUBBLE_SIZE - 28, y: BUBBLE_MAX_Y })).current;
  const bubblePosRef = useRef({ x: SCREEN_WIDTH - BUBBLE_SIZE - 28, y: BUBBLE_MAX_Y });
  const isDragging = useRef(false);

  const [loading, setLoading] = useState(true);
  const [pegawaiList, setPegawaiList] = useState<PegawaiData[]>([]);
  const [summary, setSummary] = useState({ total: 0, online: 0, kantor: 0, dinas: 0, sudah_absen: 0, belum_absen: 0 });
  const [isHariLibur, setIsHariLibur] = useState(false);
  const [namaLibur, setNamaLibur] = useState<string | null>(null);
  const [selectedPegawai, setSelectedPegawai] = useState<PegawaiData | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);

  useEffect(() => {
    if (isCardCollapsed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  }, [isCardCollapsed]);

  const collapseCard = () => {
    Animated.spring(collapseAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 70,
      friction: 10,
    }).start(() => setIsCardCollapsed(true));
  };

  const openCard = () => {
    setIsCardCollapsed(false);
    collapseAnim.setValue(0);
    Animated.spring(collapseAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 55,
      friction: 9,
    }).start();
  };

  // PanResponder untuk drag bubble
  const bubblePanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
    onPanResponderGrant: () => {
      isDragging.current = false;
    },
    onPanResponderMove: (_, g) => {
      isDragging.current = true;
      const newX = Math.max(0, Math.min(bubblePosRef.current.x + g.dx, SCREEN_WIDTH - BUBBLE_SIZE));
      const newY = Math.max(80, Math.min(bubblePosRef.current.y + g.dy, BUBBLE_MAX_Y));
      bubblePos.setValue({ x: newX, y: newY });
    },
    onPanResponderRelease: (_, g) => {
      const newX = Math.max(0, Math.min(bubblePosRef.current.x + g.dx, SCREEN_WIDTH - BUBBLE_SIZE));
      const newY = Math.max(80, Math.min(bubblePosRef.current.y + g.dy, BUBBLE_MAX_Y));
      const snapX = newX + BUBBLE_SIZE / 2 < SCREEN_WIDTH / 2 ? 20 : SCREEN_WIDTH - BUBBLE_SIZE - 20;
      bubblePosRef.current = { x: snapX, y: newY };
      Animated.spring(bubblePos, {
        toValue: { x: snapX, y: newY },
        useNativeDriver: false,
        tension: 60,
        friction: 10,
      }).start();
      if (!isDragging.current) openCard();
    },
  })).current;

  useFocusEffect(
    React.useCallback(() => {
      fetchTracking();
      const interval = setInterval(() => {
        fetchTracking(true);
      }, 30000); // Update setiap 30 detik
      return () => clearInterval(interval);
    }, []),
  );

  const fetchTracking = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.TRACKING));
      const result = await response.json();

      if (result.success && result.data) {
        const formattedData = result.data.map((item: any) => ({
          id_user: item.id_user,
          nama_lengkap: item.nama_lengkap,
          nip: item.nip || "-",
          jabatan: item.jabatan || "Staff",
          divisi: item.divisi || "Umum",
          foto_profil: item.foto_profil,
          latitude: item.latitude,
          longitude: item.longitude,
          jam_masuk: item.jam_masuk,
          jam_pulang: item.jam_pulang,
          last_update: item.last_update,
          jarak_dari_kantor: item.jarak_dari_kantor,
          kantor_terdekat: item.kantor_terdekat,
          radius_kantor: item.radius_kantor,
          jenis_presensi: item.jenis_presensi || 'kantor',
          is_online: item.is_online || false,
          jarak_dari_lokasi_dinas: item.jarak_dari_lokasi_dinas,
          lokasi_dinas_terdekat: item.lokasi_dinas_terdekat,
          total_lokasi_dinas: item.total_lokasi_dinas,
          lokasi_dalam_radius: item.lokasi_dalam_radius,
        }));
        
        console.log('Pegawai data:', formattedData.map((p: PegawaiData) => ({ 
          nama: p.nama_lengkap, 
          foto: p.foto_profil,
          jarak: p.jarak_dari_kantor 
        })));
        setPegawaiList(formattedData);
        if (result.summary) setSummary(result.summary);
        setIsHariLibur(result.is_hari_libur || false);
        setNamaLibur(result.nama_libur || null);
        
        if (!isDetailOpen) {
          const pegawaiDenganGPS = formattedData.filter((p: PegawaiData) => p.latitude && p.longitude);
          if (pegawaiDenganGPS.length > 0) {
            // Prioritas: pegawai kantor dulu, kalau tidak ada baru semua
            const target = pegawaiDenganGPS.find((p: PegawaiData) => p.jenis_presensi === 'kantor') || pegawaiDenganGPS[0];
            
            if (!isRefresh) {
              // Saat pertama buka: zoom ke lokasi kantor
              setTimeout(() => {
                mapRef.current?.animateToRegion({
                  latitude: target.latitude,
                  longitude: target.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }, 1000);
              }, 300);
            } else {
              // Saat refresh: zoom ke semua pegawai
              const latitudes = pegawaiDenganGPS.map((p: PegawaiData) => p.latitude);
              const longitudes = pegawaiDenganGPS.map((p: PegawaiData) => p.longitude);
              const centerLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
              const centerLng = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
              const deltaLat = (Math.max(...latitudes) - Math.min(...latitudes)) * 1.5;
              const deltaLng = (Math.max(...longitudes) - Math.min(...longitudes)) * 1.5;
              mapRef.current?.animateToRegion({
                latitude: centerLat,
                longitude: centerLng,
                latitudeDelta: Math.max(deltaLat, 0.01),
                longitudeDelta: Math.max(deltaLng, 0.01),
              }, 1000);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching tracking:", error);
    } finally {
      setLoading(false);
    }
  };

  const hitungJarak = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  const formatJarak = (meter: number) => {
    if (meter < 1000) return `${meter}m`;
    return `${(meter / 1000).toFixed(1)}km`;
  };

  const getJarakColor = (jarak: number | undefined, radius: number | undefined) => {
    if (!jarak) return '#666';
    const radiusKantor = radius || 50; // Default 50m jika tidak ada radius
    if (jarak <= radiusKantor) return '#4CAF50'; // Hijau - dalam radius
    return '#F44336'; // Merah - di luar radius
  };

  const getJarakInfo = (pegawai: PegawaiData) => {
    if (pegawai.jenis_presensi === 'dinas') {
      return {
        label: 'Jarak dari Lokasi Dinas',
        jarak: pegawai.jarak_dari_lokasi_dinas,
        radius: 50, // Default radius dinas
        lokasi: pegawai.lokasi_dinas_terdekat
      };
    } else {
      return {
        label: 'Jarak dari Kantor',
        jarak: pegawai.jarak_dari_kantor,
        radius: pegawai.radius_kantor,
        lokasi: pegawai.kantor_terdekat
      };
    }
  };

  const getJarakStatusDinas = (pegawai: PegawaiData) => {
    if (pegawai.jenis_presensi === 'dinas') {
      if (!pegawai.jarak_dari_lokasi_dinas) return 'Tidak diketahui';
      
      const totalLokasi = pegawai.total_lokasi_dinas || 0;
      const lokasiDalamRadius = pegawai.lokasi_dalam_radius || 0;
      const namaLokasi = pegawai.lokasi_dinas_terdekat || 'lokasi dinas';
      
      if (lokasiDalamRadius > 0) {
        return `${lokasiDalamRadius} dari ${totalLokasi} lokasi dalam radius ${namaLokasi}`;
      } else {
        return `Di luar semua lokasi dinas`;
      }
    } else {
      return getJarakStatus(pegawai.jarak_dari_kantor, pegawai.radius_kantor, pegawai.kantor_terdekat);
    }
  };

  const getTimeAgo = (lastUpdate: string | undefined) => {
    if (!lastUpdate) return "Belum update";
    const now = new Date();
    const updated = new Date(lastUpdate);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    return `${Math.floor(diffHours / 24)} hari lalu`;
  };

  const openBottomSheet = () => {
    setShowBottomSheet(true);
    setIsDetailOpen(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowBottomSheet(false);
      setSelectedPegawai(null);
      setIsDetailOpen(false);
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeBottomSheet();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const handleMarkerPress = (pegawai: PegawaiData) => {
    setSelectedPegawai(pegawai);
    openBottomSheet();
    mapRef.current?.animateToRegion({
      latitude: pegawai.latitude,
      longitude: pegawai.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  };

  const handleCounterClick = (type: 'kantor' | 'dinas') => {
    const filtered = pegawaiList.filter((p: PegawaiData) => 
      p.latitude && p.longitude && p.jenis_presensi === type
    );
    
    if (filtered.length === 0) return;
    
    const latitudes = filtered.map((p: PegawaiData) => p.latitude);
    const longitudes = filtered.map((p: PegawaiData) => p.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = (maxLat - minLat) * 1.5;
    const deltaLng = (maxLng - minLng) * 1.5;
    
    mapRef.current?.animateToRegion({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(deltaLat, 0.01),
      longitudeDelta: Math.max(deltaLng, 0.01),
    }, 1000);
  };

  const getJarakStatus = (jarak: number | undefined, radius: number | undefined, kantorTerdekat: string | undefined) => {
    if (!jarak) return 'Tidak diketahui';
    const radiusKantor = radius || 50;
    const namaKantor = kantorTerdekat || 'kantor';
    if (jarak <= radiusKantor) return `Dalam radius ${namaKantor}`;
    return `Di luar radius ${namaKantor}`;
  };

  const getJarakColorDinas = (pegawai: PegawaiData) => {
    if (pegawai.jenis_presensi === 'dinas') {
      const lokasiDalamRadius = pegawai.lokasi_dalam_radius || 0;
      return lokasiDalamRadius > 0 ? '#4CAF50' : '#F44336';
    } else {
      return getJarakColor(pegawai.jarak_dari_kantor, pegawai.radius_kantor);
    }
  };

  const kantorCount = summary.kantor;
  const dinasCount = summary.dinas;
  const totalCount = summary.total;
  const onlineCount = summary.online;
  const sudahAbsenCount = summary.sudah_absen;
  const belumAbsenCount = summary.belum_absen;

  const screenWidth = Dimensions.get('window').width;
  const cardStyle = {
    opacity: collapseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 1] }),
    transform: [
      { translateX: collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [bubblePosRef.current.x - 16, 0] }) },
      { translateY: collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [bubblePosRef.current.y - (SCREEN_HEIGHT - 20 - 180), 0] }) },
      { scale: collapseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] }) },
    ],
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent={true} backgroundColor="transparent" />
        <AppHeader title="Tracking Pegawai" showBack={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#004643" />
          <Text style={styles.loadingText}>Memuat data tracking...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      <AppHeader title="Tracking Pegawai" showBack={false} />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: pegawaiList.find(p => p.jenis_presensi === 'kantor')?.latitude || pegawaiList[0]?.latitude || -6.2088,
          longitude: pegawaiList.find(p => p.jenis_presensi === 'kantor')?.longitude || pegawaiList[0]?.longitude || 106.8456,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {pegawaiList
          .filter((p: PegawaiData) => p.latitude && p.longitude)
          .map((pegawai: PegawaiData, index: number) => (
            <Marker
              key={`marker-${pegawai.id_user}-${index}`}
              coordinate={{
                latitude: pegawai.latitude,
                longitude: pegawai.longitude,
              }}
              onPress={() => handleMarkerPress(pegawai)}
              stopPropagation={true}
            >
              <View style={[
                styles.customMarker,
                { borderColor: pegawai.jenis_presensi === 'dinas' ? '#FFC107' : '#10B981' }
              ]}>
                {pegawai.foto_profil ? (
                  <Image
                    source={{ uri: `${API_CONFIG.BASE_URL}/${pegawai.foto_profil}` }}
                    style={styles.markerPhoto}
                    onError={(e) => console.log('Error loading image:', pegawai.nama_lengkap, `${API_CONFIG.BASE_URL}/${pegawai.foto_profil}`)}
                  />
                ) : (
                  <View style={styles.markerInitial}>
                    <Text style={styles.markerInitialText}>
                      {pegawai.nama_lengkap.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </Marker>
          ))}
      </MapView>

      {/* Floating Card */}
      <Animated.View style={[styles.floatingCard, cardStyle]}>
        <TouchableOpacity
          onPress={collapseCard}
          activeOpacity={0.7}
          style={{ position: 'absolute', top: -10, left: -10, zIndex: 10 }}
        >
          <Ionicons name="remove-circle" size={26} color="#bbb" />
        </TouchableOpacity>

        <View style={styles.floatingCardHeader}>
          <View style={styles.onlineDot} />
          <Text style={styles.floatingCardTitle}>Pegawai Aktif</Text>
          <Text style={styles.floatingCardTotal}>{onlineCount} Online</Text>
        </View>

        <View style={styles.floatingCardDivider} />

        <View style={styles.floatingCardRow}>
          <TouchableOpacity style={styles.floatingCardItem} onPress={() => handleCounterClick('kantor')}>
            <Ionicons name="business" size={14} color="#10B981" />
            <Text style={styles.floatingCardLabel}>Kantor</Text>
            <Text style={styles.floatingCardValue}>{kantorCount}</Text>
          </TouchableOpacity>
          <View style={styles.floatingCardSep} />
          <TouchableOpacity style={styles.floatingCardItem} onPress={() => handleCounterClick('dinas')}>
            <Ionicons name="briefcase" size={14} color="#FFC107" />
            <Text style={styles.floatingCardLabel}>Dinas</Text>
            <Text style={styles.floatingCardValue}>{dinasCount}</Text>
          </TouchableOpacity>
          <View style={styles.floatingCardSep} />
          <View style={styles.floatingCardItem}>
            <Ionicons name="people" size={14} color="#9E9E9E" />
            <Text style={styles.floatingCardLabel}>Total</Text>
            <Text style={styles.floatingCardValue}>{totalCount}</Text>
          </View>
        </View>

        <View style={styles.floatingCardDivider} />

        <View style={styles.floatingCardRow}>
          <View style={styles.floatingCardItem}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
            <Text style={styles.floatingCardLabel}>Sudah Absen</Text>
            <Text style={styles.floatingCardValue}>{sudahAbsenCount}</Text>
          </View>
          <View style={styles.floatingCardSep} />
          {isHariLibur ? (
            <View style={styles.floatingCardItem}>
              <Ionicons name="sunny" size={14} color="#FFA726" />
              <Text style={[styles.floatingCardLabel, { color: '#FFA726' }]} numberOfLines={1}>{namaLibur || 'Libur'}</Text>
              <Text style={[styles.floatingCardValue, { color: '#FFA726' }]}>-</Text>
            </View>
          ) : (
            <View style={styles.floatingCardItem}>
              <Ionicons name="close-circle" size={14} color="#F44336" />
              <Text style={styles.floatingCardLabel}>Blm Absen</Text>
              <Text style={[styles.floatingCardValue, belumAbsenCount > 0 ? { color: '#F44336' } : {}]}>{belumAbsenCount}</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Bubble Glow - bisa di-drag */}
      {isCardCollapsed && (
        <Animated.View
          style={[
            styles.bubbleBtn,
            { left: bubblePos.x, top: bubblePos.y, bottom: undefined, right: undefined }
          ]}
          {...bubblePanResponder.panHandlers}
        >
          <Animated.View style={[
            styles.bubbleGlow1,
            {
              opacity: glowAnim,
              transform: [{ scale: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [1, 1.4] }) }],
            }
          ]} />
          <Animated.View style={[
            styles.bubbleGlow2,
            {
              opacity: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.1, 0.4] }),
              transform: [{ scale: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [1.4, 1.8] }) }],
            }
          ]} />
          <Ionicons name="people" size={26} color="#fff" />
        </Animated.View>
      )}

      <Modal
        visible={showBottomSheet}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeBottomSheet}
          />
          <Animated.View
            style={[styles.bottomSheet, { transform: [{ translateY }] }]}
          >
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            <View style={styles.sheetContent}>
              {selectedPegawai && (
                <>
                  <Text style={styles.sheetTitle}>
                    {selectedPegawai.nama_lengkap}
                  </Text>

                  <View style={styles.statusContainer}>
                    <Text style={styles.statusLabel}>Status: </Text>
                    <Text style={selectedPegawai.jam_masuk ? styles.statusTextGreen : styles.statusTextRed}>
                      {selectedPegawai.jam_masuk ? 'Sudah Absen' : 'Belum Absen'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoItemHalf}>
                      <Text style={styles.infoLabel}>NIP</Text>
                      <Text style={styles.infoValue}>{selectedPegawai.nip}</Text>
                    </View>
                    <View style={styles.infoItemHalf}>
                      <Text style={styles.infoLabel}>Terakhir Aktif</Text>
                      <Text style={styles.infoValue}>
                        {getTimeAgo(selectedPegawai.last_update)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoItemHalf}>
                      <Text style={styles.infoLabel}>Jam Masuk</Text>
                      <Text style={styles.infoValue}>{selectedPegawai.jam_masuk || "-"}</Text>
                    </View>
                    <View style={styles.infoItemHalf}>
                      <Text style={styles.infoLabel}>Jam Pulang</Text>
                      <Text style={styles.infoValue}>{selectedPegawai.jam_pulang || "-"}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.jarakRow,
                      { borderColor: getJarakColorDinas(selectedPegawai) }
                    ]}
                    onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${selectedPegawai.latitude},${selectedPegawai.longitude}`)}
                  >
                    <View style={styles.jarakInfo}>
                      <Text style={styles.infoLabel}>{getJarakInfo(selectedPegawai).label}</Text>
                      <Text style={[
                        styles.infoValue,
                        { color: getJarakColorDinas(selectedPegawai) }
                      ]}>
                        {getJarakInfo(selectedPegawai).jarak
                          ? formatJarak(getJarakInfo(selectedPegawai).jarak!)
                          : "-"}
                      </Text>
                      <Text style={[
                        styles.jarakStatus,
                        { color: getJarakColorDinas(selectedPegawai) }
                      ]}>
                        {getJarakStatusDinas(selectedPegawai)}
                      </Text>
                    </View>
                    <View style={[
                      styles.routeIconContainer,
                      { backgroundColor: getJarakColorDinas(selectedPegawai) + '20' }
                    ]}>
                      <Ionicons name="navigate" size={20} color={getJarakColorDinas(selectedPegawai)} />
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  map: { flex: 1 },
  floatingCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  floatingCardTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#004643',
  },
  floatingCardDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  floatingCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingCardItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  floatingCardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  floatingCardLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  floatingCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  floatingCardSep: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  bubbleBtn: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: '#004643',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  bubbleGlow1: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: '#4ade80',
  },
  bubbleGlow2: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  customMarker: {
    width: 35,
    height: 35,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#10B981", // Default hijau untuk kantor
    backgroundColor: "#004643",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    overflow: "visible",
  },
  markerPhoto: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
  },
  markerInitial: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: "#004643",
    justifyContent: "center",
    alignItems: "center",
  },
  markerInitialText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalBackdrop: { flex: 1 },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#DDD",
    borderRadius: 2,
  },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 16 },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  statusTextGreen: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4CAF50",
  },
  statusTextRed: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
  },
  statusSeparator: {
    fontSize: 14,
    color: "#666",
  },
  statusTextStrike: {
    textDecorationLine: "line-through",
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  infoItemHalf: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoItemFull: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    lineHeight: 18,
  },
  jarakRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  jarakInfo: {
    flex: 1,
  },
  jarakStatus: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  routeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#E0F2F1",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
});
