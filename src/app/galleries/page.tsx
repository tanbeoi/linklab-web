"use client";

import { useEffect, useState } from "react";

import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import { apiRequest } from "@/lib/api";
import type { Gallery } from "@/types/galleries";
import type { PagedResponse } from "@/types/posts";

export default function PublicGalleriesPage() {
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

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
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Public Galleries
                </h1>
                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                    Explore published creative references and moodboards from the
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
                ) : (
                    <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {galleries.map((gallery) => (
                            <article
                                key={gallery.id}
                                className="min-w-0"
                            >
                                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-200">
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
                                </div>

                                <h2 className="mt-3 break-words text-base font-semibold text-slate-900">
                                    {gallery.title}
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
        </main>
    );
}
