"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import { apiRequest } from "@/lib/api";
import type { CollabPost, PagedResponse } from "@/types/posts";

export default function MyPostsPage() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [postsResponse, setPostsResponse] =
        useState<PagedResponse<CollabPost> | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadPosts() {
            setIsLoading(true);
            setError("");

            try {
                const data = await apiRequest<PagedResponse<CollabPost>>(
                    `/api/posts/mine?page=${page}&pageSize=${pageSize}`,
                );

                if (!cancelled) {
                    setPostsResponse(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Could not load your posts.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadPosts();

        return () => {
            cancelled = true;
        };
    }, [page, pageSize]);

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        My Posts
                    </h1>
                    <p className="mt-3 leading-7 text-slate-600">
                        Review the collaboration opportunities you have created.
                    </p>
                </header>

                <div className="mt-6 flex items-center gap-3">
                    <label
                        htmlFor="pageSize"
                        className="text-sm font-medium text-slate-700"
                    >
                        Posts per page
                    </label>
                    <select
                        id="pageSize"
                        value={pageSize}
                        onChange={(event) => {
                            setPageSize(Number(event.target.value));
                            setPage(1);
                        }}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                {isLoading ? (
                    <p className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
                        Loading your posts...
                    </p>
                ) : error ? (
                    <p
                        role="alert"
                        className="mt-8 rounded-lg border border-red-200 bg-white p-6 text-center text-red-700 shadow-sm"
                    >
                        {error}
                    </p>
                ) : !postsResponse || postsResponse.items.length === 0 ? (
                    <p className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
                        You have not created any posts yet.
                    </p>
                ) : (
                    <>
                        <section
                            className="mt-8 space-y-4"
                            aria-label="Your collaboration posts"
                        >
                            {postsResponse.items.map((post) => {
                                const previewImages =
                                    post.moodboardPreviewImageUrls ?? [];
                                const remainingImageCount = Math.max(
                                    post.moodboardPhotoCount -
                                        previewImages.length,
                                    0,
                                );

                                return (
                                    <article
                                        key={post.id}
                                        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                                    >
                                        <h2 className="break-words text-xl font-semibold text-slate-900">
                                            {post.title}
                                        </h2>
                                        <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-600">
                                            {post.description}
                                        </p>

                                        {previewImages.length > 0 && (
                                            <div
                                                className={`mt-4 grid gap-2 ${
                                                    previewImages.length === 1
                                                        ? "grid-cols-1"
                                                        : previewImages.length === 2
                                                          ? "grid-cols-2"
                                                          : "grid-cols-3"
                                                }`}
                                            >
                                                {previewImages.map(
                                                    (imageUrl, index) => {
                                                        const showRemainingCount =
                                                            index === 2 &&
                                                            remainingImageCount >
                                                                0;

                                                        return (
                                                            <div
                                                                key={imageUrl}
                                                                className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-md bg-slate-100"
                                                            >
                                                                <MoodboardThumbnail
                                                                    src={imageUrl}
                                                                    alt={`Moodboard image ${index + 1} for ${post.title}`}
                                                                />
                                                                {showRemainingCount && (
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                                                        <span className="text-2xl font-semibold text-white">
                                                                            +
                                                                            {
                                                                                remainingImageCount
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                                            <p>
                                                {post.isRemote
                                                    ? "Remote"
                                                    : post.location}
                                            </p>
                                            <p>
                                                Created {" "}
                                                {new Date(
                                                    post.createdAtUtc,
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <Link
                                            href={`/my-posts/${post.id}/applications`}
                                            className="mt-5 inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            View applicants
                                        </Link>
                                    </article>
                                );
                            })}
                        </section>

                        <nav
                            className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between"
                            aria-label="My posts pagination"
                        >
                            <button
                                type="button"
                                disabled={!postsResponse.hasPreviousPage}
                                onClick={() =>
                                    setPage((currentPage) => currentPage - 1)
                                }
                                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-slate-600">
                                Page {postsResponse.page} of{" "}
                                {postsResponse.totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={!postsResponse.hasNextPage}
                                onClick={() =>
                                    setPage((currentPage) => currentPage + 1)
                                }
                                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:w-auto"
                            >
                                Next
                            </button>
                        </nav>
                    </>
                )}
            </div>
        </main>
    );
}
