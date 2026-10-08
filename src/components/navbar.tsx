"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";

const desktopLinkClassName =
    "rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900";

const mobileLinkClassName =
    "block rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900";

export function Navbar() {
    const router = useRouter();
    const { isAuthenticated, isLoading, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsMenuOpen(false);
            }
        }

        if (isMenuOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isMenuOpen]);

    function handleLogout() {
        setIsMenuOpen(false);
        logout();
        router.push("/login");
    }

    function closeMenu() {
        setIsMenuOpen(false);
    }

    return (
        <header className="shrink-0 border-b border-slate-200 bg-white">
            <nav className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
                <div className="grid grid-cols-3 items-center sm:hidden">
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(true)}
                        aria-label="Open navigation menu"
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-navigation"
                        className="flex size-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
                    >
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="size-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <Link
                        href="/"
                        className="flex items-center justify-self-center gap-2 text-xl font-bold tracking-tight text-slate-900"
                    >
                        <Image
                            src="/linklab-logo-mark.png"
                            alt=""
                            width={28}
                            height={28}
                            className="size-7"
                        />
                        <span>LinkLab</span>
                    </Link>

                    <div aria-hidden="true" />
                </div>

                <div className="hidden items-center justify-between sm:flex">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900"
                    >
                        <Image
                            src="/linklab-logo-mark.png"
                            alt=""
                            width={28}
                            height={28}
                            className="size-7"
                        />
                        <span>LinkLab</span>
                    </Link>

                    <div className="flex flex-wrap items-center gap-1">
                        {!isLoading &&
                            (isAuthenticated ? (
                                <>
                                    <Link href="/dashboard" className={desktopLinkClassName}>
                                        Dashboard
                                    </Link>
                                    <Link href="/posts" className={desktopLinkClassName}>
                                        Posts
                                    </Link>
                                    <Link href="/posts/new" className={desktopLinkClassName}>
                                        Create post
                                    </Link>
                                    <Link href="/galleries" className={desktopLinkClassName}>
                                        Public Galleries
                                    </Link>
                                    <Link href="/galleries/mine" className={desktopLinkClassName}>
                                        My Galleries
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
                                    <Link href="/posts" className={desktopLinkClassName}>
                                        Posts
                                    </Link>
                                    <Link href="/galleries" className={desktopLinkClassName}>
                                        Public Galleries
                                    </Link>
                                    <Link href="/login" className={desktopLinkClassName}>
                                        Login
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                    >
                                        Register
                                    </Link>
                                </>
                            ))}
                    </div>
                </div>
            </nav>

            {isMenuOpen && (
                <div className="fixed inset-0 z-50 sm:hidden">
                    <button
                        type="button"
                        aria-label="Close navigation menu"
                        onClick={closeMenu}
                        className="absolute inset-0 bg-slate-900/40"
                    />

                    <aside
                        id="mobile-navigation"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation menu"
                        className="relative flex h-dvh w-72 max-w-[85vw] flex-col bg-white p-5 shadow-xl"
                    >
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-lg font-bold text-slate-900">
                                <Image
                                    src="/linklab-logo-mark.png"
                                    alt=""
                                    width={24}
                                    height={24}
                                    className="size-6"
                                />
                                LinkLab
                            </span>
                            <button
                                type="button"
                                onClick={closeMenu}
                                aria-label="Close navigation menu"
                                className="flex size-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
                            >
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="size-6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="m6 6 12 12M18 6 6 18" />
                                </svg>
                            </button>
                        </div>

                        <div className="mt-6 space-y-1">
                            {!isLoading &&
                                (isAuthenticated ? (
                                    <>
                                        <Link href="/dashboard" onClick={closeMenu} className={mobileLinkClassName}>
                                            Dashboard
                                        </Link>
                                        <Link href="/posts" onClick={closeMenu} className={mobileLinkClassName}>
                                            Posts
                                        </Link>
                                        <Link href="/posts/new" onClick={closeMenu} className={mobileLinkClassName}>
                                            Create post
                                        </Link>
                                        <Link href="/galleries" onClick={closeMenu} className={mobileLinkClassName}>
                                            Public Galleries
                                        </Link>
                                        <Link href="/galleries/mine" onClick={closeMenu} className={mobileLinkClassName}>
                                            My Galleries
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-3 text-left text-base font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/posts" onClick={closeMenu} className={mobileLinkClassName}>
                                            Posts
                                        </Link>
                                        <Link href="/galleries" onClick={closeMenu} className={mobileLinkClassName}>
                                            Public Galleries
                                        </Link>
                                        <Link href="/login" onClick={closeMenu} className={mobileLinkClassName}>
                                            Login
                                        </Link>
                                        <Link
                                            href="/register"
                                            onClick={closeMenu}
                                            className="mt-3 block rounded-md bg-blue-600 px-3 py-3 text-base font-medium text-white hover:bg-blue-700"
                                        >
                                            Register
                                        </Link>
                                    </>
                                ))}
                        </div>
                    </aside>
                </div>
            )}
        </header>
    );
}
