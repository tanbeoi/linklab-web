"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/contexts/auth-context";
import { MoodboardThumbnail } from "@/components/moodboard-thumbnail";
import { UserProfileLink } from "@/components/user-profile-link";
import { apiRequest } from "@/lib/api";
import type { Gallery, Photo } from "@/types/galleries";
import type { CollabPost, PortfolioGalleryPreview, UpdateCollabPostRequest, UpdatePostClosureRequest } from "@/types/posts";

type GalleryPreviewSource = Pick<Gallery, "title" | "previewImageUrl" | "photoCount" | "thumbnailFocalPointX" | "thumbnailFocalPointY" | "thumbnailZoom">;
type LinkedPortfolio = PortfolioGalleryPreview & { ownedGallery: Gallery | null };

function GalleryPreview({ gallery, photos }: { gallery: GalleryPreviewSource; photos: Photo[] }) {
    const imageSources = photos.slice(0, 3).map((photo) => photo.imageUrl);
    if (imageSources.length === 0 && gallery.previewImageUrl) imageSources.push(gallery.previewImageUrl);

    if (imageSources.length === 0) {
        return <div className="flex aspect-[16/6] items-center justify-center rounded-lg bg-white/80 px-4 text-center text-sm text-slate-500">No images yet</div>;
    }

    const remainingCount = Math.max(gallery.photoCount - imageSources.length, 0);
    return <div className={`grid aspect-[16/6] overflow-hidden rounded-lg bg-slate-100 ${imageSources.length === 1 ? "grid-cols-1" : imageSources.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {imageSources.map((imageUrl, index) => <div key={`${imageUrl}-${index}`} className="relative min-w-0 overflow-hidden">
            <MoodboardThumbnail
                src={imageUrl}
                alt={`Preview ${index + 1} for ${gallery.title}`}
                focalPointX={photos.length === 0 ? gallery.thumbnailFocalPointX : undefined}
                focalPointY={photos.length === 0 ? gallery.thumbnailFocalPointY : undefined}
                zoom={photos.length === 0 ? gallery.thumbnailZoom : undefined}
            />
            {index === 2 && remainingCount > 0 && <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-xl font-semibold text-white">+{remainingCount}</span>}
        </div>)}
    </div>;
}

export function PostEditor({ postId }: { postId: string }) {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [post, setPost] = useState<CollabPost | null>(null);
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [form, setForm] = useState<UpdateCollabPostRequest | null>(null);
    const [selectedMoodboardId, setSelectedMoodboardId] = useState("");
    const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
    const [linkedPhotos, setLinkedPhotos] = useState<Record<string, Photo[]>>({});
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
            const linkedGalleryIds = loadedGalleries
                .filter((gallery) => gallery.collabPostId === loadedPost.id)
                .map((gallery) => gallery.id);
            const photoEntries = await Promise.all(linkedGalleryIds.map(async (galleryId) => {
                try {
                    return [galleryId, await apiRequest<Photo[]>(`/api/galleries/${galleryId}/photos`)] as const;
                } catch {
                    return [galleryId, []] as const;
                }
            }));

            setPost(loadedPost);
            setGalleries(loadedGalleries);
            setLinkedPhotos(Object.fromEntries(photoEntries));
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

    async function updateClosure(isClosed: boolean) {
        setIsSaving(true);
        setError("");
        setNotice("");
        try {
            await apiRequest(`/api/posts/${postId}/closed`, {
                method: "PATCH",
                body: JSON.stringify({ isClosed } satisfies UpdatePostClosureRequest),
            });
            setPost((current) => current ? { ...current, isClosed } : current);
            setNotice(isClosed ? "Post closed. It remains visible, but no longer accepts applications." : "Post reopened and now accepts applications.");
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not update the post status.");
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

    async function unlinkGallery(galleryId: string) {
        setIsSaving(true);
        setError("");
        setNotice("");
        try {
            await apiRequest(`/api/galleries/${galleryId}/collab-post`, {
                method: "PATCH",
                body: JSON.stringify({ collabPostId: null }),
            });
            await load();
            setNotice("Gallery unlinked from this collaboration.");
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not unlink this gallery.");
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
    const ownedLinkedPortfolios = galleries.filter((gallery) => gallery.purpose === 0 && gallery.collabPostId === post.id);
    const ownedPortfolioById = new Map(ownedLinkedPortfolios.map((gallery) => [gallery.id, gallery]));
    const linkedPortfolios: LinkedPortfolio[] = [
        ...(post.portfolioGalleries ?? []).map((portfolio) => ({
            ...portfolio,
            ownedGallery: ownedPortfolioById.get(portfolio.id) ?? null,
        })),
        ...ownedLinkedPortfolios
            .filter((gallery) => !(post.portfolioGalleries ?? []).some((portfolio) => portfolio.id === gallery.id))
            .map((gallery) => ({
                id: gallery.id,
                title: gallery.title,
                ownerId: gallery.ownerId,
                ownerDisplayName: gallery.ownerDisplayName,
                previewImageUrl: gallery.previewImageUrl,
                photoCount: gallery.photoCount,
                thumbnailFocalPointX: gallery.thumbnailFocalPointX,
                thumbnailFocalPointY: gallery.thumbnailFocalPointY,
                thumbnailZoom: gallery.thumbnailZoom,
                ownedGallery: gallery,
            })),
    ];
    const availableMoodboards = galleries.filter((gallery) => gallery.purpose === 1 && !gallery.collabPostId);
    const availablePortfolios = galleries.filter((gallery) => gallery.purpose === 0 && !gallery.collabPostId);

    return <main className="min-h-full flex-1 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-4xl">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Post editor</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1></div>
                <Link href={`/posts/${post.id}`} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">View post ↗</Link>
            </header>

            {notice && <p role="status" className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">{notice}</p>}
            {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}

            <section className="mt-6 rounded-xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-semibold">Post details</h2>
                <div className="mt-5 grid gap-4">
                    <label className="grid gap-1 text-sm font-medium">Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
                    <label className="grid gap-1 text-sm font-medium">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} className="rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
                    <label className="grid gap-1 text-sm font-medium">Location<input value={form.location} disabled={form.isRemote} onChange={(event) => setForm({ ...form, location: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2 font-normal disabled:bg-slate-100" /></label>
                    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.isRemote} onChange={(event) => setForm({ ...form, isRemote: event.target.checked })} /> Remote collaboration</label>
                </div>
                <button type="button" onClick={() => void savePost()} disabled={isSaving} className="mt-5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400">{isSaving ? "Saving..." : "Save post details"}</button>
            </section>

            <section className={`mt-5 rounded-xl border p-5 shadow-sm ${post.isClosed ? "border-slate-300 bg-slate-100" : "border-amber-200 bg-amber-50/70"}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-[0.16em] ${post.isClosed ? "text-slate-600" : "text-amber-700"}`}>Post status</p>
                        <h2 className="mt-1 text-xl font-semibold">{post.isClosed ? "Closed" : "Accepting applications"}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{post.isClosed ? "This post is still visible in Collaboration Posts, but new applications are unavailable." : "Close this post when you no longer want to receive new applications."}</p>
                    </div>
                    <button type="button" onClick={() => void updateClosure(!post.isClosed)} disabled={isSaving} className={`rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white ${post.isClosed ? "bg-slate-800 text-white hover:bg-slate-900" : "border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"}`}>{post.isClosed ? "Reopen applications" : "Close post"}</button>
                </div>
            </section>

            <div className="mt-5 grid gap-5">
                <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Creative direction</p><h2 className="mt-1 text-xl font-semibold">Moodboard</h2></div>{linkedMoodboard && <Link href={`/galleries/${linkedMoodboard.id}/edit`} className="rounded-md px-2 py-1 text-sm font-semibold text-violet-700 hover:bg-violet-100">Edit</Link>}</div>
                    {linkedMoodboard ? <>
                        <div className="relative mt-4"><GalleryPreview gallery={linkedMoodboard} photos={linkedPhotos[linkedMoodboard.id] ?? []} /><button type="button" aria-label={`Remove ${linkedMoodboard.title} from this post`} title="Remove from post" onClick={() => void unlinkGallery(linkedMoodboard.id)} disabled={isSaving} className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-white/90 text-lg leading-none text-slate-500 shadow-sm backdrop-blur-sm transition hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50">×</button></div>
                        <div className="mt-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{linkedMoodboard.title}</p><p className="mt-1 text-sm text-slate-600">{linkedMoodboard.photoCount} {linkedMoodboard.photoCount === 1 ? "photo" : "photos"}</p></div><span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-violet-700">Linked</span></div>
                    </> : <>
                        <p className="mt-3 text-sm leading-6 text-slate-600">Link an unlinked moodboard to show the creative direction for this post.</p>
                        <select value={selectedMoodboardId} onChange={(event) => setSelectedMoodboardId(event.target.value)} className="mt-4 w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm"><option value="">Choose an unlinked moodboard</option>{availableMoodboards.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.title}</option>)}</select>
                        <button type="button" onClick={() => void linkGallery(selectedMoodboardId)} disabled={!selectedMoodboardId || isSaving} className="mt-3 rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-300">Link moodboard</button>
                    </>}
                </section>

                <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
                    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Project outcomes</p><h2 className="mt-1 text-xl font-semibold">Portfolio work</h2></div>
                    {linkedPortfolios.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{linkedPortfolios.map((portfolio) => <article key={portfolio.id} className="relative overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
                        {portfolio.ownedGallery && <button
                            type="button"
                            aria-label={`Remove ${portfolio.title} from this post`}
                            title="Remove from post"
                            onClick={() => void unlinkGallery(portfolio.id)}
                            disabled={isSaving}
                            className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-white/90 text-lg leading-none text-slate-500 shadow-sm backdrop-blur-sm transition hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >×</button>}
                        <GalleryPreview gallery={portfolio} photos={portfolio.ownedGallery ? linkedPhotos[portfolio.id] ?? [] : []} />
                        <div className="p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0"><p className="truncate font-semibold">{portfolio.title}</p><p className="mt-1 text-sm text-slate-600">{portfolio.photoCount} {portfolio.photoCount === 1 ? "photo" : "photos"}</p></div>
                                {portfolio.ownedGallery && <Link href={`/galleries/${portfolio.id}/edit`} className="shrink-0 text-sm font-semibold text-blue-700 hover:underline">Edit</Link>}
                            </div>
                            <p className="mt-2 text-sm text-slate-500">By <UserProfileLink userId={portfolio.ownerId}>{portfolio.ownerDisplayName}</UserProfileLink></p>
                        </div>
                    </article>)}</div> : <p className="mt-3 text-sm leading-6 text-slate-600">Link portfolio work to show the outcome of this collaboration.</p>}
                    <div className="mt-4 border-t border-blue-200 pt-4"><label className="text-sm font-medium text-slate-700" htmlFor="portfolio-to-link">Add a portfolio</label><select id="portfolio-to-link" value={selectedPortfolioId} onChange={(event) => setSelectedPortfolioId(event.target.value)} className="mt-2 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"><option value="">Choose an unlinked portfolio</option>{availablePortfolios.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.title}</option>)}</select><button type="button" onClick={() => void linkGallery(selectedPortfolioId)} disabled={!selectedPortfolioId || isSaving} className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">Add portfolio</button></div>
                </section>
            </div>
        </div>
    </main>;
}
