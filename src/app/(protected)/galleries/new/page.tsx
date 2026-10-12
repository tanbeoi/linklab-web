"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import type { CreateGalleryRequest, GalleryPurpose } from "@/types/galleries";
import type { CollabPost, MyApplication, PagedResponse } from "@/types/posts";

export default function CreateGalleryPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [purpose, setPurpose] = useState<GalleryPurpose>(0);
    const [collabPostId, setCollabPostId] = useState("");
    const [collaborations, setCollaborations] = useState<{ id: string; title: string }[]>([]);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadCollaborations() {
            try {
                const [ownPosts, acceptedApplications] = await Promise.all([
                    apiRequest<PagedResponse<CollabPost>>("/api/posts/mine?page=1&pageSize=50"),
                    apiRequest<PagedResponse<MyApplication>>("/api/applications/mine/accepted?page=1&pageSize=50"),
                ]);

                if (cancelled) return;

                const options = new Map<string, string>();
                ownPosts.items.forEach((post) => options.set(post.id, post.title));
                acceptedApplications.items.forEach((application) => options.set(application.postId, application.postTitle));
                setCollaborations([...options].map(([id, title]) => ({ id, title })));
            } catch {
                // The gallery can still be created without a linked collaboration.
            }
        }

        void loadCollaborations();
        return () => { cancelled = true; };
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        const request: CreateGalleryRequest = {
            title,
            description,
            purpose,
            collabPostId: collabPostId || null,
        };

        try {
            await apiRequest("/api/galleries", {
                method: "POST",
                body: JSON.stringify(request),
            });
            router.push("/galleries/mine");
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Could not create your gallery.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-xl">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Create Gallery
                </h1>
                <p className="mt-3 leading-7 text-slate-600">
                    Start a portfolio or moodboard to collect your creative references.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                    <label className="block text-sm font-medium text-slate-700" htmlFor="title">
                        Gallery title
                    </label>
                    <input
                        id="title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        maxLength={150}
                        required
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />

                    <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="purpose">
                        Gallery type
                    </label>
                    <select
                        id="purpose"
                        value={purpose}
                        onChange={(event) => setPurpose(Number(event.target.value) as GalleryPurpose)}
                        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                        <option value={0}>Portfolio</option>
                        <option value={1}>Moodboard</option>
                    </select>

                    <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="collaboration">
                        Linked collaboration
                    </label>
                    <select
                        id="collaboration"
                        value={collabPostId}
                        onChange={(event) => setCollabPostId(event.target.value)}
                        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                        <option value="">Not linked to a collaboration</option>
                        {collaborations.map((collaboration) => (
                            <option key={collaboration.id} value={collaboration.id}>
                                {collaboration.title}
                            </option>
                        ))}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        You can link your own post or a collaboration where your application was accepted.
                        Each post can have one moodboard.
                    </p>

                    <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="description">
                        Description
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        maxLength={2000}
                        rows={5}
                        className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />

                    {error && (
                        <p
                            role="alert"
                            className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                        {isSubmitting ? "Creating gallery..." : "Create gallery"}
                    </button>
                </form>
            </div>
        </main>
    );
}
