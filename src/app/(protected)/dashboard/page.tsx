"use client";

import Link from "next/link";

import { useAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <p className="text-sm font-semibold text-blue-700">
                    Your workspace
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                    Welcome back, {user?.displayName}.
                </h1>
                <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                    Use your dashboard as a starting point for your collaboration
                    posts, applications, and creative reference galleries.
                </p>

                <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">Your posts</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Create a new opportunity or browse collaboration posts.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <Link
                                href="/posts/new"
                                className="text-sm font-medium text-blue-700 hover:text-blue-800"
                            >
                                Create post
                            </Link>
                            <Link
                                href="/posts"
                                className="text-sm font-medium text-blue-700 hover:text-blue-800"
                            >
                                Browse posts
                            </Link>
                            <Link
                                href="/my-posts"
                                className="text-sm font-medium text-blue-700 hover:text-blue-800"
                            >
                                View my posts
                            </Link>
                        </div>
                    </article>

                    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Applications received
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Review applications from creatives who want to join your
                            collaboration posts.
                        </p>
                        <Link
                            href="/received-applications"
                            className="mt-4 inline-block text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                            View received applications
                        </Link>
                    </article>

                    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Applications I submitted
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Track the applications you have sent to collaboration
                            posts and their current status.
                        </p>
                        <Link
                            href="/my-applications"
                            className="mt-4 inline-block text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                            View my applications
                        </Link>
                    </article>

                    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Accepted collaborations
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Keep track of the projects where your application has
                            been accepted.
                        </p>
                        <Link
                            href="/accepted-collaborations"
                            className="mt-4 inline-block text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                            View accepted collaborations
                        </Link>
                    </article>

                    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">Your galleries</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Organise creative references and publish moodboards for
                            others to explore.
                        </p>
                        <Link
                            href="/my-galleries"
                            className="mt-4 inline-block text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                            View my galleries
                        </Link>
                    </article>
                </section>
            </div>
        </main>
    );
}
