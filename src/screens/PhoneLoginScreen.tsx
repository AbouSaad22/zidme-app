/**
 * PhoneLoginScreen — SCR-002
 *
 * Collects Algerian phone number and requests OTP.
 * Handles invalid phone and rate limit states.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParamList } from '../types';
import SafeScreen from '../components/layout/SafeScreen';
import ZidmeButton from '../components/ui/ZidmeButton';
import PhoneInput from '../components/ui/PhoneInput';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';
import { requestOTP } from '../services/mockApi';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PhoneLogin'>;

export default function PhoneLoginScreen({ navigation, route }: Props) {
  const { merchantToken } = route.params;

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = phone.length === 9 && phone.startsWith('0');

  const handleSendOTP = async () => {
    if (!isValid) {
      setError('أدخل رقم هاتف جزائري صالح (مثال: 0XX XX XX XX)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fullPhone = `+213${phone.slice(1)}`; // 0XXXXXXXXX → +213XXXXXXXXX
      const result = await requestOTP(fullPhone);

      navigation.navigate('OTPVerification', {
        phone: fullPhone,
        requestId: result.requestId,
        merchantToken,
      });
    } catch (e: any) {
      if (e?.code === 'RATE_LIMITED') {
        setError('تجاوزت عدد المحاولات المسموحة. انتظر بضع دقائق.');
      } else {
        setError(e?.message ?? 'حدث خطأ. حاول مجدداً.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen backgroundColor={Colors.background}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBg}>
              <Text style={styles.icon}>📱</Text>
            </View>
            <Text style={styles.title}>أدخل رقم هاتفك</Text>
            <Text style={styles.subtitle}>
              سنرسل لك رمز تحقق برسالة قصيرة
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <PhoneInput
              value={phone}
              onChange={(val) => {
                setPhone(val);
                if (error) setError(null);
              }}
              error={error ?? undefined}
              disabled={loading}
            />

            <ZidmeButton
              label="إرسال الرمز"
              onPress={handleSendOTP}
              loading={loading}
              disabled={!isValid}
            />
          </View>

          {/* Privacy note */}
          <View style={styles.privacyBox}>
            <Text style={styles.privacyText}>
              🔒 رقمك محمي ولا يُشارك مع أي جهة
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    gap: Spacing.xxl,
  },

  header: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    ...Typography.heading1,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  form: {
    gap: Spacing.base,
  },

  privacyBox: {
    alignItems: 'center',
  },
  privacyText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
});
