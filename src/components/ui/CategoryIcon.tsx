import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';
import { MerchantCategory } from '../../types';

const ICONS: Record<MerchantCategory, string> = {
  CAFE: '☕',
  PIZZERIA: '🍕',
  FAST_FOOD: '🍔',
};

const LABELS: Record<MerchantCategory, string> = {
  CAFE: 'مقهى',
  PIZZERIA: 'بيتزيريا',
  FAST_FOOD: 'وجبات سريعة',
};

interface CategoryIconProps {
  category: MerchantCategory;
  size?: number;
  showLabel?: boolean;
}

export default function CategoryIcon({
  category,
  size = 48,
  showLabel = false,
}: CategoryIconProps) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconBg,
          { width: size * 1.6, height: size * 1.6, borderRadius: size * 0.5 },
        ]}
      >
        <Text style={{ fontSize: size }}>{ICONS[category]}</Text>
      </View>
      {showLabel && (
        <Text style={styles.label}>{LABELS[category]}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  iconBg: {
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
