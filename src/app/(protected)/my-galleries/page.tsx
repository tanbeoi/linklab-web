"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import { ProjectActivityView } from "@/components/profile-content-views";
import { apiRequest } from "@/lib/api";
import { useGalleryNavigation } from "@/lib/use-gallery-navigation";
import { galleryPurposeLabels, type Gallery } from "@/types/galleries";
import type { CollabPost, PagedResponse } from "@/types/posts";

type GalleryFilter = "all" | "moodboard" | "portfolio";
type WorkspaceView = "galleries" | "activity";

export default function MyGalleriesPage() {
    const [view, setView] = useState<WorkspaceView>("galleries");
    const [filter, setFilter] = useState<GalleryFilter>("all");
    const { openGallery } = useGalleryNavigation();
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [posts, setPosts] = useState<CollabPost[]>([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadWorkspace() {
            setIsLoading(true);
            setError("");

            try {
                const [galleryData, postsData] = await Promise.all([
                    apiRequest<Gallery[]>("/api/galleries/mine"),
                    apiRequest<PagedResponse<CollabPost>>("/api/posts/mine?page=1&pageSize=50"),
                ]);

                if (!cancelled) {
                    setGalleries(galleryData);
                    setPosts(postsData.items);
                }
            } catch (cause) {
                if (!cancelled) {
                    setError(cause instanceof Error ? cause.message : "Could not load your workspace.");
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadWorkspace();

        return () => {
            cancelled = true;
        };
    }, []);

    const visibleGalleries = galleries.filter((gallery) =>
        filter === "all"
        || (filter === "moodboard" && gallery.purpose === 1)
        || (filter === "portfolio" && gallery.purpose === 0),
    );
    const createHref = filter === "moodboard"
        ? "/galleries/new?type=moodboard"
        : filter === "portfolio"
            ? "/galleries/new?type=portfolio"
            : "/galleries/new";
    const createLabel = filter === "moodboard"
        ? "Create moodboard"
        : filter === "portfolio"
            ? "Create portfolio"
            : "Create gallery";
    const createClassName = filter === "moodboard"
        ? "bg-violet-700 hover:bg-violet-800"
        : "bg-blue-600 hover:bg-blue-700";

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My Galleries</h1>
                        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                            Manage your private and published moodboards and portfolios, then connect them to your collaboration posts.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        {view === "galleries" && <label className="flex items-center gap-2 text-sm font-medium text-slate-600" htmlFor="my-gallery-filter">
                            Show
                            <select
                                id="my-gallery-filter"
                                value={filter}
                                onChange={(event) => setFilter(event.target.value as GalleryFilter)}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            >
                                <option value="all">All galleries</option>
                                <option value="moodboard">Moodboards</option>
                                <option value="portfolio">Portfolios</option>
                            </select>
                        </label>}
                        {view === "galleries" && <Link href={createHref} className={`rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-sm ${createClassName}`}>{createLabel}</Link>}
                    </div>
                </header>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="flex rounded-lg bg-slate-200/70 p-1" role="group" aria-label="My galleries view">
                        <button type="button" onClick={() => setView("galleries")} aria-pressed={view === "galleries"} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${view === "galleries" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Gallery library</button>
                        <button type="button" onClick={() => setView("activity")} aria-pressed={view === "activity"} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${view === "activity" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Project activity</button>
                    </div>
                    <Link href="/my-posts" className="text-sm font-semibold text-amber-700 hover:text-amber-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">
                        Manage my posts →
                    </Link>
                </div>

                {isLoading ? (
                    <p className="mt-8 text-slate-600">Loading your workspace...</p>
                ) : error ? (
                    <p role="alert" className="mt-8 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
                ) : view === "activity" ? (
                    <ProjectActivityView posts={posts} isOwner />
                ) : visibleGalleries.length === 0 ? (
                    <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                        <p className="font-medium text-slate-800">No {filter === "all" ? "galleries" : filter === "moodboard" ? "moodboards" : "portfolios"} yet.</p>
                        <p className="mt-2 text-sm text-slate-600">Create one to start building your project story.</p>
                        <Link href={createHref} className={`mt-4 inline-flex rounded-md px-4 py-2 text-sm font-medium text-white ${createClassName}`}>{createLabel}</Link>
                    </div>
                ) : (
                    <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Your galleries">
                        {visibleGalleries.map((gallery) => (
                            <article key={gallery.id} className="group relative min-w-0">
                                <Link
                                    href={`/galleries/${gallery.id}/edit`}
                                    aria-label={`Edit ${gallery.title}`}
                                    className="absolute left-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/95 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                                >
                                    <span aria-hidden="true">Edit</span>
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => openGallery(gallery.id)}
                                    aria-label={`View ${gallery.title}`}
                                    className="relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600"
                                >
                                    {gallery.previewImageUrl ? (
                                        <MoodboardThumbnail src={gallery.previewImageUrl} alt={`Preview for ${gallery.title}`} focalPointX={gallery.thumbnailFocalPointX} focalPointY={gallery.thumbnailFocalPointY} zoom={gallery.thumbnailZoom} />
                                    ) : (
                                        <div className="flex size-full items-center justify-center p-4 text-center text-sm text-slate-500">No images yet</div>
                                    )}
                                </button>
                                <div className="mt-3 flex items-start justify-between gap-3">
                                    <h2 className="min-w-0 break-words text-base font-semibold text-slate-900">
                                        <button type="button" onClick={() => openGallery(gallery.id)} className="text-left hover:underline">{gallery.title}</button>
                                    </h2>
                                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">{galleryPurposeLabels[gallery.purpose]}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                    <span>{gallery.photoCount} {gallery.photoCount === 1 ? "photo" : "photos"}</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{gallery.isPublished ? "Published" : "Draft"}</span>
                                </div>
                                <p className="mt-2 break-words text-sm text-slate-500">{gallery.collabPostTitle ? `Linked post: ${gallery.collabPostTitle}` : "Not linked to a post"}</p>
                            </article>
                        ))}
                    </section>
                )}
            </div>
        </main>
    );
}
