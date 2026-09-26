"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { CollabPost, PagedResponse } from "@/types/posts";
import { ApplicationForm } from "@/components/application-form";
import Image from "next/image";
import Link from "next/link";

function truncateWords(text: string, limit = 100) {
    // Find all non-whitespace characters 
    const words = [...text.matchAll(/\S+/g)];

    if (words.length <= limit) {
        return text;
    }

    // Find out exactly where the last word ends in index 
    const finalWord = words[limit - 1];
    const endIndex = finalWord.index + finalWord[0].length;
    
    return `${text.slice(0, endIndex)}...`;
}

export default function ListPostsPage() {
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [postsResponse, setPostsResponse] = useState<PagedResponse<CollabPost> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<CollabPost | null>(null);

    useEffect(() => {

        let cancelled = false;

        async function listPosts() {
            setIsLoading(true);
            setError("");

            try {
                const data = await apiRequest<PagedResponse<CollabPost>>
                (`/api/posts?page=${page}&pageSize=${pageSize}`);
                
                // make sure the component is still mounted before updating the state to avoid memory leaks or errors
                if (!cancelled) {
                    setPostsResponse(data);
                } 
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Could not load posts.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void listPosts();

        return () => 
        {
            cancelled = true;
        };
    }, [page, pageSize]);


    return (
        <main className="flex h-dvh overflow-hidden bg-slate-50 text-slate-900">
            {/* Left: Posts */}
            <div
                // Because the apply button have stopPropagation, clicking on it doensn't mean clicking on the Posts section
                // Therefore, this part only closes the Apply panel once it has already opened
                onClick={() => {
                    if (selectedPost) {
                        setSelectedPost(null);
                    }
                }}
                className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
            >
                <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Collaboration Posts
                        </h1>
                        <p className="mt-2 leading-7 text-slate-600">
                            Browse opportunities to connect, share ideas, and work with others.
                        </p>
                    </header>

                    <div className="mb-6 flex items-center gap-3">
                        <label htmlFor="pageSize" className="text-sm font-medium text-slate-700">
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
                        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
                            Loading posts...
                        </div>
                    ) : error ? (
                        <div role="alert" className="rounded-lg border border-red-200 bg-white p-6 text-center text-red-700 shadow-sm">
                            {error}
                        </div>
                    ) : !postsResponse || postsResponse.items.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
                            No posts found.
                        </div>
                    ) : (
                        <>
                            <section className="space-y-4" aria-label="Collaboration posts">
                                {postsResponse.items.map((post) => {
                                    const previewImages =
                                        post.moodboardPreviewImageUrls;

                                    const remainingImageCount = Math.max(
                                        post.moodboardPhotoCount - previewImages.length,
                                        0,
                                    );

                                    return (
                                        <article
                                            key={post.id}
                                            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                                        >    
                                            {/* Grid-cols-3 creates 3 equal columns, and col-span-2 makes the content section occupies 2 of those           */}
                                            <div className="grid gap-6 sm:grid-cols-3 sm:items-center">
                                                <div className="min-w-0 sm:col-span-2">
                                                    <h2 className="break-words text-xl font-semibold text-slate-900">
                                                        {post.title}
                                                    </h2>

                                                    <p className="mt-3 break-words leading-7 text-slate-600">
                                                        {truncateWords(post.description, 50)}
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
                                                            {previewImages.map((imageUrl, index) => {
                                                                const showRemainingCount =
                                                                    index === 2 &&
                                                                    remainingImageCount > 0;

                                                                return (
                                                                    <div
                                                                        key={imageUrl}
                                                                        className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-md bg-slate-100"
                                                                    >
                                                                        <Image
                                                                            src={imageUrl}
                                                                            alt={`Moodboard image ${index + 1} for ${post.title}`}
                                                                            fill
                                                                            sizes="(max-width: 640px) 33vw, 220px"
                                                                            className="object-cover"
                                                                        />

                                                                        {showRemainingCount && (
                                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                                                                <span className="text-2xl font-semibold text-white">
                                                                                    +{remainingImageCount}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    <div className="mt-4 space-y-1 text-sm text-slate-500 sm:flex sm:items-center sm:gap-4 sm:space-y-0">
                                                        <p>
                                                            {post.isRemote ? "Remote" : post.location}
                                                        </p>

                                                        <p>Posted by {post.ownerDisplayName}</p>

                                                        <p>
                                                            {new Date(
                                                                post.createdAtUtc,
                                                            ).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="sm:flex sm:justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            // stopPropagation stops the button from reacting when the user clicks on the posts page, which would otherwise immediately closes the opened panel
                                                            event.stopPropagation();
                                                            setSelectedPost(post);
                                                        }}
                                                        className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </section>

                            <nav className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between" aria-label="Posts pagination">
                                <button
                                    type="button"
                                    disabled={!postsResponse.hasPreviousPage}
                                    onClick={() => setPage((currentPage) => currentPage - 1)}
                                    className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-slate-600">
                                    Page {postsResponse.page} of {postsResponse.totalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={!postsResponse.hasNextPage}
                                    onClick={() => setPage((currentPage) => currentPage + 1)}
                                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:w-auto"
                                >
                                    Next
                                </button>
                            </nav>
                        </>
                    )}
                </div>
            </div>

            {/* Right: Application Preview */}
            {selectedPost && (
                <aside
                    aria-label={`Apply to ${selectedPost.title}`}
                    className="h-full w-1/2 min-w-0 shrink-0 overflow-y-auto overscroll-contain border-l border-slate-200 bg-white"
                >
                    <div className="p-6">
                        <div className="flex items-center justify-between gap-4">
                            <button
                                type="button"
                                onClick={() => setSelectedPost(null)}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                            >
                                Close panel
                            </button>

                            <Link
                                href={`/posts/${selectedPost.id}/apply`}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                title="Open in full page"
                            >
                                Open full page ↗
                            </Link>
                        </div>

                        <h2 className="mt-8 break-words text-2xl font-bold">
                            Apply to {selectedPost.title}
                        </h2>

                        <div className="mt-4 border-b border-slate-200 pb-6">
                            <p className="whitespace-pre-wrap break-words leading-7 text-slate-600">
                                {selectedPost.description}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                                <p>
                                    {selectedPost.isRemote
                                        ? "Remote"
                                        : selectedPost.location}
                                </p>

                                <p>
                                    Posted by {selectedPost.ownerDisplayName}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <ApplicationForm postId={selectedPost.id} />
                        </div>
                    </div>
                </aside>
            )}
        </main>
    );
}
