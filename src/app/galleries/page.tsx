"use client";

import { useEffect, useState } from "react";

import { GalleryViewer } from "@/components/gallery-viewer";
import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import { apiRequest } from "@/lib/api";
import type { Gallery } from "@/types/galleries";
import type { PagedResponse } from "@/types/posts";

type GalleryFilter = "all" | "moodboard" | "portfolio";

export default function PublicGalleriesPage() {
    const [viewingGallery, setViewingGallery] = useState<{ gallery: Gallery } | null>(null);
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<GalleryFilter>("all");

    const visibleGalleries = galleries.filter((gallery) =>
        filter === "all" ||
        (filter === "moodboard" && gallery.purpose === 1) ||
        (filter === "portfolio" && gallery.purpose === 0),
    );

    useEffect(() => {
        let cancelled = false;

        async function loadGalleries() {
            try {
                const data = await apiRequest<PagedResponse<Gallery>>(
                    "/api/galleries?page=1&pageSize=20",
                );

                if (!cancelled) {
                    setGalleries(data.items);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Could not load public galleries.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadGalleries();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Public Galleries
                    </h1>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600" htmlFor="gallery-filter">
                        Show
                        <select
                            id="gallery-filter"
                            value={filter}
                            onChange={(event) => setFilter(event.target.value as GalleryFilter)}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="all">All galleries</option>
                            <option value="moodboard">Moodboards</option>
                            <option value="portfolio">Portfolios</option>
                        </select>
                    </label>
                </div>
                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                    Explore published creative portfolio projects and moodboards from the
                    LinkLab community.
                </p>

                {isLoading ? (
                    <p className="mt-8 text-slate-600">Loading galleries...</p>
                ) : error ? (
                    <p
                        role="alert"
                        className="mt-8 rounded-md border border-red-200 bg-red-50 p-4 text-red-700"
                    >
                        {error}
                    </p>
                ) : galleries.length === 0 ? (
                    <p className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                        No public galleries have been published yet.
                    </p>
                ) : visibleGalleries.length === 0 ? (
                    <p className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                        No {filter === "moodboard" ? "moodboards" : "portfolios"} have been published yet.
                    </p>
                ) : (
                    <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {visibleGalleries.map((gallery) => (
                            <article
                                key={gallery.id}
                                className="min-w-0"
                            >
                                <button type="button" onClick={() => setViewingGallery({ gallery })}
                                    aria-label={`View ${gallery.title}`}
                                    className="relative block w-full aspect-[4/3] overflow-hidden rounded-md bg-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600">
                                    {gallery.previewImageUrl ? (
                                        <MoodboardThumbnail
                                            src={gallery.previewImageUrl}
                                            alt={`Preview for ${gallery.title}`}
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-500">
                                            No images yet
                                        </div>
                                    )}
                                </button>

                                <h2 className="mt-3 break-words text-base font-semibold text-slate-900">
                                    <button type="button" onClick={() => setViewingGallery({ gallery })} className="text-left hover:underline">{gallery.title}</button>
                                </h2>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                    <p className="font-medium text-slate-700">
                                        {gallery.ownerDisplayName}
                                    </p>
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                                        {gallery.purpose === 1
                                            ? "Moodboard"
                                            : "Portfolio"}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </div>
            {viewingGallery && <GalleryViewer source={viewingGallery} onClose={() => setViewingGallery(null)} />}
        </main>
    );
}
