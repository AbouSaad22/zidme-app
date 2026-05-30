import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';
import Typography from '../../theme/typography';
import { Radius, Spacing } from '../../theme/spacing';

interface RewardBannerProps {
  rewardLabel: string;
  isReady?: boolean;
  compact?: boolean;
}

export default function RewardBanner({
  rewardLabel,
  isReady = false,
  compact = false,
}: RewardBannerProps) {
  return (
    <View style={[styles.container, isReady && styles.containerReady, compact && styles.compact]}>
      <Text style={styles.giftIcon}>🎁</Text>
      <View style={styles.text}>
        <Text style={[styles.label, compact && styles.labelSmall]}>
          {isReady ? '🎉 هديتك جاهزة!' : 'هديتك'}
        </Text>
        <Text style={[styles.value, compact && styles.valueSmall]} numberOfLines={2}>
          {rewardLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlayLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerReady: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  compact: {
    padding: Spacing.sm,
  },
  giftIcon: {
    fontSize: 28,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
  },
  labelSmall: {
    fontSize: 11,
  },
  value: {
    ...Typography.heading3,
    color: Colors.textPrimary,
  },
  valueSmall: {
    fontSize: 14,
  },
});
