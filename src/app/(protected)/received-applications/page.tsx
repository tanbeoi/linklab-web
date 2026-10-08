"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import type {
    ApplicationDecisionResponse,
    ApplicationStatus,
    PagedResponse,
    ReceivedApplication,
} from "@/types/posts";

function statusClassName(status: ApplicationStatus) {
    if (status === "Accepted") {
        return "bg-green-100 text-green-800";
    }

    if (status === "Rejected") {
        return "bg-red-100 text-red-800";
    }

    return "bg-amber-100 text-amber-800";
}

export default function ReceivedApplicationsPage() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [applicationsResponse, setApplicationsResponse] =
        useState<PagedResponse<ReceivedApplication> | null>(null);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [decisionInProgressId, setDecisionInProgressId] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadApplications() {
            setIsLoading(true);
            setError("");

            try {
                const data = await apiRequest<PagedResponse<ReceivedApplication>>(
                    `/api/applications/received?page=${page}&pageSize=${pageSize}`,
                );

                if (!cancelled) {
                    setApplicationsResponse(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Could not load received applications.",
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

    async function decideApplication(
        applicationId: string,
        decision: "accept" | "reject",
    ) {
        setDecisionInProgressId(applicationId);
        setActionError("");

        try {
            const updatedApplication =
                await apiRequest<ApplicationDecisionResponse>(
                    `/api/applications/${applicationId}/${decision}`,
                    { method: "POST" },
                );

            setApplicationsResponse((currentResponse) => {
                if (!currentResponse) {
                    return currentResponse;
                }

                return {
                    ...currentResponse,
                    items: currentResponse.items.map((application) =>
                        application.id === applicationId
                            ? {
                                  ...application,
                                  status: updatedApplication.status,
                                  decidedAtUtc:
                                      updatedApplication.decidedAtUtc,
                              }
                            : application,
                    ),
                };
            });
        } catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : "Could not update this application.",
            );
        } finally {
            setDecisionInProgressId("");
        }
    }

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Applications Received
                    </h1>
                    <p className="mt-3 leading-7 text-slate-600">
                        Review applications from creatives interested in your posts.
                    </p>
                </header>

                <div className="mt-6 flex items-center gap-3">
                    <label htmlFor="pageSize" className="text-sm font-medium text-slate-700">
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
                        Loading applications...
                    </p>
                ) : error ? (
                    <p role="alert" className="mt-8 rounded-lg border border-red-200 bg-white p-6 text-center text-red-700 shadow-sm">
                        {error}
                    </p>
                ) : !applicationsResponse || applicationsResponse.items.length === 0 ? (
                    <p className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
                        You have not received any applications yet.
                    </p>
                ) : (
                    <>
                        {actionError && (
                            <p
                                role="alert"
                                className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                            >
                                {actionError}
                            </p>
                        )}
                        <section className="mt-8 space-y-4" aria-label="Applications received">
                            {applicationsResponse.items.map((application) => {
                                const isPending = application.status === "Pending";
                                const isDeciding =
                                    decisionInProgressId === application.id;

                                return (
                                <article key={application.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h2 className="break-words text-xl font-semibold text-slate-900">
                                                {application.postTitle}
                                            </h2>
                                            <p className="mt-1 text-sm font-medium text-slate-600">
                                                From {application.applicantDisplayName}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${statusClassName(application.status)}`}>
                                            {application.status}
                                        </span>
                                    </div>

                                    <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-slate-600">
                                        {application.message}
                                    </p>

                                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                                        <p>
                                            Received {new Date(application.createdAtUtc).toLocaleDateString()}
                                        </p>
                                        {application.decidedAtUtc && (
                                            <p>
                                                Decided {new Date(application.decidedAtUtc).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>

                                    {isPending && (
                                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                            <button
                                                type="button"
                                                disabled={Boolean(decisionInProgressId)}
                                                onClick={() =>
                                                    void decideApplication(
                                                        application.id,
                                                        "accept",
                                                    )
                                                }
                                                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                                            >
                                                {isDeciding
                                                    ? "Updating..."
                                                    : "Accept"}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={Boolean(decisionInProgressId)}
                                                onClick={() =>
                                                    void decideApplication(
                                                        application.id,
                                                        "reject",
                                                    )
                                                }
                                                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-red-200 disabled:text-red-300"
                                            >
                                                {isDeciding
                                                    ? "Updating..."
                                                    : "Reject"}
                                            </button>
                                        </div>
                                    )}
                                </article>
                                );
                            })}
                        </section>

                        <nav className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between" aria-label="Received applications pagination">
                            <button
                                type="button"
                                disabled={!applicationsResponse.hasPreviousPage}
                                onClick={() => setPage((currentPage) => currentPage - 1)}
                                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-slate-600">
                                Page {applicationsResponse.page} of {applicationsResponse.totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={!applicationsResponse.hasNextPage}
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
