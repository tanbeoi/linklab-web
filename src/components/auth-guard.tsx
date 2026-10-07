"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";

type AuthGuardProps = {
    children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading || isAuthenticated) {
            return;
        }

        const returnTo =
            window.location.pathname + window.location.search;

        router.replace(
            `/login?next=${encodeURIComponent(returnTo)}`,
        );
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || !isAuthenticated) {
        return (
            <main className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-zinc-600">
                    Checking session...
                </p>
            </main>
        );
    }

    return children;
}