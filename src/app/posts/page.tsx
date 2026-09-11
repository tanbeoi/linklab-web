"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { CollabPost, PagedResponse } from "@/types/posts";

export default function ListPostsPage() {
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [postsResponse, setPostsResponse] = useState<PagedResponse<CollabPost> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
        <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-3xl">
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
                            {postsResponse.items.map((post) => (
                                <article key={post.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                    <h2 className="text-xl font-semibold text-slate-900">{post.title}</h2>
                                    <p className="mt-3 leading-7 text-slate-600">{post.description}</p>
                                    <div className="mt-4 space-y-1 text-sm text-slate-500 sm:flex sm:items-center sm:gap-4 sm:space-y-0">
                                        <p>{post.isRemote ? "Remote" : post.location}</p>
                                        <p>Posted by {post.ownerDisplayName}</p>
                                        <p>{new Date(post.createdAtUtc).toLocaleDateString()}</p>
                                    </div>
                                </article>
                            ))}
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
        </main>
    );
}
