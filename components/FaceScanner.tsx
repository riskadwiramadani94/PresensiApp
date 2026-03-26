import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  color: string;
  size?: number;
  scanning?: boolean;
}

export default function FaceScanner({ color, size = 260, scanning = true }: Props) {
  const scanAnim = useRef(new Animated.Value(0)).current;
  const bracketLen = 30;
  const borderW = 3;

  useEffect(() => {
    if (!scanning) {
      scanAnim.stopAnimation();
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
    return () => scanAnim.stopAnimation();
  }, [scanning]);

  const scanY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, size - 4] });

  const bracket = (pos: 'tl' | 'tr' | 'bl' | 'br') => {
    const isTop = pos === 'tl' || pos === 'tr';
    const isLeft = pos === 'tl' || pos === 'bl';
    return (
      <View style={[styles.bracket, {
        top: isTop ? 0 : undefined,
        bottom: isTop ? undefined : 0,
        left: isLeft ? 0 : undefined,
        right: isLeft ? undefined : 0,
      }]}>
        {/* horizontal */}
        <View style={[styles.line, {
          width: bracketLen, height: borderW,
          backgroundColor: color,
          top: isTop ? 0 : undefined,
          bottom: isTop ? undefined : 0,
          left: isLeft ? 0 : undefined,
          right: isLeft ? undefined : 0,
        }]} />
        {/* vertical */}
        <View style={[styles.line, {
          width: borderW, height: bracketLen,
          backgroundColor: color,
          top: isTop ? 0 : undefined,
          bottom: isTop ? undefined : 0,
          left: isLeft ? 0 : undefined,
          right: isLeft ? undefined : 0,
        }]} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size * 1.2 }]}>
      {bracket('tl')}
      {bracket('tr')}
      {bracket('bl')}
      {bracket('br')}

      {scanning && (
        <Animated.View style={[styles.scanLine, {
          width: size - 20,
          backgroundColor: color,
          transform: [{ translateY: scanY }],
          opacity: 0.7,
        }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  bracket: { position: 'absolute', width: 30, height: 30 },
  line: { position: 'absolute' },
  scanLine: { position: 'absolute', top: 0, height: 2, borderRadius: 1 },
});
