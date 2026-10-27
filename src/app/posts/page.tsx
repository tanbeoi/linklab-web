"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { ApplicationStatus, CollabPost, PagedResponse } from "@/types/posts";
import { ApplicationForm } from "@/components/application-form";
import { useAuth } from "@/contexts/auth-context";
import { GalleryViewer, type GalleryViewerSource } from "@/components/gallery-viewer";
import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import { UserProfileLink } from "@/components/user-profile-link";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

function applicationStatusForPost(post: CollabPost): ApplicationStatus | null {
    return post.currentUserApplicationStatus ?? (post.hasCurrentUserApplied ? "Pending" : null);
}

function applicationStatusLabel(status: ApplicationStatus) {
    switch (status) {
        case "Accepted":
            return "Accepted";
        case "Rejected":
            return "Rejected";
        default:
            return "Pending";
    }
}

function applicationStatusClassName(status: ApplicationStatus) {
    switch (status) {
        case "Accepted":
            return "border border-emerald-200 bg-emerald-50 text-emerald-800";
        case "Rejected":
            return "border border-rose-200 bg-rose-50 text-rose-800";
        default:
            return "border border-amber-200 bg-amber-50 text-amber-800";
    }
}

export default function ListPostsPage() {
    const router = useRouter();
    const {
        user,
        isAuthenticated,
        isLoading: isAuthLoading,
    } = useAuth();
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [postsResponse, setPostsResponse] = useState<PagedResponse<CollabPost> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingGallery, setViewingGallery] = useState<GalleryViewerSource | null>(null);
    const [selectedPost, setSelectedPost] = useState<CollabPost | null>(null);

    function markPostAsApplied(postId: string) {
        setPostsResponse((currentResponse) => {
            if (!currentResponse) {
                return currentResponse;
            }

            return {
                ...currentResponse,
                items: currentResponse.items.map((post) =>
                    post.id === postId
                        ? {
                            ...post,
                            hasCurrentUserApplied: true,
                            currentUserApplicationStatus: "Pending",
                        }
                        : post,
                ),
            };
        });
    }

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
        <main className="flex min-h-0 flex-1 overflow-hidden bg-slate-50 text-slate-900">
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
                    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Collaboration Posts
                            </h1>
                            <p className="mt-2 leading-7 text-slate-600">
                                Browse opportunities to connect, share ideas, and work with others.
                            </p>
                        </div>
                        {isAuthenticated && <Link href="/posts/new" className="rounded-md bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700">Create post</Link>}
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
                                    const isOwnPost = user?.id === post.userId;
                                    const applicationStatus = applicationStatusForPost(post);
                                    const hasAlreadyApplied = Boolean(applicationStatus);
                                    const isApplyDisabled =
                                        hasAlreadyApplied ||
                                        isAuthLoading;
                                    const applyButtonLabel = applicationStatus
                                        ? applicationStatusLabel(applicationStatus)
                                        : isAuthLoading
                                        ? "Checking..."
                                        : "Apply";
                                    const applyButtonTitle = applicationStatus
                                        ? applicationStatus === "Accepted"
                                            ? "Your application was accepted."
                                            : applicationStatus === "Rejected"
                                                ? "Your application was rejected."
                                                : "Your application is pending."
                                        : isAuthLoading
                                        ? "Checking your session..."
                                        : undefined;
                                    const previewImages =
                                        post.moodboardPreviewImageUrls;
                                    // Older running API instances do not include this newly added field yet.
                                    // Keep the post list usable until the API has been restarted with the update.
                                    const portfolioGalleries =
                                        post.portfolioGalleries ?? [];
                                    const solePortfolio =
                                        portfolioGalleries.length === 1
                                            ? portfolioGalleries[0]
                                            : null;

                                    const remainingImageCount = Math.max(
                                        post.moodboardPhotoCount - previewImages.length,
                                        0,
                                    );

                                    return (
                                        <article
                                            key={post.id}
                                            id={`post-${post.id}`}
                                            role="link"
                                            tabIndex={0}
                                            onClick={() => router.push(`/posts/${post.id}`)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    router.push(`/posts/${post.id}`);
                                                }
                                            }}
                                            className="cursor-pointer rounded-lg border border-amber-100 bg-white p-5 shadow-sm transition hover:border-amber-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-amber-600 sm:p-6"
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
                                                        <section
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setViewingGallery({ postId: post.id });
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (event.key !== "Enter" && event.key !== " ") return;
                                                                event.preventDefault();
                                                                event.stopPropagation();
                                                                setViewingGallery({ postId: post.id });
                                                            }}
                                                            className="mt-5 cursor-pointer rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-violet-700"
                                                        >
                                                            <div className="mb-3 flex items-center gap-2">
                                                                <span className="h-px w-5 bg-violet-300" />
                                                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Creative direction</p>
                                                            </div>
                                                            <div
                                                                className={`grid gap-2 ${
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
                                                                    <button
                                                                        type="button"
                                                                        key={imageUrl}
                                                                        aria-label={`View moodboard for ${post.title}`}
                                                                        onClick={(event) => { event.stopPropagation(); setViewingGallery({ postId: post.id }); }}
                                                                        className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-md bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
                                                                    >
                                                                        <MoodboardThumbnail
                                                                            src={imageUrl}
                                                                            alt={`Moodboard image ${index + 1} for ${post.title}`}
                                                                        />

                                                                        {showRemainingCount && (
                                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                                                                <span className="text-2xl font-semibold text-white">
                                                                                    +{remainingImageCount}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        </section>
                                                    )}

                                                    {portfolioGalleries.length > 0 && (
                                                        <section
                                                            role={solePortfolio ? "link" : undefined}
                                                            tabIndex={solePortfolio ? 0 : undefined}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                if (solePortfolio) {
                                                                    setViewingGallery({ galleryId: solePortfolio.id });
                                                                }
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (!solePortfolio || (event.key !== "Enter" && event.key !== " ")) return;
                                                                event.preventDefault();
                                                                event.stopPropagation();
                                                                setViewingGallery({ galleryId: solePortfolio.id });
                                                            }}
                                                            className={`mt-5 overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-4 shadow-sm ${solePortfolio ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600" : ""}`}
                                                        >
                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="h-px w-5 bg-blue-300" />
                                                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                                                                            Project outcomes
                                                                        </p>
                                                                    </div>
                                                                    <p className="mt-1 text-sm text-slate-600">
                                                                        See how this idea became finished work.
                                                                    </p>
                                                                </div>
                                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100">
                                                                    {portfolioGalleries.length} portfolio{portfolioGalleries.length === 1 ? "" : "s"}
                                                                </span>
                                                            </div>
                                                            <div aria-label="Linked portfolio galleries" className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2">
                                                                {portfolioGalleries.map((portfolio) => (
                                                                    <article
                                                                        key={portfolio.id}
                                                                        role="link"
                                                                        tabIndex={0}
                                                                        onClick={(event) => { event.stopPropagation(); setViewingGallery({ galleryId: portfolio.id }); }}
                                                                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); setViewingGallery({ galleryId: portfolio.id }); } }}
                                                                        className="group w-64 shrink-0 snap-start cursor-pointer overflow-hidden rounded-lg border border-white bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-600 sm:w-72"
                                                                    >
                                                                        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                                                                            {portfolio.previewImageUrl ? (
                                                                                <MoodboardThumbnail
                                                                                    src={portfolio.previewImageUrl}
                                                                                    alt={`Preview of ${portfolio.title}`}
                                                                                    focalPointX={portfolio.thumbnailFocalPointX}
                                                                                    focalPointY={portfolio.thumbnailFocalPointY}
                                                                                    zoom={portfolio.thumbnailZoom}
                                                                                />
                                                                            ) : (
                                                                                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                                                                                    Portfolio gallery
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="p-3">
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <p className="truncate font-semibold text-slate-900 group-hover:text-blue-700">
                                                                                    {portfolio.title}
                                                                                </p>
                                                                                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                                                    Portfolio
                                                                                </span>
                                                                            </div>
                                                                            <p className="mt-1 text-sm text-slate-600">
                                                                                By <UserProfileLink userId={portfolio.ownerId}>{portfolio.ownerDisplayName}</UserProfileLink>
                                                                            </p>
                                                                        </div>
                                                                    </article>
                                                                ))}
                                                            </div>
                                                        </section>
                                                    )}

                                                    <div className="mt-4 space-y-1 text-sm text-slate-500 sm:flex sm:items-center sm:gap-4 sm:space-y-0">
                                                        <p>
                                                            {post.isRemote ? "Remote" : post.location}
                                                        </p>

                                                        <p>Posted by <UserProfileLink userId={post.userId}>{post.ownerDisplayName}</UserProfileLink></p>

                                                        <p>
                                                            {new Date(
                                                                post.createdAtUtc,
                                                            ).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div onClick={(event) => event.stopPropagation()} className="flex flex-wrap gap-3 sm:justify-end">
                                                    {isOwnPost ? (
                                                        <>
                                                            <Link
                                                                href={`/my-posts/${post.id}/edit`}
                                                                onClick={(event) => event.stopPropagation()}
                                                                className="inline-flex w-full items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-950 hover:bg-amber-100 sm:w-auto"
                                                            >
                                                                Edit post
                                                            </Link>
                                                            <Link
                                                                href={`/my-posts/${post.id}/applications`}
                                                                onClick={(event) => event.stopPropagation()}
                                                                className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:w-auto"
                                                            >
                                                                View applicants
                                                            </Link>
                                                        </>
                                                    ) : isApplyDisabled ? (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            title={applyButtonTitle}
                                                            className={`inline-flex w-full cursor-not-allowed items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium sm:w-auto ${applicationStatus ? applicationStatusClassName(applicationStatus) : "bg-slate-300 text-slate-600"}`}
                                                        >
                                                            {applyButtonLabel}
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <Link
                                                                href={`/posts/${post.id}/apply`}
                                                                className="inline-flex w-full items-center justify-center rounded-md bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 sm:w-auto lg:hidden"
                                                            >
                                                                Apply
                                                            </Link>

                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    // Prevent the posts-area click handler from closing the panel.
                                                                    event.stopPropagation();

                                                                    if (!isAuthenticated) {
                                                                        const returnTo =
                                                                            window.location.pathname +
                                                                            window.location.search;

                                                                        router.push(
                                                                            `/login?next=${encodeURIComponent(returnTo)}`,
                                                                        );
                                                                        return;
                                                                    }

                                                                    setSelectedPost(post);
                                                                }}
                                                                className="hidden w-full items-center justify-center rounded-md bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 sm:w-auto lg:inline-flex"
                                                            >
                                                                Apply
                                                            </button>
                                                        </>
                                                    )}
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
                    className="hidden h-full min-w-0 shrink-0 overflow-y-auto overscroll-contain border-l border-slate-200 bg-white lg:block lg:w-1/2"
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
                                    Posted by <UserProfileLink userId={selectedPost.userId}>{selectedPost.ownerDisplayName}</UserProfileLink>
                                </p>
                            </div>
                        </div>

                        <div className="mt-6">
                            {user?.id === selectedPost.userId ? (
                                <p
                                    role="status"
                                    className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                                >
                                    This is your post, so you cannot apply to it.
                                </p>
                            ) : applicationStatusForPost(selectedPost) ? (
                                <p
                                    role="status"
                                    className={`rounded-md p-4 text-sm ${applicationStatusClassName(applicationStatusForPost(selectedPost)!)}`}
                                >
                                    {applicationStatusForPost(selectedPost) === "Accepted"
                                        ? "Your application was accepted."
                                        : applicationStatusForPost(selectedPost) === "Rejected"
                                            ? "Your application was rejected."
                                            : "Your application is pending."}
                                </p>
                            ) : (
                                <ApplicationForm
                                    postId={selectedPost.id}
                                    onSubmitted={() =>
                                        markPostAsApplied(selectedPost.id)
                                    }
                                />
                            )}
                        </div>
                    </div>
                </aside>
            )}
            {viewingGallery && <GalleryViewer source={viewingGallery} onClose={() => setViewingGallery(null)} />}
        </main>
    );
}
