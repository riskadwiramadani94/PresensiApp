import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator, Dimensions, Animated, PanResponder } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { KelolaDinasAPI as DinasAPI, PegawaiAkunAPI, PengaturanAPI } from '../../constants/config';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader, CustomCalendar } from '../../components';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TambahDinasScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPegawaiModal, setShowPegawaiModal] = useState(false);
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [selectedPegawai, setSelectedPegawai] = useState<any[]>([]);
  const [tempSelectedPegawai, setTempSelectedPegawai] = useState<any[]>([]);
  const [mapRegion, setMapRegion] = useState({
    latitude: -6.2088,
    longitude: 106.8456,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  });
  const [markerPosition, setMarkerPosition] = useState<{latitude: number, longitude: number} | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showPegawaiDropdown, setShowPegawaiDropdown] = useState(false);
  const [pegawaiSearchQuery, setPegawaiSearchQuery] = useState('');
  const [filteredPegawai, setFilteredPegawai] = useState<any[]>([]);
  const [lokasiSearchQuery, setLokasiSearchQuery] = useState('');
  const [filteredLokasi, setFilteredLokasi] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [coordinateInput, setCoordinateInput] = useState('');
  const [isUpdatingFromInput, setIsUpdatingFromInput] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const [showJenisDinasDropdown, setShowJenisDinasDropdown] = useState(false);
  const translateYJenisDinas = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [showDateMulaiPicker, setShowDateMulaiPicker] = useState(false);
  const [showDateSelesaiPicker, setShowDateSelesaiPicker] = useState(false);
  const translateYDateMulai = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const translateYDateSelesai = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [showJamMulaiPicker, setShowJamMulaiPicker] = useState(false);
  const [showJamSelesaiPicker, setShowJamSelesaiPicker] = useState(false);
  const [useDefaultJam, setUseDefaultJam] = useState(true);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const totalSteps = 5;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: false
      });
      
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        if (file.size && file.size > 5 * 1024 * 1024) {
          Alert.alert('Error', 'Ukuran file maksimal 5MB');
          return;
        }
        setSelectedFile(file);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memilih file');
    }
  };

  const [formData, setFormData] = useState({
    namaKegiatan: '',
    nomorSpt: '',
    jenisDinas: 'lokal',
    tanggalMulai: '',
    tanggalSelesai: '',
    jamMulai: '',
    jamSelesai: '',
    deskripsi: '',
    pegawaiIds: [] as number[]
  });
  const [selectedLokasi, setSelectedLokasi] = useState<any[]>([]);
  const [tempSelectedLokasi, setTempSelectedLokasi] = useState<any[]>([]);
  const [availableLokasi, setAvailableLokasi] = useState<any[]>([]);
  const [showLokasiModal, setShowLokasiModal] = useState(false);
  const translateYLokasi = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const translateYPegawai = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      });
    } catch (error) {
      Alert.alert('Error', 'Could not fetch location');
    }
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Cek apakah input adalah koordinat
    const coordPattern = /^-?\d+\.?\d*[,\s]+-?\d+\.?\d*$/;
    if (coordPattern.test(query.trim())) {
      const coords = query.trim().split(/[,\s]+/);
      if (coords.length === 2) {
        const latitude = parseFloat(coords[0]);
        const longitude = parseFloat(coords[1]);
        
        if (!isNaN(latitude) && !isNaN(longitude) && 
            latitude >= -90 && latitude <= 90 && 
            longitude >= -180 && longitude <= 180) {
          try {
            const address = await reverseGeocode(latitude, longitude);
            setSearchResults([{
              latitude,
              longitude,
              address: `📍 ${address}`,
              id: `coord-${latitude}-${longitude}`
            }]);
            return;
          } catch (error) {
            console.error('Coordinate error:', error);
          }
        }
      }
    }

    // Gunakan Nominatim OpenStreetMap (GRATIS, tidak perlu API key)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=id`,
        {
          headers: {
            'User-Agent': 'HadirinApp/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const formattedResults = data.map((item: any) => ({
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          address: `📍 ${item.display_name}`,
          id: item.place_id
        }));
        setSearchResults(formattedResults);
        return;
      }
    } catch (error) {
      console.error('Nominatim error:', error);
    }

    // Fallback ke Location.geocodeAsync
    try {
      const results = await Location.geocodeAsync(query);
      const formattedResults = await Promise.all(
        results.map(async (result) => {
          const address = await reverseGeocode(result.latitude, result.longitude);
          return {
            ...result,
            address: `📍 ${address}`,
            id: `${result.latitude}-${result.longitude}`
          };
        })
      );
      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const selectSearchResult = (result: any) => {
    setMarkerPosition({ latitude: result.latitude, longitude: result.longitude });
    setMapRegion({
      latitude: result.latitude,
      longitude: result.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const address = result[0];
        const fullAddress = `${address.street || ''} ${address.name || ''}, ${address.district || ''}, ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim();
        return fullAddress;
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
    return 'Alamat tidak ditemukan';
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });
  };

  const confirmLocation = async () => {
    if (!markerPosition) {
      Alert.alert('Error', 'Pilih lokasi terlebih dahulu');
      return;
    }

    try {
      const address = await reverseGeocode(markerPosition.latitude, markerPosition.longitude);
      setShowMapModal(false);
      setMarkerPosition(null);
    } catch (error) {
      Alert.alert('Error', 'Gagal mendapatkan alamat');
    }
  };

  const openMapPicker = () => {
    setShowMapModal(true);
  };

  useEffect(() => {
    fetchPegawai();
    fetchAvailableLokasi();
    loadDraftData();
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraftData();
    }, 30000);
    return () => clearInterval(interval);
  }, [formData, selectedPegawai, selectedLokasi]);

  // Real-time validation
  const validateField = (field: string, value: any) => {
    const errors = { ...validationErrors };
    
    switch (field) {
      case 'namaKegiatan':
        if (!value?.trim()) {
          errors.namaKegiatan = 'Nama kegiatan wajib diisi';
        } else {
          delete errors.namaKegiatan;
        }
        break;
      case 'nomorSpt':
        if (!value?.trim()) {
          errors.nomorSpt = 'Nomor SPT wajib diisi';
        } else {
          delete errors.nomorSpt;
        }
        break;
      case 'tanggalMulai':
        if (!value) {
          errors.tanggalMulai = 'Tanggal mulai wajib diisi';
        } else if (!isValidDate(value)) {
          errors.tanggalMulai = 'Format tanggal tidak valid';
        } else {
          delete errors.tanggalMulai;
        }
        break;
      case 'tanggalSelesai':
        if (!value) {
          errors.tanggalSelesai = 'Tanggal selesai wajib diisi';
        } else if (!isValidDate(value)) {
          errors.tanggalSelesai = 'Format tanggal tidak valid';
        } else if (formData.tanggalMulai && new Date(convertDateFormat(value)) < new Date(convertDateFormat(formData.tanggalMulai))) {
          errors.tanggalSelesai = 'Tanggal selesai harus setelah tanggal mulai';
        } else {
          delete errors.tanggalSelesai;
        }
        break;
    }
    
    setValidationErrors(errors);
  };

  const isValidDate = (dateStr: string) => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateStr)) return false;
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
  };

  const isValidTime = (timeStr: string) => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(timeStr);
  };

  // Auto-save functions
  const saveDraftData = async () => {
    try {
      const draftData = {
        formData,
        selectedPegawai,
        selectedLokasi,
        selectedFile,
        timestamp: new Date().toISOString()
      };
      await AsyncStorage.setItem('dinas_draft', JSON.stringify(draftData));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const loadDraftData = async () => {
    try {
      const draftStr = await AsyncStorage.getItem('dinas_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        const draftAge = new Date().getTime() - new Date(draft.timestamp).getTime();
        
        // Only load draft if it's less than 24 hours old
        if (draftAge < 24 * 60 * 60 * 1000) {
          Alert.alert(
            'Draft Ditemukan',
            'Ditemukan data draft yang belum disimpan. Muat data draft?',
            [
              { text: 'Tidak', onPress: () => clearDraftData() },
              { 
                text: 'Ya', 
                onPress: () => {
                  setFormData(draft.formData || formData);
                  setSelectedPegawai(draft.selectedPegawai || []);
                  setSelectedLokasi(draft.selectedLokasi || []);
                  setSelectedFile(draft.selectedFile || null);
                }
              }
            ]
          );
        } else {
          clearDraftData();
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraftData = async () => {
    try {
      await AsyncStorage.removeItem('dinas_draft');
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const fetchAvailableLokasi = async () => {
    try {
      const response = await PengaturanAPI.getLokasiKantor();
      if (response.success && response.data) {
        setAvailableLokasi(response.data);
        setFilteredLokasi(response.data);
      }
    } catch (error) {
      console.error('Error fetching lokasi:', error);
      // Fallback data
      const fallbackData = [
        { id: 1, nama_lokasi: 'Kantor Pusat', jenis_lokasi: 'tetap' },
        { id: 2, nama_lokasi: 'Kantor Cabang Bandung', jenis_lokasi: 'dinas' },
        { id: 3, nama_lokasi: 'Hotel Santika Jakarta', jenis_lokasi: 'dinas' }
      ];
      setAvailableLokasi(fallbackData);
      setFilteredLokasi(fallbackData);
    }
  };

  const fetchPegawai = async () => {
    try {
      const response = await PegawaiAkunAPI.getDataPegawai();
      console.log('Pegawai API Response:', response); // Debug log
      if (response && response.data) {
        console.log('Pegawai data:', response.data); // Debug log
        setPegawaiList(response.data);
        setFilteredPegawai(response.data);
      }
    } catch (error) {
      console.error('Error fetching pegawai:', error);
      setPegawaiList([]);
      setFilteredPegawai([]);
    }
  };

  const filterPegawai = (query: string) => {
    setPegawaiSearchQuery(query);
    if (!query.trim()) {
      setFilteredPegawai(pegawaiList);
      return;
    }
    
    const filtered = pegawaiList.filter((pegawai: any) => 
      pegawai.nama_lengkap?.toLowerCase().includes(query.toLowerCase()) ||
      pegawai.nip?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredPegawai(filtered);
  };

  const filterLokasi = (query: string) => {
    setLokasiSearchQuery(query);
    if (!query.trim()) {
      setFilteredLokasi(availableLokasi);
      return;
    }
    
    const filtered = availableLokasi.filter((lokasi: any) => 
      lokasi.nama_lokasi?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredLokasi(filtered);
  };

  const togglePegawai = (pegawai: any) => {
    const pegawaiId = pegawai.id_user || pegawai.id_pegawai || pegawai.id;
    const isSelected = tempSelectedPegawai.find((p: any) => {
      const selectedId = p.id_user || p.id_pegawai || p.id;
      return selectedId === pegawaiId;
    });
    
    if (isSelected) {
      setTempSelectedPegawai(tempSelectedPegawai.filter((p: any) => {
        const selectedId = p.id_user || p.id_pegawai || p.id;
        return selectedId !== pegawaiId;
      }));
    } else {
      setTempSelectedPegawai([...tempSelectedPegawai, pegawai]);
    }
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateMulaiSelect = (date: Date) => {
    const formattedDate = formatDate(date);
    setFormData({...formData, tanggalMulai: formattedDate});
    validateField('tanggalMulai', formattedDate);
    closeDateMulaiPicker();
  };

  const handleDateSelesaiSelect = (date: Date) => {
    const formattedDate = formatDate(date);
    setFormData({...formData, tanggalSelesai: formattedDate});
    validateField('tanggalSelesai', formattedDate);
    closeDateSelesaiPicker();
  };

  const openDateMulaiPicker = () => {
    setShowDateMulaiPicker(true);
    Animated.spring(translateYDateMulai, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const closeDateMulaiPicker = () => {
    Animated.timing(translateYDateMulai, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true
    }).start(() => setShowDateMulaiPicker(false));
  };

  const openDateSelesaiPicker = () => {
    setShowDateSelesaiPicker(true);
    Animated.spring(translateYDateSelesai, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const closeDateSelesaiPicker = () => {
    Animated.timing(translateYDateSelesai, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true
    }).start(() => setShowDateSelesaiPicker(false));
  };

  const panResponderDateMulai = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateYDateMulai.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeDateMulaiPicker();
      } else {
        Animated.spring(translateYDateMulai, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    }
  });

  const panResponderDateSelesai = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateYDateSelesai.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeDateSelesaiPicker();
      } else {
        Animated.spring(translateYDateSelesai, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    }
  });

  const handleJamMulaiSelect = (time: Date) => {
    const formattedTime = formatTime(time);
    setFormData({...formData, jamMulai: formattedTime});
    setShowJamMulaiPicker(false);
  };

  const handleJamSelesaiSelect = (time: Date) => {
    const formattedTime = formatTime(time);
    setFormData({...formData, jamSelesai: formattedTime});
    setShowJamSelesaiPicker(false);
  };



  const formatTime = (time: Date) => {
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTanggal = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 5) {
      return `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}/${cleaned.slice(4,8)}`;
    } else if (cleaned.length >= 3) {
      return `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}`;
    }
    return cleaned;
  };

  const formatJam = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0,2)}:${cleaned.slice(2,4)}`;
    }
    return cleaned;
  };

  const convertDateFormat = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; // Convert DD/MM/YYYY to YYYY-MM-DD
    }
    return dateStr;
  };

  const handleSubmit = async () => {
    // Validate all required fields first
    const errors: {[key: string]: string} = {};
    
    if (!formData.namaKegiatan.trim()) errors.namaKegiatan = 'Nama kegiatan wajib diisi';
    if (!formData.nomorSpt.trim()) errors.nomorSpt = 'Nomor SPT wajib diisi';
    if (!formData.tanggalMulai) errors.tanggalMulai = 'Tanggal mulai wajib diisi';
    if (!formData.tanggalSelesai) errors.tanggalSelesai = 'Tanggal selesai wajib diisi';
    if (selectedLokasi.length === 0) errors.lokasi = 'Minimal pilih 1 lokasi untuk dinas';
    if (selectedPegawai.length === 0) errors.pegawai = 'Minimal pilih 1 pegawai untuk dinas';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      Alert.alert('Data Belum Lengkap', 'Mohon lengkapi field yang wajib diisi (bertanda *)');
      return;
    }
    
    // Show confirmation modal if all data is valid
    setShowConfirmModal(true);
    openBottomSheet();
  };

  const openBottomSheet = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setShowConfirmModal(false);
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
          useNativeDriver: true
        }).start();
      }
    }
  });

  const panResponderJenisDinas = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateYJenisDinas.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        Animated.timing(translateYJenisDinas, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true
        }).start(() => setShowJenisDinasDropdown(false));
      } else {
        Animated.spring(translateYJenisDinas, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    }
  });

  const panResponderLokasi = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateYLokasi.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        Animated.timing(translateYLokasi, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true
        }).start(() => setShowLokasiModal(false));
      } else {
        Animated.spring(translateYLokasi, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    }
  });

  const panResponderPegawai = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateYPegawai.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        Animated.timing(translateYPegawai, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true
        }).start(() => setShowPegawaiModal(false));
      } else {
        Animated.spring(translateYPegawai, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    }
  });

  const confirmSubmit = async () => {
    // Validate all fields
    const errors: {[key: string]: string} = {};
    
    if (!formData.namaKegiatan.trim()) errors.namaKegiatan = 'Nama kegiatan wajib diisi';
    if (!formData.nomorSpt.trim()) errors.nomorSpt = 'Nomor SPT wajib diisi';
    if (!formData.tanggalMulai) errors.tanggalMulai = 'Tanggal mulai wajib diisi';
    if (!formData.tanggalSelesai) errors.tanggalSelesai = 'Tanggal selesai wajib diisi';
    if (selectedLokasi.length === 0) errors.lokasi = 'Minimal pilih 1 lokasi untuk dinas';
    if (selectedPegawai.length === 0) errors.pegawai = 'Minimal pilih 1 pegawai untuk dinas';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShowConfirmModal(false);
      Alert.alert('Error', 'Mohon lengkapi field yang wajib diisi');
      return;
    }

    setLoading(true);
    closeBottomSheet();
    
    try {
      // Gunakan FormData untuk kirim file + data
      const formDataToSend = new FormData();
      
      // Append semua field text
      formDataToSend.append('nama_kegiatan', formData.namaKegiatan.trim());
      formDataToSend.append('nomor_spt', formData.nomorSpt.trim());
      formDataToSend.append('jenis_dinas', formData.jenisDinas);
      formDataToSend.append('tanggal_mulai', convertDateFormat(formData.tanggalMulai));
      formDataToSend.append('tanggal_selesai', convertDateFormat(formData.tanggalSelesai));
      formDataToSend.append('jam_mulai', useDefaultJam ? '' : formData.jamMulai);
      formDataToSend.append('jam_selesai', useDefaultJam ? '' : formData.jamSelesai);
      formDataToSend.append('deskripsi', formData.deskripsi?.trim() || '');
      
      // Append array sebagai JSON string
      const validPegawaiIds = formData.pegawaiIds.filter(id => id != null && !isNaN(id) && id > 0);
      formDataToSend.append('pegawai_ids', JSON.stringify(validPegawaiIds));
      formDataToSend.append('lokasi_ids', JSON.stringify(selectedLokasi.map(lokasi => lokasi.id)));
      
      // Append file jika ada
      if (selectedFile) {
        formDataToSend.append('dokumen_spt', {
          uri: selectedFile.uri,
          type: selectedFile.mimeType || 'application/pdf',
          name: selectedFile.name
        } as any);
      }
      
      const response = await DinasAPI.createDinas(formDataToSend);
      
      if (response.success) {
        await clearDraftData();
        Alert.alert('Sukses', 'Data dinas berhasil ditambahkan!', [
          { text: 'OK', onPress: () => {
              setFormData({
                namaKegiatan: '',
                nomorSpt: '',
                jenisDinas: 'lokal',
                tanggalMulai: '',
                tanggalSelesai: '',
                jamMulai: '',
                jamSelesai: '',
                deskripsi: '',
                pegawaiIds: []
              });
              setUseDefaultJam(true);
              setSelectedPegawai([]);
              setSelectedLokasi([]);
              setSelectedFile(null);
              router.back();
            }
          }
        ]);
      } else {
        Alert.alert('Error', response.message || 'Gagal menambahkan data dinas');
      }
    } catch (error) {
      Alert.alert('Koneksi Error', 'Pastikan XAMPP nyala dan HP satu Wi-Fi dengan laptop.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      <AppHeader 
        title="Tambah Dinas Baru"
        showBack={true}
        fallbackRoute="/kelola-dinas"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Informasi Dasar */}
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#004643" />
            <Text style={styles.sectionTitle}>Informasi Dasar Dinas</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.formContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Kegiatan *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.namaKegiatan && styles.inputError]}
                  placeholder="Contoh: Rapat Koordinasi Regional"
                  value={formData.namaKegiatan}
                  onChangeText={(text) => {
                    setFormData({...formData, namaKegiatan: text});
                    validateField('namaKegiatan', text);
                  }}
                />
                {validationErrors.namaKegiatan && (
                  <Text style={styles.errorText}>{validationErrors.namaKegiatan}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nomor SPT *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.nomorSpt && styles.inputError]}
                  placeholder="Contoh: SPT/001/2024"
                  value={formData.nomorSpt}
                  onChangeText={(text) => {
                    setFormData({...formData, nomorSpt: text});
                    validateField('nomorSpt', text);
                  }}
                />
                {validationErrors.nomorSpt && (
                  <Text style={styles.errorText}>{validationErrors.nomorSpt}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Jenis Dinas *</Text>
                <TouchableOpacity 
                  style={styles.dropdownBtn}
                  onPress={() => {
                    setShowJenisDinasDropdown(true);
                    Animated.spring(translateYJenisDinas, {
                      toValue: 0,
                      useNativeDriver: true,
                      tension: 65,
                      friction: 11
                    }).start();
                  }}
                >
                  <Text style={styles.dropdownBtnText}>
                    {formData.jenisDinas === 'lokal' ? 'Dinas Lokal' : 
                     formData.jenisDinas === 'luar_kota' ? 'Dinas Luar Kota' : 'Dinas Luar Negeri'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Deskripsi</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Deskripsi kegiatan dinas..."
                  value={formData.deskripsi}
                  onChangeText={(text) => setFormData({...formData, deskripsi: text})}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

          {/* Waktu & Jadwal */}
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color="#004643" />
            <Text style={styles.sectionTitle}>Waktu & Jadwal Dinas</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.formContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tanggal Mulai *</Text>
                <TouchableOpacity onPress={openDateMulaiPicker} style={styles.datePickerButton}>
                  <Text style={[styles.datePickerText, !formData.tanggalMulai && styles.datePickerPlaceholder]}>
                    {formData.tanggalMulai || 'DD/MM/YYYY'}
                  </Text>
                  <View style={styles.calendarIconButton}>
                    <Ionicons name="calendar" size={20} color="#004643" />
                  </View>
                </TouchableOpacity>
                {validationErrors.tanggalMulai && (
                  <Text style={styles.errorText}>{validationErrors.tanggalMulai}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tanggal Selesai *</Text>
                <TouchableOpacity onPress={openDateSelesaiPicker} style={styles.datePickerButton}>
                  <Text style={[styles.datePickerText, !formData.tanggalSelesai && styles.datePickerPlaceholder]}>
                    {formData.tanggalSelesai || 'DD/MM/YYYY'}
                  </Text>
                  <View style={styles.calendarIconButton}>
                    <Ionicons name="calendar" size={20} color="#004643" />
                  </View>
                </TouchableOpacity>
                {validationErrors.tanggalSelesai && (
                  <Text style={styles.errorText}>{validationErrors.tanggalSelesai}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pengaturan Jam Kerja</Text>
                <View style={styles.jamKerjaContainer}>
                  <TouchableOpacity 
                    style={[styles.jamKerjaBtn, useDefaultJam && styles.jamKerjaBtnActive]}
                    onPress={() => {
                      setUseDefaultJam(true);
                      setFormData({...formData, jamMulai: '', jamSelesai: ''});
                    }}
                  >
                    <Text style={[styles.jamKerjaText, useDefaultJam && styles.jamKerjaTextActive]}>
                      Jam Kantor Default
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.jamKerjaBtn, !useDefaultJam && styles.jamKerjaBtnActive]}
                    onPress={() => setUseDefaultJam(false)}
                  >
                    <Text style={[styles.jamKerjaText, !useDefaultJam && styles.jamKerjaTextActive]}>
                      Atur Jam Khusus
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {!useDefaultJam && (
                  <View style={styles.jamKhususContainer}>
                    <View style={styles.jamRow}>
                      <View style={styles.jamInputGroup}>
                        <Text style={styles.jamLabel}>Jam Mulai</Text>
                        <TouchableOpacity onPress={() => setShowJamMulaiPicker(true)} style={styles.jamPickerButton}>
                          <Text style={[styles.jamPickerText, !formData.jamMulai && styles.jamPickerPlaceholder]}>
                            {formData.jamMulai || '08:00'}
                          </Text>
                          <Ionicons name="time" size={18} color="#004643" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.jamInputGroup}>
                        <Text style={styles.jamLabel}>Jam Selesai</Text>
                        <TouchableOpacity onPress={() => setShowJamSelesaiPicker(true)} style={styles.jamPickerButton}>
                          <Text style={[styles.jamPickerText, !formData.jamSelesai && styles.jamPickerPlaceholder]}>
                            {formData.jamSelesai || '17:00'}
                          </Text>
                          <Ionicons name="time" size={18} color="#004643" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.infoBox}>
                      <Ionicons name="information-circle" size={14} color="#004643" />
                      <Text style={styles.infoText}>Jam ini berlaku untuk semua hari dinas</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

          {/* Lokasi & Pegawai */}
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#004643" />
            <Text style={styles.sectionTitle}>Lokasi & Pegawai Dinas</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.formContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Lokasi Dinas *</Text>
                <TouchableOpacity 
                  style={styles.dropdownBtn}
                  onPress={() => {
                    setTempSelectedLokasi([...selectedLokasi]);
                    setShowLokasiModal(true);
                    Animated.spring(translateYLokasi, {
                      toValue: 0,
                      useNativeDriver: true,
                      tension: 65,
                      friction: 11
                    }).start();
                  }}
                >
                  <Text style={styles.dropdownBtnText}>
                    {selectedLokasi.length > 0 
                      ? `${selectedLokasi.length} lokasi dipilih` 
                      : 'Pilih Lokasi Dinas'
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
                
                {validationErrors.lokasi && (
                  <Text style={styles.errorText}>{validationErrors.lokasi}</Text>
                )}
                
                {selectedLokasi.length > 0 && (
                  <View style={styles.selectedContainer}>
                    {selectedLokasi.map((lokasi) => (
                      <View key={lokasi.id} style={styles.selectedChip}>
                        <Text style={styles.selectedChipText}>{lokasi.nama_lokasi}</Text>
                        <TouchableOpacity 
                          onPress={() => {
                            const updated = selectedLokasi.filter(l => l.id !== lokasi.id);
                            setSelectedLokasi(updated);
                          }}
                        >
                          <Ionicons name="close-circle" size={16} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pegawai Dinas * ({selectedPegawai.length} dipilih)</Text>
                <TouchableOpacity 
                  style={styles.dropdownBtn}
                  onPress={() => {
                    setTempSelectedPegawai([...selectedPegawai]);
                    setShowPegawaiModal(true);
                    Animated.spring(translateYPegawai, {
                      toValue: 0,
                      useNativeDriver: true,
                      tension: 65,
                      friction: 11
                    }).start();
                  }}
                >
                  <Text style={styles.dropdownBtnText}>
                    {selectedPegawai.length > 0 
                      ? `${selectedPegawai.length} pegawai dipilih` 
                      : 'Pilih Pegawai Dinas'
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
                
                {validationErrors.pegawai && (
                  <Text style={styles.errorText}>{validationErrors.pegawai}</Text>
                )}
                
                {selectedPegawai.length > 0 && (
                  <View style={styles.selectedContainer}>
                    {selectedPegawai.map((pegawai: any, index) => (
                      <View key={index} style={styles.selectedChip}>
                        <Text style={styles.selectedChipText}>{pegawai.nama_lengkap}</Text>
                        <TouchableOpacity onPress={() => togglePegawai(pegawai)}>
                          <Ionicons name="close-circle" size={16} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Upload Dokumen SPT</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                  <Ionicons name="document-attach-outline" size={20} color="#004643" />
                  <View style={styles.uploadContent}>
                    <Text style={styles.uploadText}>
                      {selectedFile ? selectedFile.name : 'Pilih File SPT'}
                    </Text>
                    <Text style={styles.uploadSubtext}>PDF, DOC, JPG (Max 5MB)</Text>
                  </View>
                  {selectedFile && (
                    <TouchableOpacity 
                      onPress={() => setSelectedFile(null)}
                      style={styles.removeFileBtn}
                    >
                      <Ionicons name="close-circle" size={20} color="#F44336" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            </View>

        </ScrollView>

      {/* Calendar Modals - Bottom Sheet */}
      <Modal visible={showDateMulaiPicker} transparent animationType="none" statusBarTranslucent={true} onRequestClose={closeDateMulaiPicker}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeDateMulaiPicker} />
          <Animated.View style={[styles.calendarBottomSheet, { transform: [{ translateY: translateYDateMulai }] }]}>
            <View {...panResponderDateMulai.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            <View style={styles.calendarSheetContent}>
              <Text style={styles.calendarSheetTitle}>Pilih Tanggal Mulai</Text>
              <CustomCalendar 
                onDatePress={(date) => handleDateMulaiSelect(date)}
                weekendDays={[0, 6]}
                showWeekends={false}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showDateSelesaiPicker} transparent animationType="none" statusBarTranslucent={true} onRequestClose={closeDateSelesaiPicker}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeDateSelesaiPicker} />
          <Animated.View style={[styles.calendarBottomSheet, { transform: [{ translateY: translateYDateSelesai }] }]}>
            <View {...panResponderDateSelesai.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            <View style={styles.calendarSheetContent}>
              <Text style={styles.calendarSheetTitle}>Pilih Tanggal Selesai</Text>
              <CustomCalendar 
                onDatePress={(date) => handleDateSelesaiSelect(date)}
                weekendDays={[0, 6]}
                showWeekends={false}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={showJamMulaiPicker}
        mode="time"
        onConfirm={handleJamMulaiSelect}
        onCancel={() => setShowJamMulaiPicker(false)}
        is24Hour={true}
        display="default"
      />

      <DateTimePickerModal
        isVisible={showJamSelesaiPicker}
        mode="time"
        onConfirm={handleJamSelesaiSelect}
        onCancel={() => setShowJamSelesaiPicker(false)}
        is24Hour={true}
        display="default"
      />

      {/* Jenis Dinas Modal - Bottom Sheet */}
      <Modal
        visible={showJenisDinasDropdown}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          Animated.timing(translateYJenisDinas, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true
          }).start(() => setShowJenisDinasDropdown(false));
        }}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity 
            style={styles.bottomSheetBackdrop} 
            activeOpacity={1}
            onPress={() => {
              Animated.timing(translateYJenisDinas, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true
              }).start(() => setShowJenisDinasDropdown(false));
            }}
          />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: translateYJenisDinas }] }]}>
            <View {...panResponderJenisDinas.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Pilih Jenis Dinas</Text>
            </View>
            
            <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
              {[
                { key: 'lokal', label: 'Dinas Lokal', icon: 'business' },
                { key: 'luar_kota', label: 'Dinas Luar Kota', icon: 'car' },
                { key: 'luar_negeri', label: 'Dinas Luar Negeri', icon: 'airplane' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.bottomSheetItem,
                    formData.jenisDinas === item.key && styles.bottomSheetItemActive
                  ]}
                  onPress={() => {
                    setFormData({...formData, jenisDinas: item.key});
                    Animated.timing(translateYJenisDinas, {
                      toValue: SCREEN_HEIGHT,
                      duration: 250,
                      useNativeDriver: true
                    }).start(() => setShowJenisDinasDropdown(false));
                  }}
                >
                  <View style={styles.bottomSheetItemLeft}>
                    <View style={[
                      styles.bottomSheetIcon,
                      formData.jenisDinas === item.key && styles.bottomSheetIconActive
                    ]}>
                      <Ionicons 
                        name={item.icon as any} 
                        size={20} 
                        color={formData.jenisDinas === item.key ? '#fff' : '#004643'} 
                      />
                    </View>
                    <Text style={[
                      styles.bottomSheetItemText,
                      formData.jenisDinas === item.key && styles.bottomSheetItemTextActive
                    ]}>
                      {item.label}
                    </Text>
                  </View>
                  {formData.jenisDinas === item.key && (
                    <Ionicons name="checkmark-circle" size={24} color="#004643" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Lokasi Modal - Bottom Sheet */}
      <Modal
        visible={showLokasiModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          Animated.timing(translateYLokasi, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true
          }).start(() => setShowLokasiModal(false));
        }}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity 
            style={styles.bottomSheetBackdrop} 
            activeOpacity={1}
            onPress={() => {
              Animated.timing(translateYLokasi, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true
              }).start(() => setShowLokasiModal(false));
            }}
          />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: translateYLokasi }] }]}>
            <View {...panResponderLokasi.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Pilih Lokasi Dinas</Text>
            </View>
            
            <View style={styles.searchWrapper}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search-outline" size={18} color="#666" />
                <TextInput
                  style={styles.searchInputField}
                  placeholder="Cari nama lokasi..."
                  value={lokasiSearchQuery}
                  onChangeText={filterLokasi}
                  placeholderTextColor="#999"
                />
                {lokasiSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => {
                    setLokasiSearchQuery('');
                    setFilteredLokasi(availableLokasi);
                  }}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
              {filteredLokasi.map((lokasi) => {
                const isSelected = tempSelectedLokasi.find(l => l.id === lokasi.id);
                return (
                  <TouchableOpacity
                    key={lokasi.id}
                    style={[
                      styles.bottomSheetItem,
                      isSelected && styles.bottomSheetItemActive
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setTempSelectedLokasi(tempSelectedLokasi.filter(l => l.id !== lokasi.id));
                      } else {
                        setTempSelectedLokasi([...tempSelectedLokasi, lokasi]);
                      }
                    }}
                  >
                    <View style={styles.bottomSheetItemLeft}>
                      <View style={[
                        styles.bottomSheetIcon,
                        isSelected && styles.bottomSheetIconActive
                      ]}>
                        <Ionicons 
                          name="location" 
                          size={20} 
                          color={isSelected ? '#fff' : '#004643'} 
                        />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[
                          styles.bottomSheetItemText,
                          isSelected && styles.bottomSheetItemTextActive
                        ]}>
                          {lokasi.nama_lokasi}
                        </Text>
                        <Text style={styles.itemSubtext}>
                          {lokasi.jenis_lokasi === 'tetap' ? 'Kantor Tetap' : 'Lokasi Dinas'}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#004643" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  Animated.timing(translateYLokasi, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true
                  }).start(() => setShowLokasiModal(false));
                }}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmBtn}
                onPress={() => {
                  setSelectedLokasi(tempSelectedLokasi);
                  Animated.timing(translateYLokasi, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true
                  }).start(() => setShowLokasiModal(false));
                }}
              >
                <Text style={styles.modalConfirmText}>Pilih ({tempSelectedLokasi.length})</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Pegawai Modal - Bottom Sheet */}
      <Modal
        visible={showPegawaiModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          Animated.timing(translateYPegawai, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true
          }).start(() => setShowPegawaiModal(false));
        }}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity 
            style={styles.bottomSheetBackdrop} 
            activeOpacity={1}
            onPress={() => {
              Animated.timing(translateYPegawai, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true
              }).start(() => setShowPegawaiModal(false));
            }}
          />
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: translateYPegawai }] }]}>
            <View {...panResponderPegawai.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Pilih Pegawai Dinas</Text>
            </View>
            
            <View style={styles.searchWrapper}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search-outline" size={18} color="#666" />
                <TextInput
                  style={styles.searchInputField}
                  placeholder="Cari nama atau NIP pegawai..."
                  value={pegawaiSearchQuery}
                  onChangeText={filterPegawai}
                  placeholderTextColor="#999"
                />
                {pegawaiSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => {
                    setPegawaiSearchQuery('');
                    setFilteredPegawai(pegawaiList);
                  }}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
              {filteredPegawai.map((pegawai: any, index) => {
                const pegawaiId = pegawai.id_user || pegawai.id_pegawai || pegawai.id;
                const isSelected = tempSelectedPegawai.find((p: any) => {
                  const selectedId = p.id_user || p.id_pegawai || p.id;
                  return selectedId === pegawaiId;
                });
                return (
                  <TouchableOpacity
                    key={pegawaiId || index}
                    style={[
                      styles.bottomSheetItem,
                      isSelected && styles.bottomSheetItemActive
                    ]}
                    onPress={() => togglePegawai(pegawai)}
                  >
                    <View style={styles.bottomSheetItemLeft}>
                      <View style={[
                        styles.bottomSheetIcon,
                        isSelected && styles.bottomSheetIconActive
                      ]}>
                        <Ionicons 
                          name="person" 
                          size={20} 
                          color={isSelected ? '#fff' : '#004643'} 
                        />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[
                          styles.bottomSheetItemText,
                          isSelected && styles.bottomSheetItemTextActive
                        ]}>
                          {pegawai.nama_lengkap}
                        </Text>
                        <Text style={styles.itemSubtext}>NIP: {pegawai.nip}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#004643" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  Animated.timing(translateYPegawai, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true
                  }).start(() => setShowPegawaiModal(false));
                }}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmBtn}
                onPress={() => {
                  setSelectedPegawai(tempSelectedPegawai);
                  const validIds = tempSelectedPegawai
                    .map((p: any) => p.id_user || p.id_pegawai || p.id)
                    .filter(id => id != null && !isNaN(parseInt(id)))
                    .map(id => parseInt(id));
                  setFormData({...formData, pegawaiIds: validIds});
                  Animated.timing(translateYPegawai, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true
                  }).start(() => setShowPegawaiModal(false));
                }}
              >
                <Text style={styles.modalConfirmText}>Pilih ({tempSelectedPegawai.length})</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Button Footer - Fixed di bawah seperti header */}
      <View style={styles.buttonFooter}>
        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <Ionicons name="hourglass-outline" size={20} color="#fff" />
              <Text style={styles.submitText}>Menyimpan...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.submitText}>Simpan Data Dinas</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal - Bottom Sheet */}
      <Modal 
        visible={showConfirmModal} 
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeBottomSheet} />
          <Animated.View style={[styles.bottomSheetConfirm, { transform: [{ translateY }] }]}>
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            <View style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>Konfirmasi Data Dinas</Text>
              
              <ScrollView style={styles.confirmScrollView} showsVerticalScrollIndicator={false}>
                {/* Informasi Dasar */}
                <View style={styles.sectionHeaderConfirm}>
                  <Ionicons name="information-circle-outline" size={18} color="#004643" />
                  <Text style={styles.sectionTitleConfirm}>Informasi Dasar Dinas</Text>
                </View>
                <View style={styles.sectionDivider} />

                <View style={styles.confirmRow}>
                  <View style={styles.confirmItemHalf}>
                    <Text style={styles.confirmLabel}>Nama Kegiatan</Text>
                    <Text style={styles.confirmValue}>{formData.namaKegiatan}</Text>
                  </View>
                  <View style={styles.confirmItemHalf}>
                    <Text style={styles.confirmLabel}>Nomor SPT</Text>
                    <Text style={styles.confirmValue}>{formData.nomorSpt}</Text>
                  </View>
                </View>

                <View style={styles.confirmRow}>
                  <View style={styles.confirmItemHalf}>
                    <Text style={styles.confirmLabel}>Jenis Dinas</Text>
                    <Text style={styles.confirmValue}>
                      {formData.jenisDinas === 'lokal' ? 'Dinas Lokal' : 
                       formData.jenisDinas === 'luar_kota' ? 'Dinas Luar Kota' : 'Dinas Luar Negeri'}
                    </Text>
                  </View>
                </View>

                {formData.deskripsi && (
                  <View style={styles.confirmItemFull}>
                    <Text style={styles.confirmLabel}>Deskripsi</Text>
                    <Text style={styles.confirmValue}>{formData.deskripsi}</Text>
                  </View>
                )}

                {/* Waktu & Jadwal */}
                <View style={styles.sectionHeaderConfirm}>
                  <Ionicons name="time-outline" size={18} color="#004643" />
                  <Text style={styles.sectionTitleConfirm}>Waktu & Jadwal Dinas</Text>
                </View>
                <View style={styles.sectionDivider} />

                <View style={styles.confirmRow}>
                  <View style={styles.confirmItemHalf}>
                    <Text style={styles.confirmLabel}>Tanggal Mulai</Text>
                    <Text style={styles.confirmValue}>{formData.tanggalMulai}</Text>
                  </View>
                  <View style={styles.confirmItemHalf}>
                    <Text style={styles.confirmLabel}>Tanggal Selesai</Text>
                    <Text style={styles.confirmValue}>{formData.tanggalSelesai}</Text>
                  </View>
                </View>

                {!useDefaultJam && formData.jamMulai && formData.jamSelesai && (
                  <View style={styles.confirmRow}>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Jam Mulai</Text>
                      <Text style={styles.confirmValue}>{formData.jamMulai}</Text>
                    </View>
                    <View style={styles.confirmItemHalf}>
                      <Text style={styles.confirmLabel}>Jam Selesai</Text>
                      <Text style={styles.confirmValue}>{formData.jamSelesai}</Text>
                    </View>
                  </View>
                )}

                {/* Lokasi & Pegawai */}
                <View style={styles.sectionHeaderConfirm}>
                  <Ionicons name="location-outline" size={18} color="#004643" />
                  <Text style={styles.sectionTitleConfirm}>Lokasi & Pegawai Dinas</Text>
                </View>
                <View style={styles.sectionDivider} />

                <View style={styles.confirmItemFull}>
                  <Text style={styles.confirmLabel}>Lokasi ({selectedLokasi.length})</Text>
                  {selectedLokasi.map((lokasi, index) => (
                    <Text key={index} style={styles.confirmValueList}>• {lokasi.nama_lokasi}</Text>
                  ))}
                </View>

                <View style={styles.confirmItemFull}>
                  <Text style={styles.confirmLabel}>Pegawai ({selectedPegawai.length})</Text>
                  {selectedPegawai.map((pegawai, index) => (
                    <Text key={index} style={styles.confirmValueList}>• {pegawai.nama_lengkap}</Text>
                  ))}
                </View>
              </ScrollView>
              
              <View style={styles.buttonGroup}>
                <TouchableOpacity 
                  style={styles.cancelBtn}
                  onPress={closeBottomSheet}
                >
                  <Text style={styles.cancelText}>Batal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveBtn}
                  onPress={confirmSubmit}
                  disabled={loading}
                >
                  <Text style={styles.saveText}>
                    {loading ? 'Menyimpan...' : 'Simpan Data'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Input Modal */}
      <Modal visible={showInputModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.inputModalContainer}>
            <View style={styles.inputModalHeader}>
              <Text style={styles.inputModalTitle}>Input Data</Text>
              <TouchableOpacity onPress={() => setShowInputModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.inputModalContent}>
              <TouchableOpacity 
                style={styles.inputModalItem}
                onPress={() => {
                  Alert.prompt('Nama Kegiatan', 'Masukkan nama kegiatan:', [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'OK', onPress: (value: string | undefined) => value && setFormData({...formData, namaKegiatan: value}) }
                  ]);
                }}
              >
                <Ionicons name="clipboard-outline" size={20} color="#004643" />
                <Text style={styles.inputModalItemText}>Nama Kegiatan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.inputModalItem}
                onPress={() => {
                  Alert.prompt('Nomor SPT', 'Masukkan nomor SPT:', [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'OK', onPress: (value: string | undefined) => value && setFormData({...formData, nomorSpt: value}) }
                  ]);
                }}
              >
                <Ionicons name="document-text-outline" size={20} color="#004643" />
                <Text style={styles.inputModalItemText}>Nomor SPT</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#004643',
    marginLeft: 8
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  formContent: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80
  },
  dateInputContainer: {
    position: 'relative'
  },
  datePickerButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  datePickerPlaceholder: {
    color: '#999'
  },
  calendarIconButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#F0F8F0'
  },

  dropdownBtn: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dropdownBtnText: {
    fontSize: 16,
    color: '#333'
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 200
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F8F7'
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff'
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12
  },
  searchInputField: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 10
  },
  dropdownList: {
    maxHeight: 150
  },
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheetBackdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '70%',
  },
  bottomSheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  bottomSheetContent: {
    maxHeight: 400,
    marginBottom: 16
  },
  bottomSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  bottomSheetItemActive: {
    backgroundColor: '#E6F0EF',
  },
  bottomSheetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bottomSheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetIconActive: {
    backgroundColor: '#004643',
  },
  bottomSheetItemText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  bottomSheetItemTextActive: {
    color: '#004643',
    fontWeight: '600',
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  itemSubtext: {
    fontSize: 12,
    color: '#666'
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666'
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#004643',
    alignItems: 'center'
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  selectedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6
  },
  selectedChipText: {
    fontSize: 12,
    color: '#004643',
    fontWeight: '500'
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FAFAFA'
  },
  uploadContent: {
    flex: 1,
    marginLeft: 12
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#666'
  },
  removeFileBtn: {
    padding: 4
  },
  submitBtn: {
    backgroundColor: '#004643',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 50
  },
  submitBtnDisabled: {
    backgroundColor: '#999'
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
    textAlign: 'center'
  },
  buttonFooter: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  inputError: {
    borderColor: '#F44336',
    borderWidth: 2
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
    marginLeft: 4
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  calendarBottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20
  },
  calendarSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  calendarSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },
  modalBackdrop: { 
    flex: 1 
  },
  bottomSheetConfirm: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2
  },
  sheetContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 16 
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16
  },
  confirmScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.5,
    marginBottom: 16
  },
  sectionHeaderConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8
  },
  sectionTitleConfirm: {
    fontSize: 15,
    fontWeight: '700',
    color: '#004643'
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  confirmItemHalf: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  confirmItemFull: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12
  },
  confirmValueList: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 4
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  confirmLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  confirmValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    lineHeight: 18
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666'
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#004643',
    alignItems: 'center',
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },

  jamKerjaContainer: {
    flexDirection: 'row',
    gap: 12
  },
  jamKerjaBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  jamKerjaBtnActive: {
    backgroundColor: '#004643'
  },
  jamKerjaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  jamKerjaTextActive: {
    color: '#fff'
  },
  jamKhususContainer: {
    marginTop: 12,
    gap: 10
  },
  jamRow: {
    flexDirection: 'row',
    gap: 12
  },
  jamInputGroup: {
    flex: 1
  },
  jamLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6
  },
  jamPickerButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  jamPickerText: {
    fontSize: 14,
    color: '#333'
  },
  jamPickerPlaceholder: {
    color: '#999'
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#F0F8F7',
    borderRadius: 8
  },
  infoText: {
    fontSize: 11,
    color: '#004643',
    flex: 1
  },
  
  // Input Modal styles
  inputModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  inputModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '70%'
  },
  inputModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  inputModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  inputModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 15
  },
  inputModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  inputModalItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12
  }
});
