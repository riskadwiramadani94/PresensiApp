import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, PanResponder, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AnalogTimePickerProps {
  visible: boolean;
  initialTime?: string;
  onTimeSelect: (time: string) => void;
  onClose: () => void;
}

export default function AnalogTimePicker({ visible, initialTime = '08:00', onTimeSelect, onClose }: AnalogTimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(() => {
    const [hour] = initialTime.split(':');
    return parseInt(hour) % 12 || 12;
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    const [, minute] = initialTime.split(':');
    return parseInt(minute) || 0;
  });
  const [isPM, setIsPM] = useState(() => {
    const [hour] = initialTime.split(':');
    return parseInt(hour) >= 12;
  });
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const clockRadius = 120;
  const centerX = 120;
  const centerY = 120;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11
      }).start();
    }
  }, [visible]);

  const closeModal = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true
    }).start(() => onClose());
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
        closeModal();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    }
  });

  const handleClockTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const dx = locationX - centerX;
    const dy = locationY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Allow touch anywhere within the clock face
    if (distance > clockRadius) return;

    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;

    if (mode === 'hour') {
      const hour = Math.round((angle / (Math.PI / 6)) % 12) || 12;
      setSelectedHour(hour);
    } else {
      const minute = Math.round((angle / (Math.PI / 30)) % 60);
      setSelectedMinute(minute);
    }
  };

  const handleHourPress = (hour: number) => {
    setSelectedHour(hour);
    // Tidak otomatis pindah ke mode menit, biarkan user memilih sendiri
  };

  const getHourPosition = (hour: number) => {
    const angle = ((hour % 12) * 30 - 90) * Math.PI / 180;
    return {
      x: centerX + (clockRadius - 30) * Math.cos(angle),
      y: centerY + (clockRadius - 30) * Math.sin(angle)
    };
  };

  const getHandAngle = (value: number, maxValue: number) => {
    return ((value / maxValue) * 360 - 90) * Math.PI / 180;
  };

  const handleConfirm = () => {
    const finalHour = isPM ? (selectedHour === 12 ? 12 : selectedHour + 12) : (selectedHour === 12 ? 0 : selectedHour);
    const timeString = `${finalHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onTimeSelect(timeString);
    closeModal();
  };

  const hourAngle = getHandAngle(selectedHour, 12);
  const minuteAngle = getHandAngle(selectedMinute, 60);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={closeModal}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal} />
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View style={styles.handleBar} />
          </View>

          <View style={styles.sheetContent}>
            <Text style={styles.title}>Pilih Waktu</Text>

            {/* AM/PM Toggle */}
            <View style={styles.periodToggle}>
              <TouchableOpacity 
                style={[styles.periodBtn, !isPM && styles.periodBtnActive]}
                onPress={() => setIsPM(false)}
              >
                <Ionicons name="sunny" size={16} color={!isPM ? '#fff' : '#666'} />
                <Text style={[styles.periodText, !isPM && styles.periodTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.periodBtn, isPM && styles.periodBtnActive]}
                onPress={() => setIsPM(true)}
              >
                <Ionicons name="moon" size={16} color={isPM ? '#fff' : '#666'} />
                <Text style={[styles.periodText, isPM && styles.periodTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>



            {/* Analog Clock */}
            <View style={styles.clockContainer}>
              <View style={styles.clockFace} onTouchEnd={handleClockTouch}>
                <Svg width={240} height={240} style={styles.clockSvg}>
                  {/* Hour Hand */}
                  <Line
                    x1={centerX}
                    y1={centerY}
                    x2={centerX + 50 * Math.cos(hourAngle)}
                    y2={centerY + 50 * Math.sin(hourAngle)}
                    stroke={mode === 'hour' ? '#004643' : '#999'}
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                  
                  {/* Minute Hand */}
                  <Line
                    x1={centerX}
                    y1={centerY}
                    x2={centerX + 80 * Math.cos(minuteAngle)}
                    y2={centerY + 80 * Math.sin(minuteAngle)}
                    stroke={mode === 'minute' ? '#004643' : '#666'}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  
                  {/* Center Dot */}
                  <Circle cx={centerX} cy={centerY} r={4} fill="#004643" />
                </Svg>

                {/* Hour Numbers */}
                {Array.from({ length: 12 }, (_, i) => {
                  const hour = i === 0 ? 12 : i;
                  const pos = getHourPosition(hour);
                  return (
                    <TouchableOpacity
                      key={hour}
                      style={[styles.hourNumber, { left: pos.x - 15, top: pos.y - 15 }]}
                      onPress={() => {
                        setSelectedHour(hour);
                        setMode('minute');
                      }}
                    >
                      <Text style={[
                        styles.hourText,
                        selectedHour === hour && mode === 'hour' && styles.hourTextActive
                      ]}>
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Minute Marks */}
                {Array.from({ length: 60 }, (_, i) => {
                  if (i % 5 !== 0) return null;
                  const angle = (i * 6 - 90) * Math.PI / 180;
                  const x = centerX + (clockRadius - 15) * Math.cos(angle);
                  const y = centerY + (clockRadius - 15) * Math.sin(angle);
                  return (
                    <View
                      key={i}
                      style={[styles.minuteMark, { left: x - 1, top: y - 1 }]}
                    />
                  );
                })}
              </View>
            </View>

            {/* Time Display */}
            <View style={styles.timeDisplay}>
              <Text style={styles.timeText}>
                {`${(isPM ? (selectedHour === 12 ? 12 : selectedHour + 12) : (selectedHour === 12 ? 0 : selectedHour)).toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`}
              </Text>
              <Text style={styles.timeSubtext}>
                {`${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmText}>Pilih</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalBackdrop: {
    flex: 1
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: SCREEN_HEIGHT * 0.8
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
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    padding: 4,
    marginBottom: 16
  },
  periodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6
  },
  periodBtnActive: {
    backgroundColor: '#004643'
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  periodTextActive: {
    color: '#fff'
  },
  clockSvg: {
    position: 'absolute',
    top: 0,
    left: 0
  },
  clockContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  clockFace: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative'
  },
  hourNumber: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15
  },
  hourText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  hourTextActive: {
    color: '#004643',
    backgroundColor: '#E6F0EF',
    borderRadius: 15,
    width: 30,
    height: 30,
    textAlign: 'center',
    lineHeight: 30
  },
  minuteMark: {
    position: 'absolute',
    width: 2,
    height: 8,
    backgroundColor: '#CCC',
    borderRadius: 1
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 20
  },
  timeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#004643'
  },
  timeSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center'
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666'
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#004643',
    alignItems: 'center'
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  }
});