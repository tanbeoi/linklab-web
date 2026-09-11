"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";

import { apiRequest } from "@/lib/api";
import type { AuthResponse } from "@/types/auth";

type AuthGuardProps = {
    children: React.ReactNode;
}

// ({children}: AuthGuardProps) means this function uses the children of AuthGuardProps 
export function AuthGuard({children}: AuthGuardProps)
{
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function checkAuthentication() {
            const token = localStorage.getItem("linklab_token");

            if (!token){
                router.replace("/login");
            }

            try 
            {
                await apiRequest<AuthResponse>("/api/auth/me");
                
                // make sure the component is still mounted before updating the state to avoid memory leaks or errors
                if (!cancelled) 
                {
                    setIsAuthenticated(true);
                } 
            } 
            catch 
            {
                localStorage.removeItem("linklab_token");
                router.replace("/login");
            }
        }

        void checkAuthentication();

        return () => 
        {
            cancelled = true;
        };
    }, [router]);

    // even if router is generally stable, because AuthGuard still uses it, 
    // it is a good practice to include it in the dependency array 

    if (!isAuthenticated) {
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
