export type AuthUser = {
    id: string;
    email: string;
    displayName: string;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type ApiError = {
  error?: string;
};

