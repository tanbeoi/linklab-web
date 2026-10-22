"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { GalleryViewer, type GalleryViewerSource } from "@/components/gallery-viewer";
import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import type { CollabPost } from "@/types/posts";

export default function PostPage() {
    const { postId } = useParams<{ postId: string }>();
    const { user } = useAuth();
    const [post, setPost] = useState<CollabPost | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [viewingGallery, setViewingGallery] = useState<GalleryViewerSource | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function loadPost() {
            setIsLoading(true);
            setError("");
            try {
                const data = await apiRequest<CollabPost>(`/api/posts/${postId}`);
                if (!cancelled) setPost(data);
            } catch (cause) {
                if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this post.");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }
        void loadPost();
        return () => { cancelled = true; };
    }, [postId]);

    if (isLoading) return <main className="min-h-full flex-1 bg-slate-50 px-4 py-12 text-center text-slate-600">Loading collaboration...</main>;
    if (error || !post) return <main className="min-h-full flex-1 bg-slate-50 px-4 py-12 text-center text-red-700" role="alert">{error || "Post not found."}</main>;

    const isOwner = user?.id === post.userId;
    const previewImages = post.moodboardPreviewImageUrls ?? [];
    const remainingImageCount = Math.max(post.moodboardPhotoCount - previewImages.length, 0);
    const portfolios = post.portfolioGalleries ?? [];

    return <main className="min-h-full flex-1 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
        <article className="mx-auto max-w-4xl">
            <Link href="/posts" className="text-sm font-medium text-blue-700 hover:underline">← All collaboration posts</Link>
            <header className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Collaboration post</p>
                        <h1 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
                    </div>
                    {isOwner ? <Link href={`/my-posts/${post.id}/edit`} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Edit post</Link>
                        : <Link href={`/posts/${post.id}/apply`} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Apply to collaborate</Link>}
                </div>
                <p className="mt-5 whitespace-pre-wrap break-words text-lg leading-8 text-slate-600">{post.description}</p>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-5 text-sm text-slate-500">
                    <p>{post.isRemote ? "Remote collaboration" : post.location}</p><p>Posted by {post.ownerDisplayName}</p><p>{new Date(post.createdAtUtc).toLocaleDateString()}</p>
                </div>
            </header>

            {previewImages.length > 0 && <section role="button" tabIndex={0} onClick={() => setViewingGallery({ postId: post.id })} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setViewingGallery({ postId: post.id }); } }} className="mt-6 cursor-pointer rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-violet-700 sm:p-6">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Creative direction</p><h2 className="mt-1 text-2xl font-semibold">Moodboard for this collaboration</h2><p className="mt-2 text-slate-600">Open the moodboard to see the full creative direction.</p></div>
                <div className={`mt-5 grid gap-3 ${previewImages.length === 1 ? "grid-cols-1" : previewImages.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {previewImages.map((imageUrl, index) => <div key={imageUrl} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 shadow-sm">
                        <MoodboardThumbnail src={imageUrl} alt={`Moodboard image ${index + 1} for ${post.title}`} />
                        {index === 2 && remainingImageCount > 0 && <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-semibold text-white">+{remainingImageCount}</span>}
                    </div>)}
                </div>
            </section>}

            {portfolios.length > 0 && <section className="mt-6 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Project outcomes</p><h2 className="mt-1 text-2xl font-semibold">Work created from this collaboration</h2><p className="mt-2 text-slate-600">See how the shared idea became finished work.</p></div><span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm">{portfolios.length} portfolio{portfolios.length === 1 ? "" : "s"}</span></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {portfolios.map((portfolio) => <button type="button" key={portfolio.id} onClick={() => setViewingGallery({ galleryId: portfolio.id })} className="group overflow-hidden rounded-xl border border-white bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600">
                        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">{portfolio.previewImageUrl ? <MoodboardThumbnail src={portfolio.previewImageUrl} alt={`Preview of ${portfolio.title}`} /> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Portfolio gallery</div>}</div>
                        <div className="p-4"><div className="flex items-center justify-between gap-2"><h3 className="truncate font-semibold group-hover:text-blue-700">{portfolio.title}</h3><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Portfolio</span></div><p className="mt-1 text-sm text-slate-600">By {portfolio.ownerDisplayName}</p></div>
                    </button>)}
                </div>
            </section>}
        </article>
        {viewingGallery && <GalleryViewer source={viewingGallery} onClose={() => setViewingGallery(null)} />}
    </main>;
}
