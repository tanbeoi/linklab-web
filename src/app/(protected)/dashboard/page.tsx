"use client";

import Link from "next/link";

import { useAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
                    <p className="text-sm font-semibold text-amber-700">Welcome to LinkLab</p>
                    <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">An idea can become a collaboration - and then something worth showing.</h1>
                    <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Start with an opportunity, shape its creative direction together, and share the finished work with the community.</p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link href="/posts/new" className="rounded-md bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700">Create a collaboration post</Link>
                        <Link href="/profile" className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Go to my profile</Link>
                    </div>
                </section>

                <section className="mt-8" aria-labelledby="linklab-process-heading">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div><p className="text-sm font-semibold text-slate-500">THE LINKLAB LOOP</p><h2 id="linklab-process-heading" className="mt-1 text-2xl font-bold tracking-tight">Three parts, one creative journey.</h2></div>
                        <p className="text-sm text-slate-500">Hey {user?.displayName}, start wherever you are.</p>
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        <Link href="/posts" className="group rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-amber-600">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">01 · Collaboration posts</p>
                            <h3 className="mt-3 text-xl font-semibold">Find the people your idea needs.</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">Share a brief, discover opportunities, and bring the right creative team together.</p>
                            <p className="mt-6 text-sm font-semibold text-amber-700 group-hover:underline">Browse published posts →</p>
                        </Link>
                        <Link href="/galleries?type=moodboard" className="group rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-violet-700">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">02 · Moodboards</p>
                            <h3 className="mt-3 text-xl font-semibold">Give the project a shared visual language.</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">Collect references, arrange the direction, and link it back to the collaboration.</p>
                            <p className="mt-6 text-sm font-semibold text-violet-700 group-hover:underline">Explore published moodboards →</p>
                        </Link>
                        <Link href="/galleries?type=portfolio" className="group rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">03 · Portfolios</p>
                            <h3 className="mt-3 text-xl font-semibold">Celebrate what the collaboration made.</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">Publish finished work and let the collaboration’s outcome speak for itself.</p>
                            <p className="mt-6 text-sm font-semibold text-blue-700 group-hover:underline">Explore published portfolios →</p>
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
