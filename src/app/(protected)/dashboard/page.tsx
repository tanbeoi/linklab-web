"use client";

import Link from "next/link";

import { useAuth } from "@/contexts/auth-context";
import { UserProfileLink } from "@/components/user-profile-link";

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                    <p className="text-sm font-semibold text-amber-700">Welcome to LinkLab</p>
                    <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">Start a creative project, from first idea to finished work.</h1>
                    <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Use a collaboration post to find people, a moodboard to share the direction, and a portfolio to show what the project became.</p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link href="/posts/new" className="rounded-md bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700">Create a collaboration post</Link>
                        <Link href="/profile" className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Go to my profile</Link>
                    </div>
                </section>

                <section className="mt-8" aria-labelledby="linklab-process-heading">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div><p className="text-sm font-semibold text-slate-500">HOW LINKLAB WORKS</p><h2 id="linklab-process-heading" className="mt-1 text-2xl font-bold tracking-tight">Pick the part that matches where you are.</h2></div>
                        <p className="text-sm text-slate-500">Hey {user ? <UserProfileLink userId={user.id}>{user.displayName}</UserProfileLink> : "there"}, you do not need all three to get started.</p>
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        <article className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">01 · Collaboration post</p>
                            <h3 className="mt-3 text-xl font-semibold">Use this when you need collaborators.</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">Describe the project, who you need, where or when it happens, and any must-haves. People can apply, and you decide who joins.</p>
                            <div className="mt-6 flex flex-wrap gap-3"><Link href="/posts/new" className="text-sm font-semibold text-amber-700 hover:underline">Create a collab post →</Link><Link href="/posts" className="text-sm font-medium text-slate-600 hover:text-amber-700 hover:underline">Browse posts</Link></div>
                        </article>
                        <article className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">02 · Moodboard</p>
                            <h3 className="mt-3 text-xl font-semibold">Use this when the project needs a visual brief.</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">Upload and arrange references that show the look, feeling, and direction. Link it to a collab post so applicants can see the vision.</p>
                            <div className="mt-6 flex flex-wrap gap-3"><Link href="/galleries/new?type=moodboard" className="text-sm font-semibold text-violet-700 hover:underline">Create a moodboard →</Link><Link href="/galleries?type=moodboard" className="text-sm font-medium text-slate-600 hover:text-violet-700 hover:underline">Explore moodboards</Link></div>
                        </article>
                        <article className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-6 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">03 · Portfolio</p>
                            <h3 className="mt-3 text-xl font-semibold">Use this when you have finished work to share.</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">Upload the final images, link the gallery back to the collab post, then publish it to show the outcome of the project.</p>
                            <div className="mt-6 flex flex-wrap gap-3"><Link href="/galleries/new?type=portfolio" className="text-sm font-semibold text-blue-700 hover:underline">Create a portfolio →</Link><Link href="/galleries?type=portfolio" className="text-sm font-medium text-slate-600 hover:text-blue-700 hover:underline">Explore portfolios</Link></div>
                        </article>
                    </div>
                </section>
            </div>
        </main>
    );
}
