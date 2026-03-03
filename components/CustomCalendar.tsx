import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, Animated, PanResponder, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CalendarEvent {
  id: number;
  date: string;
  title: string;
  type: 'birthday' | 'holiday' | 'event';
  data?: any;
}

interface CalendarProps {
  events?: CalendarEvent[];
  onDatePress?: (date: Date, events: CalendarEvent[]) => void;
  weekendDays?: number[];
  showWeekends?: boolean;
  initialDate?: Date;
  startDate?: Date;
}

export default function CustomCalendar({ 
  events = [], 
  onDatePress,
  weekendDays = [0, 6],
  showWeekends = true,
  initialDate,
  startDate
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(initialDate || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [hasSelectedMonth, setHasSelectedMonth] = useState(false);
  const [hasSelectedYear, setHasSelectedYear] = useState(false);
  const [tempMonth, setTempMonth] = useState(new Date().getMonth());
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const pickerTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (initialDate) {
      setCurrentMonth(initialDate);
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isWeekend = (date: Date | null) => {
    if (!date || !showWeekends) return false;
    return weekendDays.includes(date.getDay());
  };

  const getDateEvents = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const handleDatePress = (date: Date | null) => {
    if (!date) return;
    const dateEvents = getDateEvents(date);
    if (onDatePress) {
      onDatePress(date, dateEvents);
    } else if (dateEvents.length > 0) {
      const eventList = dateEvents.map(e => `• ${e.title}`).join('\n');
      Alert.alert(
        `${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'long' })}`,
        eventList,
        [{ text: 'Tutup', style: 'cancel' }]
      );
    }
  };

  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const selectMonth = (monthIndex: number) => {
    setTempMonth(monthIndex);
    setHasSelectedMonth(true);
    if (hasSelectedYear) {
      applyAndClose(monthIndex, tempYear);
    }
  };

  const selectYear = (year: number) => {
    setTempYear(year);
    setHasSelectedYear(true);
    if (hasSelectedMonth) {
      applyAndClose(tempMonth, year);
    }
  };

  const applyAndClose = (month: number, year: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(month);
    newMonth.setFullYear(year);
    setCurrentMonth(newMonth);
    closeMonthPicker();
  };

  const openMonthPicker = () => {
    setTempMonth(currentMonth.getMonth());
    setTempYear(currentMonth.getFullYear());
    setHasSelectedMonth(false);
    setHasSelectedYear(false);
    setShowMonthPicker(true);
    Animated.spring(pickerTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const closeMonthPicker = () => {
    Animated.timing(pickerTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setShowMonthPicker(false);
      setHasSelectedMonth(false);
      setHasSelectedYear(false);
    });
  };



  const pickerPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        pickerTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeMonthPicker();
      } else {
        Animated.spring(pickerTranslateY, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    }
  });

  const getMonths = () => {
    return [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
  };

  const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 80; i <= currentYear; i++) {
      years.push(i);
    }
    return years.reverse();
  };

  const getEventTypeStyle = (events: CalendarEvent[]) => {
    if (events.length === 0) return {};
    const hasHoliday = events.some(e => e.type === 'holiday');
    const hasBirthday = events.some(e => e.type === 'birthday');
    const hasEvent = events.some(e => e.type === 'event');

    if (hasHoliday) return { backgroundColor: '#FFF3E0', borderColor: '#FFD6D6' };
    if (hasBirthday) return { backgroundColor: '#E8F5E8', borderColor: '#C8E6C9' };
    if (hasEvent) return { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' };
    return {};
  };

  const getEventTextStyle = (events: CalendarEvent[]) => {
    if (events.length === 0) return {};
    const hasHoliday = events.some(e => e.type === 'holiday');
    const hasBirthday = events.some(e => e.type === 'birthday');
    const hasEvent = events.some(e => e.type === 'event');

    if (hasHoliday) return { color: '#FFA726', fontWeight: '600' as const };
    if (hasBirthday) return { color: '#4CAF50', fontWeight: '600' as const };
    if (hasEvent) return { color: '#2196F3', fontWeight: '600' as const };
    return {};
  };

  const getDotColor = (events: CalendarEvent[]) => {
    if (events.length === 0) return null;
    const hasHoliday = events.some(e => e.type === 'holiday');
    const hasBirthday = events.some(e => e.type === 'birthday');
    const hasEvent = events.some(e => e.type === 'event');

    if (hasHoliday) return '#FFA726';
    if (hasBirthday) return '#4CAF50';
    if (hasEvent) return '#2196F3';
    return '#666';
  };

  const days = getDaysInMonth();
  const monthName = currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <>
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={24} color="#004643" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openMonthPicker} style={styles.monthYearBtn}>
            <Text style={styles.monthText}>{monthName}</Text>
            <Ionicons name="chevron-down" size={16} color="#004643" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={24} color="#004643" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, i) => (
            <Text key={i} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map((date, index) => {
            const isWE = isWeekend(date);
            const dateEvents = getDateEvents(date);
            const hasEvents = dateEvents.length > 0;
            const isToday = date && date.toDateString() === new Date().toDateString();
            const isSelected = selectedDate && date && date.toDateString() === selectedDate.toDateString();
            const isStartDate = startDate && date && date.toDateString() === startDate.toDateString();
            const eventStyle = getEventTypeStyle(dateEvents);
            const eventTextStyle = getEventTextStyle(dateEvents);
            const dotColor = getDotColor(dateEvents);
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  !date && styles.emptyCell,
                  isWE && styles.weekendCell,
                  hasEvents && { ...eventStyle, borderWidth: 1 },
                  isToday && styles.todayCell,
                  isSelected && styles.selectedCell,
                  isStartDate && styles.startDateCell
                ]}
                onPress={() => handleDatePress(date)}
                disabled={!date}
              >
                {date && (
                  <Text style={[
                    styles.dayText,
                    isWE && styles.weekendText,
                    hasEvents && eventTextStyle,
                    isToday && styles.todayText,
                    isSelected && styles.selectedText,
                    isStartDate && styles.startDateText
                  ]}>
                    {date.getDate()}
                  </Text>
                )}
                {hasEvents && dotColor && <View style={[styles.eventDot, { backgroundColor: dotColor }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Modal 
        visible={showMonthPicker} 
        transparent
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeMonthPicker}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeMonthPicker} />
          <Animated.View style={[styles.pickerBottomSheet, { transform: [{ translateY: pickerTranslateY }] }]}>
            <View {...pickerPanResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>
            
            <View style={styles.pickerSheetContent}>
              <Text style={styles.pickerTitle}>Pilih Bulan & Tahun</Text>
              
              <View style={styles.pickerContent}>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Bulan</Text>
                  <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                    {getMonths().map((month, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.pickerItem,
                          tempMonth === index && styles.selectedPickerItem
                        ]}
                        onPress={() => selectMonth(index)}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          tempMonth === index && styles.selectedPickerItemText
                        ]}>
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Tahun</Text>
                  <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                    {getYears().map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.pickerItem,
                          tempYear === year && styles.selectedPickerItem
                        ]}
                        onPress={() => selectYear(year)}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          tempYear === year && styles.selectedPickerItemText
                        ]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    backgroundColor: 'transparent',
    padding: 0
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  monthBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5'
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#004643'
  },
  monthYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8F7'
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#666'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 6
  },
  emptyCell: {
    backgroundColor: 'transparent'
  },
  weekendCell: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFD6D6',
    borderRadius: 20
  },
  todayCell: {
    backgroundColor: '#004643',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#004643',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3
  },
  dayText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500'
  },
  weekendText: {
    color: '#EF5350',
    fontWeight: '600'
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  selectedCell: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  startDateCell: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3
  },
  startDateText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  eventDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalBackdrop: {
    flex: 1
  },
  pickerBottomSheet: {
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
  pickerSheetContent: {
    paddingHorizontal: 20
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },
  pickerContent: {
    flexDirection: 'row',
    gap: 12
  },
  pickerColumn: {
    flex: 1
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center'
  },
  pickerList: {
    maxHeight: 280
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4
  },
  selectedPickerItem: {
    backgroundColor: '#004643'
  },
  pickerItemText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center'
  },
  selectedPickerItemText: {
    color: 'white',
    fontWeight: '600'
  }
});