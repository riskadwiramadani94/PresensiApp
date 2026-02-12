import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, TextInput, FlatList, ActivityIndicator, Keyboard, Alert, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getLeafletHTML } from '../utils/leafletMapHTML';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface MapPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: LocationData) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
}

export default function MapPicker({ visible, onClose, onConfirm, initialLocation }: MapPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const webViewRef = useRef<WebView>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      getUserLocation();
    }
  }, [visible]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });

      // Kirim lokasi user ke WebView untuk tampilkan dot biru
      setTimeout(() => {
        webViewRef.current?.postMessage(JSON.stringify({
          action: 'setUserLocation',
          latitude,
          longitude
        }));
      }, 1000);
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const useMyLocation = async () => {
    setIsLoadingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Izin Lokasi Diperlukan', 'Aplikasi memerlukan izin akses lokasi untuk menggunakan fitur ini.');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 0
      });
      const { latitude, longitude } = location.coords;

      setSelectedLocation({
        latitude: latitude,
        longitude: longitude,
        address: 'Mengambil alamat...'
      });

      webViewRef.current?.postMessage(JSON.stringify({
        action: 'addMarkerAtUserLocation',
        latitude: latitude,
        longitude: longitude
      }));

      setIsLoadingLocation(false);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
          {
            headers: { 'User-Agent': 'HadirinApp/1.0' },
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const address = data.display_name || 'Alamat tidak ditemukan';
          setSelectedLocation({
            latitude: latitude,
            longitude: longitude,
            address: address
          });
        }
      } catch (geoError) {
        setSelectedLocation({
          latitude: latitude,
          longitude: longitude,
          address: 'Alamat tidak ditemukan'
        });
      }
    } catch (error) {
      console.error('Error using my location:', error);
      Alert.alert('Error', 'Gagal mengambil lokasi Anda. Pastikan GPS aktif.');
      setIsLoadingLocation(false);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setSelectedLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address
      });
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onConfirm(selectedLocation);
      setSelectedLocation(null);
    }
  };

  const handleClose = () => {
    setSelectedLocation(null);
    setSearchQuery('');
    setSearchResults([]);
    setUserLocation(null);
    onClose();
  };

  const handleClearSelection = () => {
    setSelectedLocation(null);
    webViewRef.current?.postMessage('clearMarker');
  };

  const searchLocation = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=25&countrycodes=id`,
        {
          headers: {
            'User-Agent': 'HadirinApp/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Gagal mencari lokasi');
      }

      const data = await response.json();
      
      const formattedResults = data.map((item: any) => {
        const addr = item.address || {};
        let displayName = item.name || item.display_name.split(',')[0];
        
        let detailedAddress = '';
        const addressParts = [];
        
        if (addr.road) addressParts.push(addr.road);
        if (addr.house_number) addressParts.push(`No. ${addr.house_number}`);
        if (addr.suburb || addr.neighbourhood) addressParts.push(addr.suburb || addr.neighbourhood);
        if (addr.city || addr.town || addr.village) addressParts.push(addr.city || addr.town || addr.village);
        if (addr.state) addressParts.push(addr.state);
        
        detailedAddress = addressParts.join(', ');
        
        let category = item.type || item.class || 'place';
        let categoryLabel = getCategoryLabel(category, item.class);
        
        return {
          ...item,
          displayName,
          detailedAddress: detailedAddress || item.display_name,
          category,
          categoryLabel
        };
      });
      
      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const getCategoryLabel = (type: string, classType: string) => {
    const categoryMap: { [key: string]: string } = {
      'university': 'Universitas', 'school': 'Sekolah', 'college': 'Perguruan Tinggi',
      'hospital': 'Rumah Sakit', 'clinic': 'Klinik', 'restaurant': 'Restoran',
      'cafe': 'Kafe', 'mall': 'Mall', 'shop': 'Toko', 'supermarket': 'Supermarket',
      'bank': 'Bank', 'atm': 'ATM', 'hotel': 'Hotel', 'mosque': 'Masjid',
      'church': 'Gereja', 'temple': 'Pura', 'park': 'Taman', 'stadium': 'Stadion',
      'building': 'Gedung', 'office': 'Kantor', 'government': 'Pemerintahan',
      'library': 'Perpustakaan', 'museum': 'Museum', 'cinema': 'Bioskop',
      'fuel': 'SPBU', 'parking': 'Parkir', 'bus_station': 'Terminal Bus',
      'train_station': 'Stasiun Kereta', 'airport': 'Bandara', 'road': 'Jalan',
      'city': 'Kota', 'town': 'Kota', 'village': 'Desa'
    };
    return categoryMap[type] || categoryMap[classType] || 'Lokasi';
  };

  const getCategoryIcon = (category: string, classType: string) => {
    const iconMap: { [key: string]: string } = {
      'university': 'school', 'school': 'school', 'college': 'school',
      'hospital': 'medical', 'clinic': 'medical', 'restaurant': 'restaurant',
      'cafe': 'cafe', 'mall': 'cart', 'shop': 'storefront', 'supermarket': 'cart',
      'bank': 'card', 'atm': 'cash', 'hotel': 'bed', 'mosque': 'moon',
      'church': 'home', 'temple': 'home', 'park': 'leaf', 'stadium': 'football',
      'building': 'business', 'office': 'briefcase', 'government': 'shield',
      'library': 'library', 'museum': 'images', 'cinema': 'film',
      'fuel': 'water', 'parking': 'car', 'bus_station': 'bus',
      'train_station': 'train', 'airport': 'airplane', 'road': 'navigate',
      'city': 'business', 'town': 'business', 'village': 'home'
    };
    return iconMap[category] || iconMap[classType] || 'location';
  };

  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(text);
    }, 800);
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    const command = JSON.stringify({
      action: 'moveToLocation',
      latitude: lat,
      longitude: lng
    });
    webViewRef.current?.postMessage(command);

    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      address: result.display_name
    });

    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const htmlContent = getLeafletHTML(
    initialLocation?.latitude || -6.2088,
    initialLocation?.longitude || 106.8456
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#004643" />
          </TouchableOpacity>
          <Text style={styles.title}>Pilih Lokasi</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search-outline" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari alamat..."
              value={searchQuery}
              onChangeText={handleSearchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            )}
            {isSearching && (
              <ActivityIndicator size="small" color="#004643" style={{ marginLeft: 8 }} />
            )}
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => `${item.place_id}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => selectSearchResult(item)}
                  >
                    <View style={styles.searchResultIcon}>
                      <Ionicons 
                        name={getCategoryIcon(item.category, item.class) as any} 
                        size={22} 
                        color="#004643" 
                      />
                    </View>
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultName} numberOfLines={1}>
                        {item.displayName}
                      </Text>
                      <Text style={styles.searchResultAddress} numberOfLines={2}>
                        {item.detailedAddress}
                      </Text>
                      <Text style={styles.searchResultCategory}>
                        {item.categoryLabel}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.searchResultsList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              />
            </View>
          )}
        </View>

        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
        />

        <TouchableOpacity 
          style={styles.myLocationButton}
          onPress={useMyLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color="#004643" />
          ) : (
            <Ionicons name="navigate" size={24} color="#004643" />
          )}
        </TouchableOpacity>

        {selectedLocation && (
          <>
            <View style={styles.previewPanel}>
              <View style={styles.previewHeader}>
                <Ionicons name="location" size={28} color="#004643" />
                <Text style={styles.previewTitle}>Lokasi Terpilih</Text>
              </View>

              <Text style={styles.coordLabel}>Koordinat: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}</Text>
              <Text style={styles.coordSubtext}>{selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}</Text>
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Konfirmasi</Text>
            </TouchableOpacity>
          </>
        )}

        {!selectedLocation && (
          <View style={styles.hintPanel}>
            <Ionicons name="information-circle" size={20} color="#fff" />
            <Text style={styles.hintText}>Tap pada peta untuk memilih lokasi</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4
  },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: '#F5F5F5' },
  title: { fontSize: 18, fontWeight: '700', color: '#004643' },
  webview: { flex: 1 },
  previewPanel: {
    position: 'absolute', bottom: 80, left: 16, right: 16, backgroundColor: '#fff',
    borderRadius: 16, padding: 20, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  previewTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginLeft: 12 },
  coordLabel: { fontSize: 15, color: '#333', marginBottom: 4, fontWeight: '500' },
  coordSubtext: { fontSize: 13, color: '#999', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  confirmButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#004643',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hintPanel: {
    position: 'absolute', bottom: 30, left: 20, right: 20, flexDirection: 'row',
    alignItems: 'flex-start', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10
  },
  hintText: { fontSize: 12, color: '#fff', marginLeft: 8, fontWeight: '500', lineHeight: 18 },
  myLocationButton: {
    position: 'absolute', bottom: 240, right: 20, width: 50, height: 50,
    borderRadius: 25, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4
  },
  searchContainer: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 125 : 110, 
    left: 20, 
    right: 20, 
    zIndex: 10 
  },
  searchInputWrapper: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', marginLeft: 8, padding: 0 },
  searchResultsContainer: {
    backgroundColor: '#fff', 
    maxHeight: 350, 
    marginTop: 8,
    borderRadius: 12,
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 4
  },
  searchResultsList: { flexGrow: 0 },
  searchResultItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  searchResultIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F8F7',
    alignItems: 'center', justifyContent: 'center', marginRight: 12
  },
  searchResultContent: { flex: 1, marginLeft: 0 },
  searchResultName: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  searchResultAddress: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4 },
  searchResultCategory: {
    fontSize: 11, color: '#004643', fontWeight: '500', backgroundColor: '#F0F8F7',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start'
  }
});
