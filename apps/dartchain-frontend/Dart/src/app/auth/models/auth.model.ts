export interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: number;
  role?: string;
  walletAddress?: string | null;
  walletPublicKey?: string | null;
}

export interface LinkWalletRequest {
  walletAddress: string;
  publicKey: string;
}

export interface AuthResponse {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  user: UserProfile;
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
}

export interface OAuthProvidersResponse {
  providers: OAuthProviderInfo[];
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
  status?: number;
}
