export type AuthUser = {
    id: string;
    email: string;
    displayName: string;
};

// Safe to show outside an authenticated session. Account email remains private.
export type PublicProfile = Pick<AuthUser, "id" | "displayName">;

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type ApiError = {
  error?: string;
};

