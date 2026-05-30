import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import Colors from '../../theme/colors';
import Typography from '../../theme/typography';
import { Radius } from '../../theme/spacing';

const OTP_LENGTH = 6;

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OTPInput({
  value,
  onChange,
  error = false,
  disabled = false,
  autoFocus = true,
}: OTPInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }
  }, [autoFocus]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);

    const chars = value.split('');
    chars[index] = digit;

    // Pad/trim to OTP_LENGTH
    const newValue = chars.join('').slice(0, OTP_LENGTH);
    onChange(newValue);

    // Advance to next box
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const chars = value.split('');
      chars[index - 1] = '';
      onChange(chars.join(''));
    }
  };

  return (
    <View style={styles.container} accessibilityLabel="رمز التحقق المكون من 6 أرقام">
      {Array.from({ length: OTP_LENGTH }).map((_, index) => {
        const isFilled = !!value[index];
        const isActive = value.length === index;

        return (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref; }}
            style={[
              styles.box,
              isFilled && styles.boxFilled,
              isActive && styles.boxActive,
              error && styles.boxError,
            ]}
            value={value[index] || ''}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!disabled}
            selectTextOnFocus
            caretHidden
            textAlign="center"
            accessibilityLabel={`الخانة ${index + 1} من ${OTP_LENGTH}`}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Typography.otpDigit,
    color: Colors.textPrimary,
  },
  boxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  boxActive: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  boxError: {
    borderColor: Colors.error,
    backgroundColor: '#FFF5F5',
  },
});
