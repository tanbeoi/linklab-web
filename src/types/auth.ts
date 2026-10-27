export type AuthUser = {
    id: string;
    email: string;
    displayName: string;
    avatarImageUrl: string | null;
    avatarFocalPointX: number;
    avatarFocalPointY: number;
    avatarZoom: number;
    coverImageUrl: string | null;
    coverFocalPointX: number;
    coverFocalPointY: number;
    coverZoom: number;
};

// Safe to show outside an authenticated session. Account email remains private.
export type PublicProfile = Pick<
    AuthUser,
    "id" | "displayName" | "avatarImageUrl" | "avatarFocalPointX" | "avatarFocalPointY" | "avatarZoom" | "coverImageUrl" | "coverFocalPointX" | "coverFocalPointY" | "coverZoom"
>;

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type ApiError = {
  error?: string;
};

