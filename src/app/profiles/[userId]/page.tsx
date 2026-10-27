"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ProfileWorkRows } from "@/components/profile-work-rows";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ProfileCover } from "@/components/profile-cover";
import { UserProfileLink } from "@/components/user-profile-link";
import { apiRequest } from "@/lib/api";
import type { PublicProfile } from "@/types/auth";
import type { Gallery } from "@/types/galleries";
import type { CollabPost, PagedResponse } from "@/types/posts";

type PublicProfileData = {
    profile: PublicProfile;
    posts: CollabPost[];
    galleries: Gallery[];
};

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
                <ProfileCover imageUrl={data.profile.coverImageUrl} focalPointX={data.profile.coverFocalPointX} focalPointY={data.profile.coverFocalPointY} zoom={data.profile.coverZoom} alt={`${data.profile.displayName}'s profile cover`} className="h-24 sm:h-32" />
                <div className="relative px-6 pb-7 sm:px-8">
                    <div className="-mt-10 flex items-end gap-4 sm:-mt-12">
                        <ProfileAvatar imageUrl={data.profile.avatarImageUrl} focalPointX={data.profile.avatarFocalPointX} focalPointY={data.profile.avatarFocalPointY} zoom={data.profile.avatarZoom} className="size-20 border-4 border-white sm:size-24" iconClassName="size-11 sm:size-14" />
                        <div className="pb-1"><p className="text-sm font-semibold text-slate-500">LINKLAB PROFILE</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl"><UserProfileLink userId={data.profile.id}>{data.profile.displayName}</UserProfileLink></h1></div>
                    </div>
                    <p className="mt-5 max-w-2xl leading-7 text-slate-600">Collaboration posts, moodboards, and portfolio work.</p>
                </div>
            </section>

            <ProfileWorkRows posts={data.posts} galleries={data.galleries} />
        </div>
    </main>;
}
