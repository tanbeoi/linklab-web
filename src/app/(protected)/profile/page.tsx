"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ProfileWorkRows } from "@/components/profile-work-rows";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import type { Gallery } from "@/types/galleries";
import type { CollabPost, MyApplication, PagedResponse, ReceivedApplication } from "@/types/posts";

type ProfileData = {
    posts: CollabPost[];
    galleries: Gallery[];
    submittedApplications: number;
    receivedApplications: number;
};

function ProfileAvatar() {
    return <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow-sm sm:size-24"><svg viewBox="0 0 24 24" fill="currentColor" className="size-11 sm:size-14"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0Z" /></svg></span>;
}

function countLabel(count: number, singular: string) {
    return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export default function ProfilePage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [data, setData] = useState<ProfileData | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isAuthLoading || !user) return;
        let cancelled = false;

        async function loadProfile() {
            setError("");
            try {
                const [posts, galleries, submitted, received] = await Promise.all([
                    apiRequest<PagedResponse<CollabPost>>("/api/posts/mine?page=1&pageSize=50"),
                    apiRequest<Gallery[]>("/api/galleries/mine"),
                    apiRequest<PagedResponse<MyApplication>>("/api/applications/mine?page=1&pageSize=1"),
                    apiRequest<PagedResponse<ReceivedApplication>>("/api/applications/received?page=1&pageSize=1"),
                ]);

                if (!cancelled) {
                    setData({
                        posts: posts.items,
                        galleries,
                        submittedApplications: submitted.totalCount,
                        receivedApplications: received.totalCount,
                    });
                }
            } catch (cause) {
                if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load your profile.");
            }
        }

        void loadProfile();
        return () => { cancelled = true; };
    }, [isAuthLoading, user]);

    if (isAuthLoading || !user) return <main className="flex min-h-full flex-1 items-center justify-center bg-slate-50 px-4 py-10 text-slate-600">Loading your profile…</main>;

    return <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-6xl">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="h-24 bg-gradient-to-r from-amber-100 via-violet-100 to-blue-100 sm:h-32" />
                <div className="relative px-6 pb-7 sm:px-8">
                    <div className="-mt-10 flex flex-wrap items-end justify-between gap-5 sm:-mt-12">
                        <div className="flex items-end gap-4"><ProfileAvatar /><div className="pb-1"><p className="text-sm font-semibold text-slate-500">YOUR LINKLAB PROFILE</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{user.displayName}</h1></div></div>
                        <div className="flex flex-wrap gap-3">
                            <Link href={`/profiles/${user.id}`} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">View public profile ↗</Link>
                            <Link href="/posts/new" className="rounded-md bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700">Create collab post</Link>
                            <Link href="/galleries/new?type=moodboard" className="rounded-md bg-violet-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-800">Create moodboard</Link>
                            <Link href="/galleries/new?type=portfolio" className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">Create portfolio</Link>
                        </div>
                    </div>
                    <p className="mt-5 max-w-2xl leading-7 text-slate-600">Manage your posts, moodboards, portfolios, and collaboration applications.</p>
                </div>
            </section>

            {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}

            {!data && !error ? <p className="mt-8 text-slate-600">Loading your work…</p> : data && <>
                <ProfileWorkRows posts={data.posts} galleries={data.galleries} isOwner />

                <section className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Application management">
                    <Link href="/my-applications" className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-emerald-600">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Applications submitted</p>
                        <p className="mt-3 text-2xl font-bold">{countLabel(data.submittedApplications, "application")}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Check the status of applications you have sent.</p>
                    </Link>
                    <Link href="/received-applications" className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-amber-600">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Applicants to your posts</p>
                        <p className="mt-3 text-2xl font-bold">{countLabel(data.receivedApplications, "application")}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Review people who want to collaborate with you.</p>
                    </Link>
                </section>
            </>}
        </div>
    </main>;
}
