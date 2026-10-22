"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { Gallery } from "@/types/galleries";
import type { CollabPost } from "@/types/posts";

type CollaborationOriginProps = {
    gallery: Pick<
        Gallery,
        "purpose" | "collabPostId" | "collabPostTitle" | "ownerDisplayName"
    >;
};

function shortenExcerpt(description: string) {
    const limit = 180;
    return description.length > limit
        ? `${description.slice(0, limit).trimEnd()}…`
        : description;
}

export function CollaborationOrigin({ gallery }: CollaborationOriginProps) {
    const [post, setPost] = useState<CollabPost | null>(null);
    const isLinkedPortfolio =
        gallery.purpose === 0 && Boolean(gallery.collabPostId);

    useEffect(() => {
        if (!isLinkedPortfolio || !gallery.collabPostId) {
            return;
        }

        const controller = new AbortController();

        async function loadPost() {
            try {
                const response = await apiRequest<CollabPost>(
                    `/api/posts/${gallery.collabPostId}`,
                    { signal: controller.signal },
                );
                if (!controller.signal.aborted) {
                    setPost(response);
                }
            } catch {
                // The gallery is still useful even if the post details are unavailable.
            }
        }

        void loadPost();
        return () => controller.abort();
    }, [gallery.collabPostId, isLinkedPortfolio]);

    if (!isLinkedPortfolio || !gallery.collabPostId) {
        return null;
    }

    const postTitle = post?.title ?? gallery.collabPostTitle ?? "Linked collaboration";

    return (
        <section className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5 text-slate-900 shadow-lg shadow-blue-950/10 sm:p-6">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-blue-200/50 blur-2xl" />
            <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                    Collaboration origin
                </p>
                <h2 className="mt-2 max-w-3xl text-xl font-semibold tracking-tight sm:text-2xl">
                    {postTitle}
                </h2>
                {post?.description && (
                    <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                        {shortenExcerpt(post.description)}
                    </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                    <span>{post?.isRemote ? "Remote collaboration" : post?.location ?? "Collaboration project"}</span>
                    <span>Portfolio by {gallery.ownerDisplayName || "the gallery owner"}</span>
                </div>
                <Link
                    href={`/posts/${gallery.collabPostId}`}
                    className="mt-5 inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    View collaboration →
                </Link>
            </div>
        </section>
    );
}
