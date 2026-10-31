"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import { FullPageLink } from "@/components/full-page-link";
import { UserProfileLink } from "@/components/user-profile-link";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import { useGalleryNavigation } from "@/lib/use-gallery-navigation";
import type { Gallery } from "@/types/galleries";
import type { PagedResponse } from "@/types/posts";

type GalleryFilter = "all" | "moodboard" | "portfolio";

function filterFromSearch(value: string | null): GalleryFilter {
    return value === "moodboard" || value === "portfolio" ? value : "all";
}

export default function PublicGalleriesPage() {
    return <Suspense fallback={<main className="bg-slate-50 px-4 py-10 text-center text-slate-600 sm:px-6">Loading galleries...</main>}><PublicGalleriesContent /></Suspense>;
}

function PublicGalleriesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { openGallery } = useGalleryNavigation();
    const [galleriesResponse, setGalleriesResponse] = useState<PagedResponse<Gallery> | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const filter = filterFromSearch(searchParams.get("type"));
    const pageTitle = filter === "moodboard" ? "Public Moodboards" : filter === "portfolio" ? "Public Portfolios" : "Public Galleries";
    const pageDescription = filter === "moodboard"
        ? "Each collaboration post can have one moodboard, linked by its creator or an accepted collaborator. Explore published visual references and creative direction from the LinkLab community."
        : filter === "portfolio"
            ? "Accepted collaborators can link any number of portfolio galleries to a collaboration post. Explore published finished work and project outcomes from the LinkLab community."
            : "A collaboration post can have one shared moodboard and any number of portfolio galleries from accepted collaborators. Explore published creative work from the LinkLab community.";
    const createHref = filter === "moodboard" ? "/galleries/new?type=moodboard" : filter === "portfolio" ? "/galleries/new?type=portfolio" : "/galleries/new";
    const createLabel = filter === "moodboard" ? "Create moodboard" : filter === "portfolio" ? "Create portfolio" : "Create gallery";
    const createClassName = filter === "moodboard" ? "bg-violet-700 hover:bg-violet-800" : "bg-blue-600 hover:bg-blue-700";

    const galleries = galleriesResponse?.items ?? [];

    useEffect(() => {
        let cancelled = false;

        async function loadGalleries() {
            setIsLoading(true);
            setError("");
            try {
                const data = await apiRequest<PagedResponse<Gallery>>(
                    `/api/galleries?page=${page}&pageSize=8${filter === "all" ? "" : `&purpose=${filter === "moodboard" ? 1 : 0}`}`,
                );

                if (!cancelled) {
                    setGalleriesResponse(data);
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
    }, [filter, page]);

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        {pageTitle}
                    </h1>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600" htmlFor="gallery-filter">
                            Show
                            <select
                                id="gallery-filter"
                                value={filter}
                                onChange={(event) => {
                                    const nextFilter = event.target.value as GalleryFilter;
                                    setPage(1);
                                    router.push(nextFilter === "all" ? "/galleries" : `/galleries?type=${nextFilter}`);
                                }}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            >
                                <option value="all">All galleries</option>
                                <option value="moodboard">Moodboards</option>
                                <option value="portfolio">Portfolios</option>
                            </select>
                        </label>
                        {isAuthenticated && <FullPageLink href={createHref} className={`rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-sm ${createClassName}`}>{createLabel}</FullPageLink>}
                    </div>
                </div>
                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                    {pageDescription}
                </p>
                {isAuthenticated && <Link href="/my-galleries" className="mt-2 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                    My galleries →
                </Link>}

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
                        No {filter === "all" ? "public galleries" : filter === "moodboard" ? "moodboards" : "portfolios"} have been published yet.
                    </p>
                ) : (
                    <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {galleries.map((gallery) => (
                            <article
                                key={gallery.id}
                                className="min-w-0"
                            >
                                <button type="button" onClick={() => openGallery(gallery.id)}
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
                                    <button type="button" onClick={() => openGallery(gallery.id)} className="text-left hover:underline">{gallery.title}</button>
                                </h2>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                    <p className="font-medium text-slate-700"><UserProfileLink userId={gallery.ownerId}>{gallery.ownerDisplayName}</UserProfileLink></p>
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
                {galleriesResponse && galleriesResponse.totalPages > 1 && !isLoading && !error && <nav className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between" aria-label="Gallery pagination">
                    <button type="button" disabled={!galleriesResponse.hasPreviousPage} onClick={() => setPage((currentPage) => currentPage - 1)} className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto">Previous</button>
                    <span className="text-sm text-slate-600">Page {galleriesResponse.page} of {galleriesResponse.totalPages}</span>
                    <button type="button" disabled={!galleriesResponse.hasNextPage} onClick={() => setPage((currentPage) => currentPage + 1)} className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:w-auto">Next</button>
                </nav>}
            </div>
        </main>
    );
}
