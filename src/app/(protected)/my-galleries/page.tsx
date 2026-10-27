"use client";

import { useEffect, useState } from "react";

import { GalleryViewer } from "@/components/gallery-viewer";
import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import {
    galleryPurposeLabels,
    type Gallery,
} from "@/types/galleries";
import Link from "next/link";

export default function MyGalleriesPage() {
    const { user, isLoading: isCheckingSession } = useAuth();
    const userId = user?.id;
    const [viewingGallery, setViewingGallery] = useState<{ gallery: Gallery } | null>(null);
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadGalleries() {
            if (isCheckingSession || !userId) return;

            setIsLoading(true);
            setError("");
            setViewingGallery(null);

            try {
                const data = await apiRequest<Gallery[]>("/api/galleries/mine");

                if (!cancelled) {
                    setGalleries(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Could not load your galleries.",
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
    }, [isCheckingSession, userId]);

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            My Galleries
                        </h1>
                        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                            Your private and published galleries, including moodboards
                            linked to collaboration posts.
                        </p>
                    </div>
                    <Link
                        href="/galleries/new"
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Create gallery
                    </Link>
                </div>

                {isLoading ? (
                    <p className="mt-8 text-slate-600">Loading your galleries...</p>
                ) : error ? (
                    <p
                        role="alert"
                        className="mt-8 rounded-md border border-red-200 bg-red-50 p-4 text-red-700"
                    >
                        {error}
                    </p>
                ) : galleries.length === 0 ? (
                    <p className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                        You have not created any galleries yet.
                    </p>
                ) : (
                    <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {galleries.map((gallery) => (
                            <article
                                key={gallery.id}
                                className="group relative min-w-0"
                            >
                                <Link
                                    href={`/galleries/${gallery.id}/edit`}
                                    aria-label={`Edit ${gallery.title}`}
                                    className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg text-slate-700 shadow-sm transition hover:bg-white hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                                >
                                    <span aria-hidden="true">⚒</span>
                                </Link>
                                <button type="button" onClick={() => setViewingGallery({ gallery })}
                                    aria-label={`View ${gallery.title}`}
                                    className="relative block w-full aspect-[4/3] overflow-hidden rounded-md bg-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600">
                                    {gallery.previewImageUrl ? (
                                        <MoodboardThumbnail
                                            src={gallery.previewImageUrl}
                                            alt={`Preview for ${gallery.title}`}
                                            focalPointX={gallery.thumbnailFocalPointX}
                                            focalPointY={gallery.thumbnailFocalPointY}
                                            zoom={gallery.thumbnailZoom}
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
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                                        {galleryPurposeLabels[gallery.purpose]}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                        {gallery.isPublished ? "Published" : "Draft"}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm text-slate-500">
                                    {gallery.photoCount} {gallery.photoCount === 1 ? "photo" : "photos"}
                                </p>
                                <p className="mt-1 break-words text-sm text-slate-500">
                                    {gallery.collabPostTitle
                                        ? `Linked post: ${gallery.collabPostTitle}`
                                        : "Not linked to a post"}
                                </p>
                            </article>
                        ))}
                    </section>
                )}
            </div>
            {viewingGallery && <GalleryViewer source={viewingGallery} onClose={() => setViewingGallery(null)} />}
        </main>
    );
}
