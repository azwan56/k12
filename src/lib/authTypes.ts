export type AuthProviderType = 'google' | 'wechat' | 'dev';

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  provider: AuthProviderType;
  phone?: string | null;
  wechatBound?: boolean;
  getIdToken?: () => Promise<string>;
}
