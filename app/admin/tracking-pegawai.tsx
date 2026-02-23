/* ========================================
   TRACKING PEGAWAI
   • Tap marker pegawai untuk lihat detail
   • Callout muncul otomatis saat marker diklik
======================================== */

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
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../../components";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
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
  last_update?: string;
  alamat?: string;
  jarak_dari_kantor?: number;
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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCallout, setShowCallout] = useState(false);
  const calloutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      
      console.log('Tracking API Response:', result);
      
      if (result.success) {
        const formattedData = await Promise.all(result.data.map(async (item: any) => {
          let alamat = 'Memuat alamat...';
          let jarak = 0;
          
          // Reverse geocoding untuk alamat
          if (item.latitude && item.longitude) {
            try {
              const geoResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${item.latitude}&lon=${item.longitude}&addressdetails=1`
              );
              const geoData = await geoResponse.json();
              alamat = geoData.display_name || 'Alamat tidak ditemukan';
              
              // Hitung jarak dari kantor (contoh: ITB Sumarecon)
              jarak = hitungJarak(-6.95342500, 107.69635670, item.latitude, item.longitude);
            } catch (error) {
              console.log('Geocoding error:', error);
            }
          }
          
          return {
            id_user: item.id_user,
            nama_lengkap: item.nama_lengkap,
            nip: item.nip || '-',
            jabatan: item.jabatan || 'Staff',
            divisi: item.divisi || 'Umum',
            foto_profil: item.foto_profil,
            latitude: item.latitude,
            longitude: item.longitude,
            status: item.status || 'Belum Absen',
            jam_masuk: item.jam_masuk,
            last_update: item.last_update,
            alamat,
            jarak_dari_kantor: jarak,
          };
        }));
        console.log('Total pegawai:', formattedData.length);
        console.log('Sudah absen:', formattedData.filter(p => p.status.includes('Hadir') || p.status.includes('Terlambat')).length);
        console.log('Belum absen:', formattedData.filter(p => p.status === 'Belum Absen').length);
        setPegawaiList(formattedData);
      }
    } catch (error) {
      console.log('Error fetching tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // UTILITY: Hitung jarak antar koordinat (Haversine)
  // ========================================
  const hitungJarak = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);
  };

  // ========================================
  // UTILITY: Format jarak (meter/km)
  // ========================================
  const formatJarak = (meter: number) => {
    if (meter < 1000) return `${meter}m`;
    return `${(meter / 1000).toFixed(1)}km`;
  };

  // ========================================
  // HANDLER: Zoom ke lokasi pegawai
  // ========================================
  const zoomToLocation = (lat: number, lng: number, pegawai: Pegawai) => {
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 1000);
    setSelectedPegawai(pegawai);
    setExpandedId(pegawai.id_user);
    Animated.spring(sheetY, { toValue: SNAP_BOTTOM, useNativeDriver: false }).start();
  };

  // ========================================
  // HANDLER: Tap marker untuk lihat detail
  // Fix iOS: tracksViewChanges & stopPropagation
  // ========================================
  const handleMarkerPress = (pegawai: Pegawai) => {
    console.log('Marker pressed:', pegawai.nama_lengkap);
    setSelectedPegawai(pegawai);
    setExpandedId(pegawai.id_user);
    
    if (calloutTimer.current) {
      clearTimeout(calloutTimer.current);
    }
    
    setShowCallout(false);
    calloutTimer.current = setTimeout(() => {
      setShowCallout(true);
    }, 200);
    
    mapRef.current?.animateToRegion({
      latitude: pegawai.latitude,
      longitude: pegawai.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 1000);
    
    Animated.spring(sheetY, { toValue: SNAP_BOTTOM, useNativeDriver: false }).start();
  };

  // ========================================
  // HANDLER: Expand/collapse card pegawai
  // ========================================
  const handleCardPress = (item: Pegawai) => {
    setExpandedId(expandedId === item.id_user ? null : item.id_user);
  };

  const openRoute = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}`,
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  // ========================================
  // UTILITY: Waktu relatif (aktif/tidak aktif)
  // ========================================
  const getTimeAgo = (lastUpdate: string | undefined) => {
    if (!lastUpdate) return null;
    const now = new Date();
    const updated = new Date(lastUpdate);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 5) return { text: 'Aktif sekarang', color: '#4CAF50' };
    if (diffMins < 30) return { text: `${diffMins} menit lalu`, color: '#FF9800' };
    return { text: 'Tidak aktif', color: '#999' };
  };

  // ========================================
  // UTILITY: Warna status absensi
  // ========================================
  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('hadir') && !statusLower.includes('tidak')) return '#4CAF50';
    if (statusLower.includes('terlambat')) return '#FF9800';
    if (statusLower.includes('izin')) return '#2196F3';
    if (statusLower.includes('sakit')) return '#9C27B0';
    if (statusLower.includes('cuti')) return '#795548';
    return '#999';
  };

  const filteredList = pegawaiList.filter(p => {
    const statusLower = p.status?.toLowerCase() || '';
    const sudahAbsen = statusLower.includes('hadir') || statusLower.includes('terlambat');
    return activeTab === "sudah" ? sudahAbsen : !sudahAbsen;
  });

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

  const sudahAbsen = pegawaiList.filter(p => {
    const statusLower = p.status?.toLowerCase() || '';
    return statusLower.includes('hadir') || statusLower.includes('terlambat');
  }).length;
  const belumAbsen = pegawaiList.length - sudahAbsen;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#004643" translucent={false} />
      
      <AppHeader title="Tracking Pegawai" showBack={false} />
      
      {/* ========================================
          MARKERS: Lokasi pegawai di peta
          - tracksViewChanges={false}: Fix iOS performance
          - stopPropagation={true}: Fix iOS tap detection
      ======================================== */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.mapArea}
        initialRegion={{
          latitude: -6.8915,
          longitude: 107.6107,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {/* Marker pegawai dengan foto/initial */}
        {pegawaiList.filter(p => p.latitude && p.longitude).map((pegawai) => {
          return (
            <Marker
              key={pegawai.id_user}
              coordinate={{ latitude: pegawai.latitude, longitude: pegawai.longitude }}
              onPress={() => handleMarkerPress(pegawai)}  // Tap untuk detail
              tracksViewChanges={false}  // Fix iOS: Optimasi render
              stopPropagation={true}  // Fix iOS: Cegah event ke map
            >
              {/* Marker custom dengan foto/initial */}
              <View style={styles.markerWrapper}>
                <View style={[styles.markerCircle, { borderColor: getStatusColor(pegawai.status) }]}>
                  {pegawai.foto_profil ? (
                    <Image 
                      source={{ uri: `${API_CONFIG.BASE_URL}/${pegawai.foto_profil}` }}
                      style={styles.markerPhoto}
                    />
                  ) : (
                    <View style={[styles.markerInitialBg, { backgroundColor: getStatusColor(pegawai.status) }]}>
                      <Text style={styles.markerInitialText}>
                        {pegawai.nama_lengkap.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ========================================
          CALLOUT: Info pegawai saat marker diklik
          - Muncul dengan delay 200ms
          - pointerEvents="none": Tidak block touch
      ======================================== */}
      {showCallout && selectedPegawai && selectedPegawai.latitude && selectedPegawai.longitude && (
        <View style={styles.calloutOverlay} pointerEvents="none">
          <View style={styles.calloutBubble}>
            <View style={styles.calloutContent}>
              <View style={[styles.calloutAvatar, { backgroundColor: getStatusColor(selectedPegawai.status) }]}>
                {selectedPegawai.foto_profil ? (
                  <Image 
                    source={{ uri: `${API_CONFIG.BASE_URL}/${selectedPegawai.foto_profil}` }}
                    style={styles.calloutAvatarImage}
                  />
                ) : (
                  <Text style={styles.calloutAvatarInitial}>
                    {selectedPegawai.nama_lengkap.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.calloutTextContainer}>
                <Text style={styles.calloutName}>{selectedPegawai.nama_lengkap.split(' ')[0]}</Text>
                <Text style={styles.calloutTime}>
                  {getTimeAgo(selectedPegawai.last_update)?.text || 'Belum update'}
                </Text>
              </View>
            </View>
            <View style={styles.calloutArrow} />
          </View>
        </View>
      )}

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
              renderItem={({ item }) => {
                const isExpanded = expandedId === item.id_user;
                return (
                  <View style={styles.cardWrapper}>
                    <TouchableOpacity 
                      style={styles.card} 
                      onPress={() => handleCardPress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.roleIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.cardTitle}>{item.nama_lengkap}</Text>
                          <Ionicons 
                            name={isExpanded ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color="#94A3B8" 
                          />
                        </View>
                        <Text style={styles.cardSub}>NIP: {item.nip}</Text>
                        
                        {!isExpanded && (
                          <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                              <Text style={styles.statusText}>{item.status}</Text>
                            </View>
                            {item.jam_masuk ? (
                              <Text style={styles.jamText}>• {item.jam_masuk}</Text>
                            ) : item.last_update ? (
                              <Text style={[styles.lokasiText, { color: getTimeAgo(item.last_update)?.color }]}>
                                • {getTimeAgo(item.last_update)?.text}
                              </Text>
                            ) : (
                              <Text style={styles.lokasiText}>• Lokasi tidak terdeteksi</Text>
                            )}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                    
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        {item.latitude && item.longitude ? (
                          <>
                            <View style={styles.addressSection}>
                              <Ionicons name="location" size={16} color="#004643" />
                              <Text style={styles.addressText}>{item.alamat}</Text>
                            </View>
                            <TouchableOpacity 
                              style={styles.routeButton}
                              onPress={() => openRoute(item.latitude, item.longitude)}
                            >
                              <Ionicons name="navigate" size={16} color="#004643" />
                              <Text style={styles.routeText}>Rute</Text>
                            </TouchableOpacity>
                            
                            <View style={styles.dividerLine} />
                            
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>Status:</Text>
                              <Text style={[styles.infoValue, { color: getStatusColor(item.status) }]}>
                                {item.status} {item.status.includes('Hadir') ? '✓' : item.status === 'Belum Absen' ? '⚠️' : ''}
                              </Text>
                            </View>
                            
                            {item.jam_masuk && (
                              <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Jam masuk:</Text>
                                <Text style={styles.infoValue}>{item.jam_masuk} WIB</Text>
                              </View>
                            )}
                            
                            {item.jarak_dari_kantor !== undefined && (
                              <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Jarak dari kantor:</Text>
                                <Text style={styles.infoValue}>{formatJarak(item.jarak_dari_kantor)}</Text>
                              </View>
                            )}
                            
                            {item.last_update && (
                              <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Terakhir update:</Text>
                                <Text style={styles.infoValue}>{getTimeAgo(item.last_update)?.text}</Text>
                              </View>
                            )}
                          </>
                        ) : (
                          <>
                            <View style={styles.noLocationSection}>
                              <Ionicons name="close-circle" size={24} color="#EF5350" />
                              <Text style={styles.noLocationText}>Lokasi Tidak Terdeteksi</Text>
                              <Text style={styles.noLocationSubtext}>Pegawai belum membuka aplikasi</Text>
                            </View>
                            
                            <View style={styles.dividerLine} />
                            
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>Status:</Text>
                              <Text style={[styles.infoValue, { color: getStatusColor(item.status) }]}>
                                {item.status} ⚠️
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              }}
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
  lokasiText: { fontSize: 10, color: '#EF5350', fontWeight: '600', fontStyle: 'italic' },
  cardWrapper: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E0F2F1',
    borderRadius: 8,
    gap: 6,
    marginBottom: 12,
  },
  routeText: {
    fontSize: 13,
    color: '#004643',
    fontWeight: '600',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  noLocationSection: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  noLocationText: {
    fontSize: 14,
    color: '#EF5350',
    fontWeight: '600',
  },
  noLocationSubtext: {
    fontSize: 11,
    color: '#94A3B8',
  },
  // ========================================
  // STYLES: Marker wrapper dengan touch area 50x50
  // ========================================
  markerWrapper: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    overflow: 'visible'
  },
  markerPhoto: {
    width: 29,
    height: 29,
    borderRadius: 14.5,
  },
  markerInitialBg: {
    width: 29,
    height: 29,
    borderRadius: 14.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInitialText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calloutOverlay: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    transform: [{ translateX: -75 }],
    zIndex: 1000,
  },
  calloutBubble: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    minWidth: 150,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  calloutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calloutAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calloutAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  calloutAvatarInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  calloutTextContainer: {
    flex: 1,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  calloutTime: {
    fontSize: 11,
    color: '#64748B',
  },
  calloutArrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
});
