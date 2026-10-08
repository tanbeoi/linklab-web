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
                    <Link
                        href="/my-posts"
                        className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        <h2 className="text-lg font-semibold">Your posts</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Review the collaboration opportunities you have created.
                        </p>
                        <p className="mt-4 text-sm font-medium text-blue-700">
                            View my posts →
                        </p>
                    </Link>

                    <Link
                        href="/received-applications"
                        className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        <h2 className="text-lg font-semibold">
                            Applications received
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Review applications from creatives who want to join your
                            collaboration posts.
                        </p>
                        <p className="mt-4 text-sm font-medium text-blue-700">
                            View received applications →
                        </p>
                    </Link>

                    <Link
                        href="/my-applications"
                        className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        <h2 className="text-lg font-semibold">
                            Applications I submitted
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Track the applications you have sent to collaboration
                            posts and their current status.
                        </p>
                        <p className="mt-4 text-sm font-medium text-blue-700">
                            View my applications →
                        </p>
                    </Link>

                    <Link
                        href="/accepted-collaborations"
                        className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        <h2 className="text-lg font-semibold">
                            Accepted collaborations
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Keep track of the projects where your application has
                            been accepted.
                        </p>
                        <p className="mt-4 text-sm font-medium text-blue-700">
                            View accepted collaborations →
                        </p>
                    </Link>

                    <Link
                        href="/my-galleries"
                        className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        <h2 className="text-lg font-semibold">Your galleries</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Organise creative references and publish moodboards for
                            others to explore.
                        </p>
                        <p className="mt-4 text-sm font-medium text-blue-700">
                            View my galleries →
                        </p>
                    </Link>
                </section>
            </div>
        </main>
    );
}
