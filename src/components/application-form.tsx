"use client";

import { SubmitEvent, useState } from "react";

import { apiRequest } from "@/lib/api";
import type { ApplyToPostRequest, ApplyToPostResponse } from "@/types/posts";

type ApplicationFormProps = {
    postId: string;
};

export function ApplicationForm({
    postId,
}: ApplicationFormProps) {
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    async function handleSubmit(
        event: SubmitEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        const request: ApplyToPostRequest = {
            message,
        };

        try {
            await apiRequest<ApplyToPostResponse>(
                `/api/posts/${postId}/apply`,
                {
                    method: "POST",
                    body: JSON.stringify(request),
                },
            );

            setIsSubmitted(true);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Could not submit your application.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isSubmitted) {
        return (
            <div
                role="status"
                className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
                Your application has been submitted.
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
        >
            <label
                htmlFor={`application-message-${postId}`}
                className="block text-sm font-medium text-slate-700"
            >
                Application message

                <textarea
                    id={`application-message-${postId}`}
                    value={message}
                    onChange={(event) =>
                        setMessage(event.target.value)
                    }
                    maxLength={2000}
                    rows={10}
                    required
                    placeholder="Explain why you think you would be a good fit!"
                    className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
            </label>

            <p className="text-right text-sm text-slate-500">
                {message.length}/2000
            </p>

            {error && (
                <p
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
                {isSubmitting
                    ? "Submitting..."
                    : "Submit application"}
            </button>
        </form>
    );
}
