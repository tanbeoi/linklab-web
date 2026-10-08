"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import type {
    ApplicationDecisionResponse,
    ApplicationStatus,
    PostApplication,
} from "@/types/posts";

type ApplicantsListProps = {
    postId: string;
};

function statusClassName(status: ApplicationStatus) {
    if (status === "Accepted") {
        return "bg-green-100 text-green-800";
    }

    if (status === "Rejected") {
        return "bg-red-100 text-red-800";
    }

    return "bg-amber-100 text-amber-800";
}

export function ApplicantsList({ postId }: ApplicantsListProps) {
    const [applications, setApplications] = useState<PostApplication[]>([]);
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
                const data = await apiRequest<PostApplication[]>(
                    `/api/posts/${postId}/applications`,
                );

                if (!cancelled) {
                    setApplications(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Could not load applications for this post.",
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
    }, [postId]);

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

            setApplications((currentApplications) =>
                currentApplications.map((application) =>
                    application.id === applicationId
                        ? {
                              ...application,
                              status: updatedApplication.status,
                              decidedAtUtc: updatedApplication.decidedAtUtc,
                          }
                        : application,
                ),
            );
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
                        Applicants
                    </h1>
                    <p className="mt-3 leading-7 text-slate-600">
                        Review applications for this collaboration post.
                    </p>
                </header>

                {isLoading ? (
                    <p className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
                        Loading applicants...
                    </p>
                ) : error ? (
                    <p
                        role="alert"
                        className="mt-8 rounded-lg border border-red-200 bg-white p-6 text-center text-red-700 shadow-sm"
                    >
                        {error}
                    </p>
                ) : applications.length === 0 ? (
                    <p className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
                        No one has applied to this post yet.
                    </p>
                ) : (
                    <section className="mt-8 space-y-4" aria-label="Post applicants">
                        {actionError && (
                            <p
                                role="alert"
                                className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                            >
                                {actionError}
                            </p>
                        )}

                        {applications.map((application) => {
                            const isPending = application.status === "Pending";
                            const isDeciding =
                                decisionInProgressId === application.id;

                            return (
                                <article
                                    key={application.id}
                                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h2 className="break-words text-xl font-semibold text-slate-900">
                                                {application.applicantDisplayName}
                                            </h2>
                                            <p className="mt-1 break-all text-sm text-slate-600">
                                                {application.applicantEmail}
                                            </p>
                                        </div>
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

                                    {isPending && (
                                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                            <button
                                                type="button"
                                                disabled={Boolean(
                                                    decisionInProgressId,
                                                )}
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
                                                disabled={Boolean(
                                                    decisionInProgressId,
                                                )}
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
                )}
            </div>
        </main>
    );
}
