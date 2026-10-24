"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ProfileWorkRows } from "@/components/profile-work-rows";
import { apiRequest } from "@/lib/api";
import type { PublicProfile } from "@/types/auth";
import type { Gallery } from "@/types/galleries";
import type { CollabPost, PagedResponse } from "@/types/posts";

type PublicProfileData = {
    profile: PublicProfile;
    posts: CollabPost[];
    galleries: Gallery[];
};

function ProfileAvatar() {
    return <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow-sm sm:size-24"><svg viewBox="0 0 24 24" fill="currentColor" className="size-11 sm:size-14"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0Z" /></svg></span>;
}

export default function PublicProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const [data, setData] = useState<PublicProfileData | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadProfile() {
            setError("");
            setData(null);
            try {
                const [profile, posts, galleries] = await Promise.all([
                    apiRequest<PublicProfile>(`/api/profiles/${userId}`),
                    apiRequest<PagedResponse<CollabPost>>(`/api/posts?ownerId=${userId}&page=1&pageSize=50`),
                    apiRequest<PagedResponse<Gallery>>(`/api/galleries?ownerId=${userId}&page=1&pageSize=50`),
                ]);

                if (!cancelled) setData({ profile, posts: posts.items, galleries: galleries.items });
            } catch (cause) {
                if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this profile.");
            }
        }

        if (userId) void loadProfile();
        return () => { cancelled = true; };
    }, [userId]);

    if (error) return <main className="flex min-h-full flex-1 items-center justify-center bg-slate-50 px-4 py-12"><div className="max-w-md text-center"><p role="alert" className="text-slate-700">{error}</p><Link href="/posts" className="mt-5 inline-block text-sm font-semibold text-amber-700 hover:underline">Browse collaboration posts →</Link></div></main>;
    if (!data) return <main className="flex min-h-full flex-1 items-center justify-center bg-slate-50 px-4 py-12 text-slate-600">Loading profile…</main>;

    return <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-6xl">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="h-24 bg-gradient-to-r from-amber-100 via-violet-100 to-blue-100 sm:h-32" />
                <div className="relative px-6 pb-7 sm:px-8">
                    <div className="-mt-10 flex items-end gap-4 sm:-mt-12">
                        <ProfileAvatar />
                        <div className="pb-1"><p className="text-sm font-semibold text-slate-500">LINKLAB PROFILE</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{data.profile.displayName}</h1></div>
                    </div>
                    <p className="mt-5 max-w-2xl leading-7 text-slate-600">Collaboration posts, moodboards, and portfolio work.</p>
                </div>
            </section>

            <ProfileWorkRows posts={data.posts} galleries={data.galleries} />
        </div>
    </main>;
}
