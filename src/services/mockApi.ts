/**
 * Mock API Service — Phase 1
 *
 * All endpoints mirror the NestJS REST API contract defined in CSFD Section 10.
 * Replace each function body with a real fetch() call when NestJS backend is ready.
 *
 * Base path (future): /api/v1
 */

import {
  OTPRequest,
  AuthSession,
  CustomerProgress,
  Merchant,
  ScanSession,
  Reward,
  RewardStatus,
} from '../types';

// ─── Simulated delay ─────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ─── Mock Data Store ─────────────────────────────────────────────────────────
const MOCK_MERCHANTS: Record<string, Merchant> = {
  'token-cafe-zidme': {
    id: 'mer-001',
    name: 'كافيه الأصيل',
    category: 'CAFE',
    status: 'ACTIVE',
    qrToken: 'token-cafe-zidme',
  },
  'token-pizza-zidme': {
    id: 'mer-002',
    name: 'بيتزا زيدني',
    category: 'PIZZERIA',
    status: 'ACTIVE',
    qrToken: 'token-pizza-zidme',
  },
  'token-ff-zidme': {
    id: 'mer-003',
    name: 'فاست فود برو',
    category: 'FAST_FOOD',
    status: 'ACTIVE',
    qrToken: 'token-ff-zidme',
  },
};

// Mock in-memory session store
let mockCurrentUser: AuthSession | null = null;
let mockProgress: CustomerProgress = {
  customerId: 'cus-001',
  merchantId: 'mer-001',
  programId: 'prog-001',
  currentStamps: 3,
  requiredStamps: 6,
  rewardStatus: 'NONE',
  rewardLabel: 'قهوة مجانية',
  strategyType: 'PER_VISIT',
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/request-otp
 * Sends OTP to phone number.
 */
export async function requestOTP(phone: string): Promise<OTPRequest> {
  await delay(800);

  // Simulate validation
  if (!phone || phone.length < 9) {
    throw { code: 'INVALID_PHONE', message: 'رقم الهاتف غير صالح' };
  }

  // Mock: any valid phone gets requestId
  return {
    requestId: `req-${Date.now()}`,
    expiresIn: 300, // 5 minutes
  };
}

/**
 * POST /api/v1/auth/verify-otp
 * Verifies OTP code. Mock accepts "123456" as valid code.
 */
export async function verifyOTP(
  phone: string,
  requestId: string,
  code: string,
): Promise<AuthSession> {
  await delay(1000);

  if (code !== '123456') {
    throw { code: 'OTP_INVALID', message: 'الرمز غير صحيح، حاول مجدداً' };
  }

  const session: AuthSession = {
    accessToken: `mock-token-${Date.now()}`,
    user: {
      id: 'cus-001',
      phone,
      isCustomer: true,
    },
  };

  mockCurrentUser = session;
  return session;
}

// ─── Merchant ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/merchants/by-token/:token
 * Resolves merchant from QR opaque token.
 */
export async function getMerchantByToken(token: string): Promise<Merchant> {
  await delay(600);

  // Default to cafe for demo if unknown token
  const merchant = MOCK_MERCHANTS[token] ?? MOCK_MERCHANTS['token-cafe-zidme'];

  if (!merchant || merchant.status !== 'ACTIVE') {
    throw { code: 'INVALID_QR', message: 'رمز QR غير صالح أو المحل غير نشط' };
  }

  return merchant;
}

// ─── Customer Progress ────────────────────────────────────────────────────────

/**
 * GET /api/v1/customers/me/progress/:merchantId
 * Returns current stamp progress for authenticated customer.
 */
export async function getCustomerProgress(merchantId: string): Promise<CustomerProgress> {
  await delay(700);

  // Return progress updated to match merchantId
  return {
    ...mockProgress,
    merchantId,
  };
}

// ─── Scan Session ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/scan-sessions
 * Creates a PENDING scan session — customer requests stamp.
 */
export async function requestStamp(
  merchantToken: string,
  customerId: string,
): Promise<ScanSession> {
  await delay(900);

  const session: ScanSession = {
    id: `sess-${Date.now()}`,
    merchantId: 'mer-001',
    customerId,
    programId: 'prog-001',
    status: 'PENDING',
    idempotencyKey: `idem-${Date.now()}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };

  return session;
}

/**
 * Simulates cashier confirming the stamp (mock — auto confirms after 2s).
 * In real app: cashier confirms via POST /api/v1/scan-sessions/:id/confirm
 */
export async function simulateCashierConfirm(
  sessionId: string,
): Promise<{ progress: CustomerProgress; rewardReady: boolean }> {
  await delay(2000); // Simulate cashier action

  // Update mock progress
  mockProgress = {
    ...mockProgress,
    currentStamps: Math.min(mockProgress.currentStamps + 1, mockProgress.requiredStamps),
  };

  const rewardReady = mockProgress.currentStamps >= mockProgress.requiredStamps;

  if (rewardReady) {
    mockProgress = { ...mockProgress, rewardStatus: 'READY' };
  }

  return {
    progress: { ...mockProgress },
    rewardReady,
  };
}

// ─── Reward ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/rewards/:id/redeem-request
 * Customer requests reward redemption.
 */
export async function requestRedemption(rewardId: string): Promise<Reward> {
  await delay(800);

  mockProgress = { ...mockProgress, rewardStatus: 'REDEEM_REQUESTED' };

  return {
    id: rewardId,
    status: 'REDEEM_REQUESTED',
    rewardLabel: mockProgress.rewardLabel,
    merchantName: 'كافيه الأصيل',
  };
}

/**
 * Helper: reset mock progress (for demo/testing)
 */
export function resetMockProgress(stamps?: number): void {
  mockProgress = {
    ...mockProgress,
    currentStamps: stamps ?? 0,
    rewardStatus: 'NONE',
  };
}
