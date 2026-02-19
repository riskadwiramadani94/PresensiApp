import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../../components";
import UniversalMap, { Marker, MapView } from "../../components/UniversalMap";
import { getApiUrl, API_CONFIG } from "../../constants/config";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Pegawai {
  id_user: number;
  nama_lengkap: string;
  nip: string;
  jabatan: string;
  divisi: string;
  foto_profil?: string;
  latitude: number;
  longitude: number;
  status: string;
  jam_masuk?: string;
}

export default function TrackingPegawai() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  
  const SNAP_TOP = insets.top + 100;
  const SNAP_MIDDLE = SCREEN_HEIGHT * 0.5;
  const SNAP_BOTTOM = SCREEN_HEIGHT - 130;
  const sheetY = useRef(new Animated.Value(SNAP_MIDDLE)).current;
  
  const [activeTab, setActiveTab] = useState("sudah");
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(() => {
      fetchTracking();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTracking = async () => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.TRACKING));
      const result = await response.json();
      
      if (result.success) {
        const formattedData = result.data.map((item: any) => ({
          id_user: item.id_user,
          nama_lengkap: item.nama_lengkap,
          nip: item.nip || '-',
          jabatan: item.jabatan || 'Staff',
          divisi: item.divisi || 'Umum',
          foto_profil: item.foto_profil,
          latitude: item.latitude || -6.8915,
          longitude: item.longitude || 107.6107,
          status: item.status || 'Belum Check-in',
          jam_masuk: item.jam_masuk,
        }));
        setPegawaiList(formattedData);
      }
    } catch (error) {
      console.log('Error fetching tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const zoomToLocation = (lat: number, lng: number, pegawai: Pegawai) => {
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 1000);
    setSelectedPegawai(pegawai);
    Animated.spring(sheetY, { toValue: SNAP_BOTTOM, useNativeDriver: false }).start();
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('hadir')) return '#4CAF50';
    if (statusLower.includes('terlambat')) return '#FF9800';
    if (statusLower.includes('izin')) return '#2196F3';
    if (statusLower.includes('sakit')) return '#9C27B0';
    return '#999';
  };

  const filteredList = pegawaiList.filter(p => 
    activeTab === "sudah" 
      ? p.status.toLowerCase().includes('hadir') || p.status.toLowerCase().includes('terlambat')
      : !p.status.toLowerCase().includes('hadir') && !p.status.toLowerCase().includes('terlambat')
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isAtTop,
      onMoveShouldSetPanResponder: (_, g) => isAtTop && Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        const newY = g.moveY;
        if (newY > SNAP_TOP) {
          sheetY.setValue(newY);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.moveY < SCREEN_HEIGHT * 0.35 || g.vy < -0.5) {
          Animated.spring(sheetY, { toValue: SNAP_TOP, useNativeDriver: false }).start();
        } else if (g.moveY > SCREEN_HEIGHT * 0.7 || g.vy > 0.5) {
          Animated.spring(sheetY, { toValue: SNAP_BOTTOM, useNativeDriver: false }).start();
        } else {
          Animated.spring(sheetY, { toValue: SNAP_MIDDLE, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const sudahAbsen = pegawaiList.filter(p => 
    p.status.toLowerCase().includes('hadir') || p.status.toLowerCase().includes('terlambat')
  ).length;
  const belumAbsen = pegawaiList.length - sudahAbsen;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#004643" translucent={false} />
      
      <AppHeader title="Tracking Pegawai" showBack={false} />
      
      <UniversalMap
        ref={mapRef}
        style={styles.mapArea}
        initialRegion={{
          latitude: -6.8915,
          longitude: 107.6107,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {pegawaiList.filter(p => p.latitude && p.longitude).map((pegawai) => (
          <Marker
            key={pegawai.id_user}
            coordinate={{ latitude: pegawai.latitude, longitude: pegawai.longitude }}
            pinColor={selectedPegawai?.id_user === pegawai.id_user ? '#004643' : getStatusColor(pegawai.status)}
            onPress={() => setSelectedPegawai(pegawai)}
          />
        ))}
      </UniversalMap>

      <Animated.View style={[styles.sheet, { 
          top: sheetY,
          height: SCREEN_HEIGHT 
        }]}>
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.sheetContent}>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              onPress={() => setActiveTab('sudah')}
              style={[styles.tab, activeTab === 'sudah' && styles.activeTabBlue]}
            >
              <Text style={[styles.tabTxt, activeTab === 'sudah' && styles.activeTxt]}>Sudah Absen</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveTab('belum')}
              style={[styles.tab, activeTab === 'belum' && styles.activeTabGreen]}
            >
              <Text style={[styles.tabTxt, activeTab === 'belum' && styles.activeTxt]}>Belum Absen</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#004643" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={filteredList}
              keyExtractor={(item) => item.id_user.toString()}
              onScroll={(e) => setIsAtTop(e.nativeEvent.contentOffset.y <= 0)}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.card} 
                  onPress={() => zoomToLocation(item.latitude, item.longitude, item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.roleIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.nama_lengkap}</Text>
                    <Text style={styles.cardSub}>NIP: {item.nip}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                      </View>
                      {item.jam_masuk && (
                        <Text style={styles.jamText}>• {item.jam_masuk}</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 300 + insets.bottom }}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  mapArea: { flex: 1 },
  sheet: {
    position: 'absolute', left: 0, right: 0,
    backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderBottomWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 25,
      },
    }),
  },
  handleArea: { height: 30, justifyContent: 'center', alignItems: 'center' },
  handleBar: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10 },
  sheetContent: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  tabContainer: { 
    flexDirection: 'row', backgroundColor: '#F1F5F9', 
    borderRadius: 15, padding: 5, marginBottom: 15 
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  activeTabBlue: { backgroundColor: '#004643' },
  activeTabGreen: { backgroundColor: '#4CAF50' },
  tabTxt: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  activeTxt: { color: 'white' },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  roleIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 15 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  cardSub: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  jamText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
});
