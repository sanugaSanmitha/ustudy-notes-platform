
export interface AuthUser {
  id: string;
  email: string;
  fullName?: string | null;
  school?: string | null;
  profileCompleted?: boolean;
  anonymousId: string;
  isSeller: boolean;
  isFirstPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  agreeToTerms: boolean;
}

export interface RegisterResponse {
  data?: { userId: string; email: string };
  error?: { code: string; message: string };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  data?: { user: AuthUser; token: string };
  error?: { code: string; message: string };
}

export interface VerifyEmailPayload {
  token: string;
}

export interface VerifyEmailResponse {
  data?: { success: true };
  error?: { code: string; message: string };
}