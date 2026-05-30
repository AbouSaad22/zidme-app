/**
 * CustomerEntryScreen — SCR-008
 *
 * Entry point when customer scans merchant QR.
 * Shows merchant name, reward promise, and CTA to continue.
 * Redirects to PhoneLogin if not authenticated.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList, Merchant } from '../types';
import SafeScreen from '../components/layout/SafeScreen';
import ZidmeButton from '../components/ui/ZidmeButton';
import CategoryIcon from '../components/ui/CategoryIcon';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { Spacing, Radius, Shadow } from '../theme/spacing';
import { getMerchantByToken } from '../services/mockApi';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerEntry'>;

export default function CustomerEntryScreen({ navigation, route }: Props) {
  const { merchantToken } = route.params;

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMerchant();
  }, [merchantToken]);

  const loadMerchant = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMerchantByToken(merchantToken);
      setMerchant(data);
    } catch (e: any) {
      setError(e?.message ?? 'حدث خطأ. تأكد من رمز QR وحاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('PhoneLogin', { merchantToken });
  };

  if (loading) {
    return <LoadingOverlay visible message="جارٍ التحقق..." />;
  }

  if (error || !merchant) {
    return (
      <SafeScreen style={styles.center}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>رابط غير صالح</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={styles.screen}>
      {/* Top decoration */}
      <View style={styles.topBg} />

      <View style={styles.content}>
        {/* Zidme Brand */}
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoZ}>Z</Text>
            <Text style={styles.logoDots}>···</Text>
          </View>
          <Text style={styles.brandName}>زيدني</Text>
        </View>

        {/* Merchant Card */}
        <View style={styles.card}>
          <CategoryIcon category={merchant.category} size={36} showLabel />

          <Text style={styles.merchantName}>{merchant.name}</Text>

          {/* Reward promise */}
          <View style={styles.promisePill}>
            <Text style={styles.promiseIcon}>🎁</Text>
            <Text style={styles.promiseText}>اجمع طوابع واحصل على مكافأة</Text>
          </View>

          {/* How it works */}
          <View style={styles.stepsRow}>
            {[
              { icon: '📱', label: 'سجّل رقمك' },
              { icon: '🏷️', label: 'اجمع طوابع' },
              { icon: '🎉', label: 'احصل على هديتك' },
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
                <Text style={styles.stepLabel}>{step.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <ZidmeButton
            label="ابدأ الآن"
            onPress={handleContinue}
          />
          <Text style={styles.noApp}>بدون تحميل تطبيق • بدون تسجيل معقد</Text>
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  topBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  content: {
    flex: 1,
    padding: Spacing.base,
    gap: Spacing.lg,
    paddingTop: Spacing.xxl,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  logoBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logoZ: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
  },
  logoDots: {
    fontSize: 12,
    color: Colors.accent,
    marginBottom: 2,
    letterSpacing: 2,
  },
  brandName: {
    ...Typography.heading2,
    color: Colors.white,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.base,
    ...Shadow.card,
  },

  merchantName: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  promisePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
  },
  promiseIcon: {
    fontSize: 16,
  },
  promiseText: {
    ...Typography.labelMedium,
    color: Colors.primary,
  },

  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  step: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  stepIcon: {
    fontSize: 24,
  },
  stepLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  cta: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  noApp: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },

  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
  },
  errorBody: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
