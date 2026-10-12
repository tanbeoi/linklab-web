"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import type { Gallery, Photo } from "@/types/galleries";

export type GalleryViewerSource = { gallery: Gallery } | { postId: string };

function GalleryPhoto({ photo }: { photo: Photo }) {
    const [failed, setFailed] = useState(false);
    return (
        <figure>
            {failed ? (
                <div role="img" aria-label={photo.caption || "Unavailable gallery image"}
                    className="flex min-h-48 items-center justify-center bg-slate-100 p-6 text-slate-600">
                    Image unavailable. Close and reopen the gallery to refresh its image links.
                </div>
            ) : (
                // Native images preserve natural proportions without requiring stored dimensions.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.imageUrl} alt={photo.caption || "Gallery photograph"}
                    loading="lazy" decoding="async" onError={() => setFailed(true)}
                    className="block h-auto w-full" />
            )}
            {photo.caption && <figcaption className="bg-white px-5 py-3 text-sm text-slate-600">{photo.caption}</figcaption>}
        </figure>
    );
}

export function GalleryViewer({ source, onClose }: {
    source: GalleryViewerSource;
    onClose: () => void;
}) {
    const { user } = useAuth();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [content, setContent] = useState<{ gallery: Gallery; photos: Photo[] } | null>(null);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const dialog = dialogRef.current;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        dialog?.showModal();
        document.body.style.overflow = "hidden";
        return () => {
            dialog?.close();
            document.body.style.overflow = previousOverflow;
            if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const gallery = "gallery" in source ? source.gallery
                    : await apiRequest<Gallery>(`/api/posts/${source.postId}/moodboard`, { signal: controller.signal });
                const photos = await apiRequest<Photo[]>(`/api/galleries/${gallery.id}/photos`, { signal: controller.signal });
                if (!controller.signal.aborted) setContent({ gallery, photos });
            } catch (cause) {
                if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load gallery.");
            }
        }
        void load();
        return () => controller.abort();
    }, [source, attempt]);

    const gallery = content?.gallery ?? ("gallery" in source ? source.gallery : null);

    return (
        <dialog ref={dialogRef} aria-labelledby="gallery-viewer-title"
            onCancel={(event) => { event.preventDefault(); onClose(); }}
            onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
            className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto overscroll-contain bg-transparent px-3 py-6 text-white backdrop:bg-black/85 sm:px-12 sm:py-10">
            <button type="button" autoFocus onClick={onClose} aria-label="Close gallery"
                className="fixed right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/80 text-3xl text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-white sm:right-5 sm:top-5">×</button>
            <article className="mx-auto max-w-5xl">
                <header className="mb-6 pr-12">
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-300">{gallery?.purpose === 1 ? "Moodboard" : "Gallery"}</p>
                    <h2 id="gallery-viewer-title" className="mt-2 break-words text-2xl font-semibold sm:text-3xl">{gallery?.title || "Loading gallery…"}</h2>
                    {gallery && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-slate-200">
                        <p data-owner-id={gallery.ownerId}>By {gallery.ownerDisplayName || "Gallery creator"}</p>
                        {gallery.ownerId === user?.id && <Link href={`/galleries/${gallery.id}/edit`} className="text-sm font-medium text-white underline underline-offset-4 hover:text-slate-200">Edit gallery</Link>}
                    </div>}
                    {gallery?.description && <p className="mt-4 whitespace-pre-wrap break-words text-slate-300">{gallery.description}</p>}
                </header>
                {error ? (
                    <div role="alert" className="rounded-lg bg-white p-6 text-slate-900">
                        <p>{error}</p>
                        <button type="button" onClick={() => { setError(""); setContent(null); setAttempt(a => a + 1); }}
                            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white">Try again</button>
                    </div>
                ) : !content ? <p role="status" className="py-16 text-center">Loading photos…</p>
                : content.photos.length === 0 ? <p className="rounded-lg bg-white p-10 text-center text-slate-600">No photos have been added yet.</p>
                : <div className="overflow-hidden bg-white text-slate-900">
                    {content.photos.map(photo => <GalleryPhoto key={photo.id} photo={photo} />)}
                </div>}
            </article>
        </dialog>
    );
}
