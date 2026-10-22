"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { useRouter } from "next/navigation";

import { apiRequest, UNAUTHORIZED_EVENT } from "@/lib/api";
import type { AuthResponse, AuthUser } from "@/types/auth";

type AuthContextValue = {
    user: AuthUser | null;
    isAuthenticated: boolean;

    // isLoading: whether the app is still checking a saved token on first load 
    isLoading: boolean;

    // login saves token and user after login or registration
    login: (authResponse: AuthResponse) => void;

    // remove token and clear the user 
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(
    undefined,
);

export function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const login = useCallback((authResponse: AuthResponse) => {
        localStorage.setItem("linklab_token", authResponse.token);
        setUser(authResponse.user);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("linklab_token");
        setUser(null);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function restoreSession() {
            const token = localStorage.getItem("linklab_token");

            if (!token) {
                if (!cancelled) {
                    setIsLoading(false);
                }

                return;
            }

            try {
                const user = await apiRequest<AuthUser>("/api/auth/me");

                if (!cancelled) {
                    setUser(user);
                }
            } catch {
                logout();
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void restoreSession();

        return () => {
            cancelled = true;
        };
    }, [logout]);

    // localStorage is shared by every LinkLab tab. When another tab signs in or
    // out, refresh this tab's in-memory user too so ownership checks and API
    // requests always refer to the same account.
    useEffect(() => {
        function handleTokenChange(event: StorageEvent) {
            if (event.key !== "linklab_token") return;

            if (!event.newValue) {
                setUser(null);
                return;
            }

            void apiRequest<AuthUser>("/api/auth/me")
                .then((activeUser) => setUser(activeUser))
                .catch(() => logout());
        }

        window.addEventListener("storage", handleTokenChange);
        return () => window.removeEventListener("storage", handleTokenChange);
    }, [logout]);

    useEffect(() => {
        function handleUnauthorized() {
            logout();

            const returnTo =
                window.location.pathname + window.location.search;

            router.replace(
                `/login?next=${encodeURIComponent(returnTo)}`,
            );
        }

        window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

        return () => {
            window.removeEventListener(
                UNAUTHORIZED_EVENT,
                handleUnauthorized,
            );
        };
    }, [logout, router]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: user !== null,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// Reads the value placed intisde AuthContext by <AuthProvider>
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}
