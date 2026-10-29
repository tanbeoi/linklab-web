"use client";

import { useState } from "react";
import Link from "next/link";

import { GalleryViewer, type GalleryViewerSource } from "@/components/gallery-viewer";
import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import { ProfileWorkRows } from "@/components/profile-work-rows";
import type { Gallery } from "@/types/galleries";
import type { CollabPost, PortfolioGalleryPreview } from "@/types/posts";

type ProfileContentViewsProps = {
    posts: CollabPost[];
    galleries: Gallery[];
    isOwner?: boolean;
};

type ProfileView = "activity" | "library";

function GalleryPreview({ src, alt, focalPointX = 50, focalPointY = 50, zoom = 1 }: {
    src: string | null;
    alt: string;
    focalPointX?: number;
    focalPointY?: number;
    zoom?: number;
}) {
    if (!src) return <div className="flex h-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500">No images yet</div>;
    return <MoodboardThumbnail src={src} alt={alt} focalPointX={focalPointX} focalPointY={focalPointY} zoom={zoom} />;
}

function PortfolioOutcomeCard({ gallery, onOpen }: { gallery: PortfolioGalleryPreview; onOpen: () => void }) {
    return (
        <button type="button" onClick={onOpen}
            className="group w-60 shrink-0 overflow-hidden rounded-xl border border-blue-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <div className="relative aspect-[4/3] overflow-hidden">
                <GalleryPreview src={gallery.previewImageUrl} alt={`Preview for ${gallery.title}`} focalPointX={gallery.thumbnailFocalPointX} focalPointY={gallery.thumbnailFocalPointY} zoom={gallery.thumbnailZoom} />
            </div>
            <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900 group-hover:text-blue-700">{gallery.title}</p>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Portfolio</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{gallery.photoCount} {gallery.photoCount === 1 ? "photo" : "photos"}</p>
            </div>
        </button>
    );
}

function ProjectActivityCard({ post, isOwner, onOpenGallery }: {
    post: CollabPost;
    isOwner: boolean;
    onOpenGallery: (source: GalleryViewerSource) => void;
}) {
    const moodboardImages = post.moodboardPreviewImageUrls.slice(0, 3);
    const remainingMoodboardImages = Math.max(post.moodboardPhotoCount - moodboardImages.length, 0);
    const hasLinkedWork = moodboardImages.length > 0 || post.portfolioGalleries.length > 0;

    return (
        <article className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
            <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Collaboration post</p>
                            {post.isClosed && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Closed</span>}
                        </div>
                        <Link href={`/posts/${post.id}`} className="mt-2 block w-fit text-xl font-bold tracking-tight text-slate-900 hover:text-amber-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-600 sm:text-2xl">{post.title}</Link>
                        <p className="mt-3 line-clamp-4 whitespace-pre-wrap leading-7 text-slate-600">{post.description}</p>
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span>{post.isRemote ? "Remote" : post.location}</span>
                            <span>Posted {new Date(post.createdAtUtc).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        {isOwner ? <>
                            <Link href={`/my-posts/${post.id}/edit`} className="rounded-md bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Manage post</Link>
                            <Link href={`/my-posts/${post.id}/applications`} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600">Applicants</Link>
                        </> : <Link href={`/posts/${post.id}`} className="rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">View post</Link>}
                    </div>
                </div>

                {hasLinkedWork ? <div className="mt-6 grid items-start gap-4 xl:grid-cols-2">
                    {moodboardImages.length > 0 && <button type="button" onClick={() => onOpenGallery({ postId: post.id })}
                        className="group rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
                        <div className="flex items-center gap-3"><span aria-hidden="true" className="h-px w-8 bg-violet-400" /><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Creative direction</p></div>
                        <p className="mt-2 text-sm text-slate-600">Moodboard for this collaboration</p>
                        <div className="mt-4 flex h-28 overflow-hidden rounded-lg bg-violet-100 sm:h-32">
                            {moodboardImages.map((imageUrl, index) => <div key={imageUrl} className="relative min-w-0 flex-1 overflow-hidden border-r border-white last:border-r-0"><GalleryPreview src={imageUrl} alt={`Moodboard image ${index + 1} for ${post.title}`} /></div>)}
                            {remainingMoodboardImages > 0 && <div className="flex w-20 shrink-0 items-center justify-center bg-slate-950/75 text-xl font-bold text-white">+{remainingMoodboardImages}</div>}
                        </div>
                    </button>}

                    {post.portfolioGalleries.length > 0 && <section className="overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 shadow-sm" aria-label="Project outcomes">
                        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span aria-hidden="true" className="h-px w-8 bg-blue-400" /><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Project outcomes</p></div><span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">{post.portfolioGalleries.length} {post.portfolioGalleries.length === 1 ? "portfolio" : "portfolios"}</span></div>
                        <p className="mt-2 text-sm text-slate-600">Work created from this collaboration.</p>
                        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
                            {post.portfolioGalleries.map((gallery) => <PortfolioOutcomeCard key={gallery.id} gallery={gallery} onOpen={() => onOpenGallery({ galleryId: gallery.id })} />)}
                        </div>
                    </section>}
                </div> : <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">No moodboard or portfolio work is linked to this post yet.</p>}
            </div>
        </article>
    );
}

function ProjectActivityView({ posts, isOwner }: { posts: CollabPost[]; isOwner: boolean }) {
    const [viewerSource, setViewerSource] = useState<GalleryViewerSource | null>(null);

    return <>
        <div className="mt-5 space-y-5">
            {posts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-500">{isOwner ? "You have not created a collaboration post yet." : "No public collaboration posts yet."}</div>
                : posts.map((post) => <ProjectActivityCard key={post.id} post={post} isOwner={isOwner} onOpenGallery={setViewerSource} />)}
        </div>
        {viewerSource && <GalleryViewer source={viewerSource} onClose={() => setViewerSource(null)} />}
    </>;
}

export function ProfileContentViews({ posts, galleries, isOwner = false }: ProfileContentViewsProps) {
    const [view, setView] = useState<ProfileView>("activity");
    const isActivity = view === "activity";

    return (
        <section className="mt-8" aria-labelledby="profile-content-heading">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Profile content</p>
                    <h2 id="profile-content-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{isActivity ? "Project activity" : "Component library"}</h2>
                    <p className="mt-1 text-sm text-slate-600">{isActivity ? "See each collaboration as a complete project, from direction to finished work." : "Browse collaboration posts, moodboards, and portfolio galleries separately."}</p>
                </div>
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">View
                    <select value={view} onChange={(event) => setView(event.target.value as ProfileView)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                        <option value="activity">Project activity</option>
                        <option value="library">Component library</option>
                    </select>
                </label>
            </div>
            {isActivity ? <ProjectActivityView posts={posts} isOwner={isOwner} /> : <ProfileWorkRows posts={posts} galleries={galleries} isOwner={isOwner} />}
        </section>
    );
}
