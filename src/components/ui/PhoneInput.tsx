import React, { useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Colors from '../../theme/colors';
import Typography from '../../theme/typography';
import { Radius, Spacing } from '../../theme/spacing';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  error,
  disabled = false,
}: PhoneInputProps) {
  const inputRef = useRef<TextInput>(null);

  const handleChange = (text: string) => {
    // Allow digits only, max 9 digits (Algerian mobile without prefix)
    const cleaned = text.replace(/\D/g, '').slice(0, 9);
    onChange(cleaned);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.inputRow,
          error ? styles.inputError : styles.inputNormal,
          disabled && styles.disabled,
        ]}
        onPress={() => inputRef.current?.focus()}
        activeOpacity={1}
      >
        {/* Country prefix */}
        <View style={styles.prefix}>
          <Text style={styles.flag}>🇩🇿</Text>
          <Text style={styles.prefixText}>+213</Text>
        </View>

        <View style={styles.divider} />

        {/* Phone input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder="0X XX XX XX XX"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          maxLength={9}
          editable={!disabled}
          textAlign="left"
          accessibilityLabel="رقم الهاتف"
          accessibilityHint="أدخل رقم هاتفك الجزائري"
        />
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    height: 56,
    overflow: 'hidden',
  },
  inputNormal: {
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: '#FFF5F5',
  },
  disabled: {
    opacity: 0.5,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  flag: {
    fontSize: 20,
  },
  prefixText: {
    ...Typography.labelMedium,
    color: Colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    textAlign: 'right',
  },
});
