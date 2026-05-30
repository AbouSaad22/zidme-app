import React from 'react';
import { View, StyleSheet } from 'react-native';
import StampDot from './StampDot';
import { Spacing } from '../../theme/spacing';
import { MerchantCategory } from '../../types';

const CATEGORY_ICONS: Record<MerchantCategory, string> = {
  CAFE: '☕',
  PIZZERIA: '🍕',
  FAST_FOOD: '🍔',
};

interface StampGridProps {
  current: number;
  required: number;
  category: MerchantCategory;
  newStampIndex?: number; // highlight index of new stamp
}

export default function StampGrid({
  current,
  required,
  category,
  newStampIndex,
}: StampGridProps) {
  const icon = CATEGORY_ICONS[category];
  const dotSize = required <= 6 ? 52 : required <= 9 ? 46 : 40;

  // Determine columns
  const columns = required <= 5 ? required : required <= 8 ? Math.ceil(required / 2) : 5;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.grid, { maxWidth: columns * (dotSize + Spacing.sm) }]}>
        {Array.from({ length: required }).map((_, i) => {
          const isFilled = i < current;
          const isNew = i === newStampIndex;
          const state = isNew ? 'new' : isFilled ? 'filled' : 'empty';

          return (
            <StampDot
              key={i}
              state={state}
              size={dotSize}
              categoryIcon={icon}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
});
