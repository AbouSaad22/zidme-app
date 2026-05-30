// ─── Enums ───────────────────────────────────────────────────────────────────

export type MerchantCategory = 'CAFE' | 'PIZZERIA' | 'FAST_FOOD';

export type ProgramStrategy = 'PER_VISIT' | 'MIN_PURCHASE_STAMP';

export type ScanSessionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';

export type RewardStatus = 'NONE' | 'READY' | 'REDEEM_REQUESTED' | 'REDEEMED';

export type MerchantStatus = 'ACTIVE' | 'INACTIVE';

// ─── Models ──────────────────────────────────────────────────────────────────

export interface Merchant {
  id: string;
  name: string;
  category: MerchantCategory;
  status: MerchantStatus;
  qrToken: string;
}

export interface LoyaltyProgram {
  id: string;
  merchantId: string;
  rewardLabel: string;
  requiredStamps: number; // 3-15
  strategyType: ProgramStrategy;
  minAmountDzd?: number;
}

export interface CustomerProgress {
  customerId: string;
  merchantId: string;
  programId: string;
  currentStamps: number;
  requiredStamps: number;
  rewardStatus: RewardStatus;
  rewardLabel: string;
  strategyType: ProgramStrategy;
  minAmountDzd?: number;
}

export interface ScanSession {
  id: string;
  merchantId: string;
  customerId: string;
  programId: string;
  status: ScanSessionStatus;
  idempotencyKey: string;
  createdAt: string;
  expiresAt: string;
}

export interface User {
  id: string;
  phone: string;
  isCustomer: boolean;
}

export interface OTPRequest {
  requestId: string;
  expiresIn: number; // seconds
}

export interface AuthSession {
  accessToken: string;
  user: User;
}

export interface Reward {
  id: string;
  status: RewardStatus;
  rewardLabel: string;
  merchantName: string;
}

// ─── Navigation Params ───────────────────────────────────────────────────────

export type CustomerStackParamList = {
  CustomerEntry: { merchantToken: string };
  PhoneLogin: { merchantToken: string };
  OTPVerification: {
    phone: string;
    requestId: string;
    merchantToken: string;
  };
  CustomerStampCard: {
    progress: CustomerProgress;
    merchantName: string;
    merchantCategory: MerchantCategory;
  };
  StampAddedSuccess: {
    progress: CustomerProgress;
    merchantName: string;
    merchantCategory: MerchantCategory;
  };
  RewardReady: {
    reward: Reward;
    merchantName: string;
  };
};
