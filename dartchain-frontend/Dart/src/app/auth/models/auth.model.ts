export interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: number;
  role?: string;
  totpEnabled?: boolean;
  walletAddress?: string | null;
  walletPublicKey?: string | null;
}

export interface LinkWalletRequest {
  walletAddress: string;
  publicKey: string;
}

export interface AuthResponse {
  token: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number;
  tokenType?: string | null;
  user: UserProfile;
  status?: 'AUTHENTICATED' | 'EMAIL_VERIFICATION' | 'TWO_FACTOR';
  verificationId?: string | null;
  challengeToken?: string | null;
}

export type AuthChallengeStatus = 'EMAIL_VERIFICATION' | 'TWO_FACTOR' | 'TOTP_SETUP' | 'TOTP_DISABLE';

export interface AuthChallenge {
  status: AuthChallengeStatus;
  verificationId?: string | null;
  challengeToken?: string | null;
  email?: string | null;
  secret?: string | null;
  otpauthUrl?: string | null;
}

export interface TotpSetupResponse {
  secret: string;
  otpauthUrl: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export type AuthMode = 'login' | 'register';

export interface OAuthProviderInfo {
  id: string;
  label: string;
  enabled: boolean;
  /** true = login local sans fournisseur réel (dev mock). */
  mock?: boolean;
}

export interface OAuthProvidersResponse {
  providers: OAuthProviderInfo[];
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
  status?: number;
}
