import { TextStyle } from 'react-native';

export const Typography: Record<string, TextStyle> = {
  // Display
  displayLarge: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -0.5,
    writingDirection: 'rtl',
  },
  displayMedium: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    writingDirection: 'rtl',
  },

  // Heading
  heading1: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    writingDirection: 'rtl',
  },
  heading2: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    writingDirection: 'rtl',
  },
  heading3: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    writingDirection: 'rtl',
  },

  // Body
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    writingDirection: 'rtl',
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    writingDirection: 'rtl',
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    writingDirection: 'rtl',
  },

  // Label
  labelLarge: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.1,
    writingDirection: 'rtl',
  },
  labelMedium: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    writingDirection: 'rtl',
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    writingDirection: 'rtl',
  },

  // OTP digit
  otpDigit: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: 2,
    textAlign: 'center',
  },

  // Number display
  stampNumber: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -1,
  },
};

export default Typography;
