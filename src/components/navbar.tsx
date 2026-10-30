"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { ProfileAvatar } from "@/components/profile-avatar";

const desktopLinkClassName =
    "rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900";

const mobileLinkClassName =
    "block rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900";

function ThreeLinkLogoMark({ className }: { className: string }) {
    return <svg aria-hidden="true" viewBox="0 0 32 32" className={`${className} shrink-0`} fill="none">
        <path d="M6.5 21.5 16 10.5l9.5 8" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6.5" cy="21.5" r="4.5" fill="#f59e0b" />
        <circle cx="16" cy="10.5" r="4.5" fill="#7c3aed" />
        <circle cx="25.5" cy="18.5" r="4.5" fill="#2563eb" />
    </svg>;
}

export function Navbar() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLElement>(null);
    const mobileMenuCloseButtonRef = useRef<HTMLButtonElement>(null);
    const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isMenuOpen) return;

        const previousOverflow = document.body.style.overflow;
        const mobileMenuTrigger = mobileMenuTriggerRef.current;
        document.body.style.overflow = "hidden";
        mobileMenuCloseButtonRef.current?.focus();

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                setIsMenuOpen(false);
                return;
            }

            if (event.key !== "Tab" || !mobileMenuRef.current) return;

            const focusable = Array.from(
                mobileMenuRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((element) => !element.hasAttribute("hidden"));
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            if (mobileMenuTrigger?.isConnected) {
                mobileMenuTrigger.focus({ preventScroll: true });
            }
        };
    }, [isMenuOpen]);

    function openMenu() {
        setIsMenuOpen(true);
    }

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
                        onClick={openMenu}
                        ref={mobileMenuTriggerRef}
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
                        href="/dashboard"
                        className="flex items-center justify-self-center gap-2 text-xl font-bold tracking-tight text-slate-900"
                    >
                        <ThreeLinkLogoMark className="size-7" />
                        <span>LinkLab</span>
                    </Link>

                    <div aria-hidden="true" />
                </div>

                <div className="hidden items-center justify-between sm:flex">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900"
                    >
                        <ThreeLinkLogoMark className="size-7" />
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
                                    <Link href="/chats" className={desktopLinkClassName}>
                                        Chats
                                    </Link>
                                    <Link href="/galleries?type=moodboard" className={desktopLinkClassName}>
                                        Moodboards
                                    </Link>
                                    <Link href="/galleries?type=portfolio" className={desktopLinkClassName}>
                                        Portfolios
                                    </Link>
                                    <Link href="/my-galleries" className={desktopLinkClassName}>
                                        My galleries
                                    </Link>
                                    <Link
                                        href="/profile"
                                        aria-label="Open your profile"
                                        title="Your profile"
                                        className="group ml-1 rounded-full p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                    >
                                        <ProfileAvatar imageUrl={user?.avatarImageUrl} focalPointX={user?.avatarFocalPointX} focalPointY={user?.avatarFocalPointY} zoom={user?.avatarZoom} className="size-9 transition group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700" iconClassName="size-5" />
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link href="/posts" className={desktopLinkClassName}>
                                        Posts
                                    </Link>
                                    <Link href="/galleries?type=moodboard" className={desktopLinkClassName}>
                                        Moodboards
                                    </Link>
                                    <Link href="/galleries?type=portfolio" className={desktopLinkClassName}>
                                        Portfolios
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
                        ref={mobileMenuRef}
                        id="mobile-navigation"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation menu"
                        className="relative flex h-dvh w-72 max-w-[85vw] flex-col bg-white p-5 shadow-xl"
                    >
                        <div className="flex items-center justify-between">
                            <Link href="/dashboard" onClick={closeMenu} className="flex items-center gap-2 text-lg font-bold text-slate-900">
                                <ThreeLinkLogoMark className="size-6" />
                                LinkLab
                            </Link>
                            <button
                                ref={mobileMenuCloseButtonRef}
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
                                        <Link href="/chats" onClick={closeMenu} className={mobileLinkClassName}>
                                            Chats
                                        </Link>
                                        <Link href="/galleries?type=moodboard" onClick={closeMenu} className={mobileLinkClassName}>
                                            Moodboards
                                        </Link>
                                        <Link href="/galleries?type=portfolio" onClick={closeMenu} className={mobileLinkClassName}>
                                            Portfolios
                                        </Link>
                                        <Link href="/my-galleries" onClick={closeMenu} className={mobileLinkClassName}>
                                            My galleries
                                        </Link>
                                        <Link href="/profile" onClick={closeMenu} className="flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                                            <ProfileAvatar imageUrl={user?.avatarImageUrl} focalPointX={user?.avatarFocalPointX} focalPointY={user?.avatarFocalPointY} zoom={user?.avatarZoom} className="size-9" iconClassName="size-5" />
                                            Your profile
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
                                        <Link href="/galleries?type=moodboard" onClick={closeMenu} className={mobileLinkClassName}>
                                            Moodboards
                                        </Link>
                                        <Link href="/galleries?type=portfolio" onClick={closeMenu} className={mobileLinkClassName}>
                                            Portfolios
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
