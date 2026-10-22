"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import type { Gallery } from "@/types/galleries";
import type { CollabPost, UpdateCollabPostRequest } from "@/types/posts";

export function PostEditor({ postId }: { postId: string }) {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [post, setPost] = useState<CollabPost | null>(null);
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [form, setForm] = useState<UpdateCollabPostRequest | null>(null);
    const [selectedMoodboardId, setSelectedMoodboardId] = useState("");
    const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    async function load() {
        setIsLoading(true);
        setError("");
        try {
            const [loadedPost, loadedGalleries] = await Promise.all([
                apiRequest<CollabPost>(`/api/posts/${postId}`),
                apiRequest<Gallery[]>("/api/galleries/mine"),
            ]);
            setPost(loadedPost);
            setGalleries(loadedGalleries);
            setForm({
                title: loadedPost.title,
                description: loadedPost.description,
                location: loadedPost.location,
                isRemote: loadedPost.isRemote,
            });
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not load this post.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        async function loadEditor() {
            await load();
        }
        void loadEditor();
        // postId changes when navigating between editor routes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postId]);

    async function savePost() {
        if (!form) return;
        setIsSaving(true);
        setError("");
        setNotice("");
        try {
            await apiRequest(`/api/posts/${postId}`, {
                method: "PUT",
                body: JSON.stringify(form),
            });
            setPost((current) => current ? { ...current, ...form } : current);
            setNotice("Post details saved.");
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not save this post.");
        } finally {
            setIsSaving(false);
        }
    }

    async function linkGallery(galleryId: string) {
        if (!galleryId) return;
        setIsSaving(true);
        setError("");
        setNotice("");
        try {
            await apiRequest(`/api/galleries/${galleryId}/collab-post`, {
                method: "PATCH",
                body: JSON.stringify({ collabPostId: postId }),
            });
            await load();
            setSelectedMoodboardId("");
            setSelectedPortfolioId("");
            setNotice("Gallery linked to this collaboration.");
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not link this gallery.");
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading || isAuthLoading) {
        return <main className="min-h-full flex-1 bg-slate-50 px-4 py-10 text-center text-slate-600">Loading post editor...</main>;
    }

    if (error && !post) {
        return <main className="min-h-full flex-1 bg-slate-50 px-4 py-10 text-center text-red-700" role="alert">{error}</main>;
    }

    if (!post || !form || user?.id !== post.userId) {
        return <main className="min-h-full flex-1 bg-slate-50 px-4 py-10 text-center text-slate-700">You can only edit posts you own.</main>;
    }

    const linkedMoodboard = galleries.find((gallery) => gallery.purpose === 1 && gallery.collabPostId === post.id);
    const linkedPortfolios = galleries.filter((gallery) => gallery.purpose === 0 && gallery.collabPostId === post.id);
    const availableMoodboards = galleries.filter((gallery) => gallery.purpose === 1 && !gallery.collabPostId);
    const availablePortfolios = galleries.filter((gallery) => gallery.purpose === 0 && !gallery.collabPostId);

    return <main className="min-h-full flex-1 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-4xl">
            <Link href="/my-posts" className="text-sm font-medium text-blue-700 hover:underline">← My posts</Link>
            <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Post editor</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1></div>
                <Link href={`/posts/${post.id}`} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">View post ↗</Link>
            </header>

            {notice && <p role="status" className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{notice}</p>}
            {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-semibold">Post details</h2>
                <div className="mt-5 grid gap-4">
                    <label className="grid gap-1 text-sm font-medium">Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
                    <label className="grid gap-1 text-sm font-medium">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} className="rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
                    <label className="grid gap-1 text-sm font-medium">Location<input value={form.location} disabled={form.isRemote} onChange={(event) => setForm({ ...form, location: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2 font-normal disabled:bg-slate-100" /></label>
                    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.isRemote} onChange={(event) => setForm({ ...form, isRemote: event.target.checked })} /> Remote collaboration</label>
                </div>
                <button type="button" onClick={() => void savePost()} disabled={isSaving} className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400">{isSaving ? "Saving..." : "Save post details"}</button>
            </section>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Creative direction</p>
                    <h2 className="mt-1 text-xl font-semibold">Moodboard</h2>
                    {linkedMoodboard ? <><p className="mt-3 font-medium">{linkedMoodboard.title}</p><Link href={`/galleries/${linkedMoodboard.id}/edit`} className="mt-4 inline-flex rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800">Edit moodboard</Link></> : <>
                        <p className="mt-3 text-sm leading-6 text-slate-600">Please link a moodboard to this post first.</p>
                        <select value={selectedMoodboardId} onChange={(event) => setSelectedMoodboardId(event.target.value)} className="mt-4 w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm"><option value="">Choose an unlinked moodboard</option>{availableMoodboards.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.title}</option>)}</select>
                        <button type="button" onClick={() => void linkGallery(selectedMoodboardId)} disabled={!selectedMoodboardId || isSaving} className="mt-3 rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-300">Link moodboard</button>
                    </>}
                </section>

                <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Project outcomes</p>
                    <h2 className="mt-1 text-xl font-semibold">Portfolio work</h2>
                    {linkedPortfolios.length > 0 ? <ul className="mt-3 space-y-2">{linkedPortfolios.map((gallery) => <li key={gallery.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm shadow-sm"><span className="truncate font-medium">{gallery.title}</span><Link href={`/galleries/${gallery.id}/edit`} className="shrink-0 text-blue-700 hover:underline">Edit</Link></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-slate-600">Link owned portfolio work to celebrate the outcome of this collaboration.</p>}
                    <select value={selectedPortfolioId} onChange={(event) => setSelectedPortfolioId(event.target.value)} className="mt-4 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"><option value="">Choose an unlinked portfolio</option>{availablePortfolios.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.title}</option>)}</select>
                    <button type="button" onClick={() => void linkGallery(selectedPortfolioId)} disabled={!selectedPortfolioId || isSaving} className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">Link portfolio</button>
                </section>
            </div>
        </div>
    </main>;
}
