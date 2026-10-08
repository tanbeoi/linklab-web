"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ApplicationForm } from "@/components/application-form";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import type { CollabPost } from "@/types/posts";

export default function ApplyToPostPage() {
    const { user } = useAuth();
    // Get the postId from the URL parameters
    const { postId } = useParams<{ postId: string }>();

    const [post, setPost] = useState<CollabPost | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadPost() {
            try {
                const data = await apiRequest<CollabPost>(
                    `/api/posts/${postId}`,
                );

                if (!cancelled) {
                    setPost(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Could not load the post.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadPost();

        return () => {
            cancelled = true;
        };
    }, [postId]);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-slate-50 p-6">
                <p className="text-center text-slate-600">
                    Loading post...
                </p>
            </main>
        );
    }

    if (error || !post) {
        return (
            <main className="min-h-screen bg-slate-50 p-6">
                <p
                    role="alert"
                    className="text-center text-red-700"
                >
                    {error || "Post not found."}
                </p>
            </main>
        );
    }

    const isOwnPost = user?.id === post.userId;
    const hasAlreadyApplied = post.hasCurrentUserApplied;

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <Link
                    href="/posts"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    ← Back to posts
                </Link>

                <article className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <h1 className="break-words text-3xl font-bold text-slate-900">
                        {isOwnPost || hasAlreadyApplied
                            ? post.title
                            : `Apply to ${post.title}`}
                    </h1>

                    <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-slate-600">
                        {post.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4 border-b border-slate-200 pb-6 text-sm text-slate-500">
                        <p>
                            {post.isRemote
                                ? "Remote"
                                : post.location}
                        </p>

                        <p>Posted by {post.ownerDisplayName}</p>
                    </div>

                    <div className="mt-6">
                        {isOwnPost ? (
                            <p
                                role="status"
                                className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                            >
                                This is your post, so you cannot apply to it.
                            </p>
                        ) : hasAlreadyApplied ? (
                            <p
                                role="status"
                                className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800"
                            >
                                You have already applied to this post.
                            </p>
                        ) : (
                            <ApplicationForm postId={post.id} />
                        )}
                    </div>
                </article>
            </div>
        </main>
    );
}
