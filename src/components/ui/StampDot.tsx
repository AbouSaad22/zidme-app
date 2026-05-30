import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';
import { Shadow } from '../../theme/spacing';

type StampState = 'filled' | 'empty' | 'new';

interface StampDotProps {
  state: StampState;
  size?: number;
  categoryIcon?: string;
}

export default function StampDot({
  state,
  size = 44,
  categoryIcon = '☕',
}: StampDotProps) {
  const isFilled = state === 'filled' || state === 'new';

  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2 },
        isFilled ? styles.dotFilled : styles.dotEmpty,
        state === 'new' && styles.dotNew,
      ]}
    >
      {isFilled ? (
        <Text style={{ fontSize: size * 0.45 }}>{categoryIcon}</Text>
      ) : (
        <View style={[styles.innerCircle, { width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFilled: {
    backgroundColor: Colors.stampFilled,
    ...Shadow.stamp,
  },
  dotEmpty: {
    backgroundColor: Colors.stampEmpty,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dotNew: {
    backgroundColor: Colors.accent,
    transform: [{ scale: 1.1 }],
  },
  innerCircle: {
    backgroundColor: Colors.border,
  },
});
