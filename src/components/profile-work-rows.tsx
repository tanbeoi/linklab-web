"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import type { Gallery } from "@/types/galleries";
import type { CollabPost } from "@/types/posts";

type ProfileWorkRowsProps = {
    posts: CollabPost[];
    galleries: Gallery[];
    isOwner?: boolean;
};

type WorkRowProps = {
    title: string;
    description: string;
    count: number;
    accent: "amber" | "violet" | "blue";
    emptyMessage: string;
    children: ReactNode;
    showAll: boolean;
    onToggle: () => void;
};

const accentClasses = {
    amber: {
        label: "text-amber-700",
        line: "bg-amber-400",
        button: "text-amber-700 hover:bg-amber-50 focus-visible:outline-amber-600",
    },
    violet: {
        label: "text-violet-700",
        line: "bg-violet-400",
        button: "text-violet-700 hover:bg-violet-50 focus-visible:outline-violet-600",
    },
    blue: {
        label: "text-blue-700",
        line: "bg-blue-400",
        button: "text-blue-700 hover:bg-blue-50 focus-visible:outline-blue-600",
    },
};

function WorkRow({ title, description, count, accent, emptyMessage, children, showAll, onToggle }: WorkRowProps) {
    const colors = accentClasses[accent];

    return (
        <section className="border-t border-slate-200 py-8 first:border-t-0 first:pt-0" aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <span aria-hidden="true" className={`h-px w-8 ${colors.line}`} />
                        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${colors.label}`}>{title}</p>
                    </div>
                    <p id={`${title.toLowerCase().replaceAll(" ", "-")}-heading`} className="mt-2 text-sm text-slate-600">{description}</p>
                </div>
                {count > 3 && (
                    <button
                        type="button"
                        aria-expanded={showAll}
                        onClick={onToggle}
                        className={`rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${colors.button}`}
                    >
                        {showAll ? "Show less" : `View all ${count} →`}
                    </button>
                )}
            </div>
            {count === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">{emptyMessage}</p> : children}
        </section>
    );
}

function GalleryCard({ gallery, isOwner }: { gallery: Gallery; isOwner: boolean }) {
    const href = isOwner ? `/galleries/${gallery.id}/edit` : `/galleries/${gallery.id}`;
    const kind = gallery.purpose === 1 ? "Moodboard" : "Portfolio";
    const color = gallery.purpose === 1 ? "violet" : "blue";

    return (
        <Link href={href} className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {gallery.previewImageUrl ? <MoodboardThumbnail src={gallery.previewImageUrl} alt={`Preview for ${gallery.title}`} focalPointX={gallery.thumbnailFocalPointX} focalPointY={gallery.thumbnailFocalPointY} zoom={gallery.thumbnailZoom} /> : <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">No images yet</div>}
            </div>
            <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-semibold text-slate-900 group-hover:text-blue-700">{gallery.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${color === "violet" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>{kind}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{gallery.photoCount} {gallery.photoCount === 1 ? "photo" : "photos"}{isOwner && ` · ${gallery.isPublished ? "Published" : "Draft"}`}</p>
            </div>
        </Link>
    );
}

function PostCard({ post, isOwner }: { post: CollabPost; isOwner: boolean }) {
    const href = isOwner ? `/my-posts/${post.id}/edit` : `/posts/${post.id}`;

    return (
        <Link href={href} className="group block rounded-xl border border-amber-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Collaboration post</p>
            <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-slate-900 group-hover:text-amber-800">{post.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{post.description}</p>
            <p className="mt-4 text-sm text-slate-500">{post.isRemote ? "Remote" : post.location}</p>
        </Link>
    );
}

export function ProfileWorkRows({ posts, galleries, isOwner = false }: ProfileWorkRowsProps) {
    const [postsVisible, setPostsVisible] = useState(false);
    const [moodboardsVisible, setMoodboardsVisible] = useState(false);
    const [portfoliosVisible, setPortfoliosVisible] = useState(false);
    const moodboards = galleries.filter((gallery) => gallery.purpose === 1);
    const portfolios = galleries.filter((gallery) => gallery.purpose === 0);

    const rows = [
        {
            title: "Collaboration posts",
            description: isOwner ? "Manage your collaboration posts and review applicants." : "Collaboration opportunities this creator has shared.",
            count: posts.length,
            accent: "amber" as const,
            emptyMessage: isOwner ? "You have not created a collaboration post yet." : "No public collaboration posts yet.",
            showAll: postsVisible,
            onToggle: () => setPostsVisible((visible) => !visible),
            cards: posts.map((post) => <PostCard key={post.id} post={post} isOwner={isOwner} />),
        },
        {
            title: "Moodboards",
            description: isOwner ? "Edit the creative direction for your projects." : "Published creative direction and visual references.",
            count: moodboards.length,
            accent: "violet" as const,
            emptyMessage: isOwner ? "You have not created a moodboard yet." : "No public moodboards yet.",
            showAll: moodboardsVisible,
            onToggle: () => setMoodboardsVisible((visible) => !visible),
            cards: moodboards.map((gallery) => <GalleryCard key={gallery.id} gallery={gallery} isOwner={isOwner} />),
        },
        {
            title: "Portfolio galleries",
            description: isOwner ? "Edit and publish finished work." : "Published work created by this collaborator.",
            count: portfolios.length,
            accent: "blue" as const,
            emptyMessage: isOwner ? "You have not created a portfolio gallery yet." : "No public portfolio galleries yet.",
            showAll: portfoliosVisible,
            onToggle: () => setPortfoliosVisible((visible) => !visible),
            cards: portfolios.map((gallery) => <GalleryCard key={gallery.id} gallery={gallery} isOwner={isOwner} />),
        },
    ];

    return (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {rows.map((row) => (
                <div key={row.title} className="relative">
                    <WorkRow {...row}>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {row.cards.slice(0, row.showAll ? undefined : 3)}
                        </div>
                    </WorkRow>
                </div>
            ))}
        </div>
    );
}
