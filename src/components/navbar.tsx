"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Navbar() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        setIsLoggedIn(
            Boolean(localStorage.getItem("linklab_token")),
        );
    }, []);

    function handleLogout() {
        localStorage.removeItem("linklab_token");
        setIsLoggedIn(false);
        router.push("/login");
    }

    return (
        <header className="border-b border-slate-200 bg-white">
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
                <Link
                    href="/"
                    className="text-xl font-bold text-slate-900"
                >
                    LinkLab
                </Link>

                <div className="flex items-center gap-4">
                    <Link
                        href="/posts"
                        className="text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                        Posts
                    </Link>

                    {isLoggedIn ? (
                        <>
                            <Link
                                href="/posts/new"
                                className="text-sm font-medium text-slate-600 hover:text-slate-900"
                            >
                                Create post
                            </Link>

                            <Link
                                href="/dashboard"
                                className="text-sm font-medium text-slate-600 hover:text-slate-900"
                            >
                                Dashboard
                            </Link>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="text-sm font-medium text-slate-600 hover:text-slate-900"
                            >
                                Login
                            </Link>

                            <Link
                                href="/register"
                                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}