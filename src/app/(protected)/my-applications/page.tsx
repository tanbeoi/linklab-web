"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { MyApplication, PagedResponse } from "@/types/posts";

function statusClassName(status: MyApplication["status"]) {
    if (status === "Accepted") {
        return "bg-green-100 text-green-800";
    }

    if (status === "Rejected") {
        return "bg-red-100 text-red-800";
    }

    return "bg-amber-100 text-amber-800";
}

export default function MyApplicationsPage() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [applicationsResponse, setApplicationsResponse] =
        useState<PagedResponse<MyApplication> | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadApplications() {
            setIsLoading(true);
            setError("");

            try {
                const data = await apiRequest<PagedResponse<MyApplication>>(
                    `/api/applications/mine?page=${page}&pageSize=${pageSize}`,
                );

                if (!cancelled) {
                    setApplicationsResponse(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Could not load your applications.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadApplications();

        return () => {
            cancelled = true;
        };
    }, [page, pageSize]);

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        My Applications
                    </h1>
                    <p className="mt-3 leading-7 text-slate-600">
                        Track the collaboration posts you have applied to.
                    </p>
                </header>

                <div className="mt-6 flex items-center gap-3">
                    <label
                        htmlFor="pageSize"
                        className="text-sm font-medium text-slate-700"
                    >
                        Applications per page
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
                        Loading your applications...
                    </p>
                ) : error ? (
                    <p
                        role="alert"
                        className="mt-8 rounded-lg border border-red-200 bg-white p-6 text-center text-red-700 shadow-sm"
                    >
                        {error}
                    </p>
                ) : !applicationsResponse ||
                  applicationsResponse.items.length === 0 ? (
                    <p className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
                        You have not applied to any posts yet.
                    </p>
                ) : (
                    <>
                        <section
                            className="mt-8 space-y-4"
                            aria-label="Your applications"
                        >
                            {applicationsResponse.items.map((application) => (
                                <article
                                    key={application.id}
                                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <h2 className="break-words text-xl font-semibold text-slate-900">
                                            {application.postTitle}
                                        </h2>
                                        <span
                                            className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${statusClassName(application.status)}`}
                                        >
                                            {application.status}
                                        </span>
                                    </div>

                                    <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-slate-600">
                                        {application.message}
                                    </p>

                                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                                        <p>
                                            Applied {" "}
                                            {new Date(
                                                application.createdAtUtc,
                                            ).toLocaleDateString()}
                                        </p>
                                        {application.decidedAtUtc && (
                                            <p>
                                                Decided {" "}
                                                {new Date(
                                                    application.decidedAtUtc,
                                                ).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </section>

                        <nav
                            className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between"
                            aria-label="My applications pagination"
                        >
                            <button
                                type="button"
                                disabled={!applicationsResponse.hasPreviousPage}
                                onClick={() =>
                                    setPage((currentPage) => currentPage - 1)
                                }
                                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-slate-600">
                                Page {applicationsResponse.page} of{" "}
                                {applicationsResponse.totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={!applicationsResponse.hasNextPage}
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
