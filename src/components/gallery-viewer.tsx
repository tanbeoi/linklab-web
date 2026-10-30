"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { MoodboardComposition } from "@/components/moodboard-board";
import { CollaborationOrigin } from "@/components/collaboration-origin";
import { UserProfileLink } from "@/components/user-profile-link";
import type { Gallery, Photo } from "@/types/galleries";

export type GalleryViewerSource =
    | { gallery: Gallery }
    | { galleryId: string }
    | { postId: string };

function GalleryPhoto({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
    const [failed, setFailed] = useState(false);
    return (
        <figure>
            {failed ? (
                <div role="img" aria-label={photo.caption || "Unavailable gallery image"}
                    className="flex min-h-48 items-center justify-center bg-slate-100 p-6 text-slate-600">
                    Image unavailable. Close and reopen the gallery to refresh its image links.
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onOpen}
                    aria-label={`View ${photo.caption || "gallery photograph"} full screen`}
                    className="group relative block w-full cursor-zoom-in overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-blue-600"
                >
                    {/* Native images preserve original dimensions and can be opened at full resolution. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.imageUrl} alt={photo.caption || "Gallery photograph"}
                        loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)}
                        className="block h-auto w-full transition duration-200 group-hover:brightness-95" />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/25 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                        <span className="rounded-full bg-slate-950/75 px-3 py-1.5">View full screen</span>
                    </span>
                </button>
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
    const fullScreenBackButtonRef = useRef<HTMLButtonElement>(null);
    const fullScreenDialogRef = useRef<HTMLElement>(null);
    const fullScreenOriginRef = useRef<HTMLElement | null>(null);
    const [content, setContent] = useState<{ gallery: Gallery; photos: Photo[] } | null>(null);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

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
                const gallery = "gallery" in source
                    ? source.gallery
                    : "galleryId" in source
                        ? await apiRequest<Gallery>(`/api/galleries/${source.galleryId}`, { signal: controller.signal })
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
    const activePhoto = activePhotoIndex === null ? null : content?.photos[activePhotoIndex] ?? null;

    function openPhoto(index: number) {
        fullScreenOriginRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        setActivePhotoIndex(index);
    }

    useEffect(() => {
        if (activePhotoIndex === null || !content) {
            return;
        }
        const photos = content.photos;

        function handleFullScreenKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                setActivePhotoIndex(null);
                return;
            }

            if (event.key === "Tab" && fullScreenDialogRef.current) {
                const focusable = Array.from(
                    fullScreenDialogRef.current.querySelectorAll<HTMLElement>(
                        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                    ),
                ).filter((element) => !element.hasAttribute("hidden"));
                if (focusable.length === 0) return;

                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }

            if (photos.length < 2) {
                return;
            }

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                setActivePhotoIndex((currentIndex) => currentIndex === null ? 0 : (currentIndex - 1 + photos.length) % photos.length);
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                setActivePhotoIndex((currentIndex) => currentIndex === null ? 0 : (currentIndex + 1) % photos.length);
            }
        }

        window.addEventListener("keydown", handleFullScreenKeyDown);
        return () => window.removeEventListener("keydown", handleFullScreenKeyDown);
    }, [activePhotoIndex, content]);

    useEffect(() => {
        if (activePhoto) {
            fullScreenBackButtonRef.current?.focus();
        } else if (fullScreenOriginRef.current?.isConnected) {
            fullScreenOriginRef.current.focus({ preventScroll: true });
            fullScreenOriginRef.current = null;
        }
    }, [activePhoto]);

    return (
        <dialog ref={dialogRef} aria-labelledby="gallery-viewer-title"
            onCancel={(event) => {
                event.preventDefault();
                if (activePhoto) {
                    setActivePhotoIndex(null);
                } else {
                    onClose();
                }
            }}
            onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
            className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto overscroll-contain bg-transparent px-3 py-6 text-white backdrop:bg-black/85 sm:px-12 sm:py-10">
            <button type="button" autoFocus onClick={onClose} aria-label="Close gallery"
                className="fixed right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/80 text-3xl text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-white sm:right-5 sm:top-5">×</button>
            <article className="mx-auto w-full max-w-5xl">
                <header className="mb-6 pr-12">
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-300">{gallery?.purpose === 1 ? "Moodboard" : "Gallery"}</p>
                    <h2 id="gallery-viewer-title" className="mt-2 break-words text-2xl font-semibold sm:text-3xl">{gallery?.title || "Loading gallery…"}</h2>
                    {gallery && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-slate-200">
                        <p data-owner-id={gallery.ownerId}>By <UserProfileLink userId={gallery.ownerId} className="text-slate-100">{gallery.ownerDisplayName || "Gallery creator"}</UserProfileLink></p>
                        {gallery.ownerId === user?.id && <Link href={`/galleries/${gallery.id}/edit`} className="text-sm font-medium text-white underline underline-offset-4 hover:text-slate-200">Edit gallery</Link>}
                    </div>}
                    {gallery?.description && <p className="mt-4 whitespace-pre-wrap break-words text-slate-300">{gallery.description}</p>}
                </header>
                {gallery && <div className="mb-6"><CollaborationOrigin gallery={gallery} /></div>}
                {error ? (
                    <div role="alert" className="rounded-lg bg-white p-6 text-slate-900">
                        <p>{error}</p>
                        <button type="button" onClick={() => { setError(""); setContent(null); setAttempt(a => a + 1); }}
                            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white">Try again</button>
                    </div>
                ) : !content ? <p role="status" className="py-16 text-center">Loading photos…</p>
                : content.photos.length === 0 ? <p className="rounded-lg bg-white p-10 text-center text-slate-600">No photos have been added yet.</p>
                : content.gallery.purpose === 1 ? <MoodboardComposition
                    photos={content.photos}
                    onOpenPhoto={(photo) => openPhoto(content.photos.findIndex((candidate) => candidate.id === photo.id))}
                />
                : <div className="overflow-hidden bg-white text-slate-900">
                    {content.photos.map((photo, index) => <GalleryPhoto key={photo.id} photo={photo} onOpen={() => openPhoto(index)} />)}
                </div>}
            </article>
            {activePhoto && content && <section ref={fullScreenDialogRef} role="dialog" aria-modal="true" aria-label={`Full-screen photo ${activePhotoIndex! + 1} of ${content.photos.length}`} className="fixed inset-0 z-[100] isolate flex h-dvh w-screen items-center justify-center bg-black p-4 sm:p-8">
                <button
                    ref={fullScreenBackButtonRef}
                    type="button"
                    onClick={() => setActivePhotoIndex(null)}
                    aria-label="Return to gallery view"
                    className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 sm:top-5"
                >
                    ×
                </button>
                <p className="absolute left-4 top-5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur sm:left-6">
                    {activePhotoIndex! + 1} / {content.photos.length}
                </p>
                {content.photos.length > 1 && <>
                    <button
                        type="button"
                        onClick={() => setActivePhotoIndex((currentIndex) => currentIndex === null ? 0 : (currentIndex - 1 + content.photos.length) % content.photos.length)}
                        aria-label="Previous photo"
                        className="absolute inset-y-0 left-0 z-10 flex w-16 items-center justify-center text-5xl text-white/80 transition hover:bg-black/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:w-24"
                    >
                        <span aria-hidden="true">‹</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActivePhotoIndex((currentIndex) => currentIndex === null ? 0 : (currentIndex + 1) % content.photos.length)}
                        aria-label="Next photo"
                        className="absolute inset-y-0 right-0 z-10 flex w-16 items-center justify-center text-5xl text-white/80 transition hover:bg-black/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:w-24"
                    >
                        <span aria-hidden="true">›</span>
                    </button>
                </>}
                <figure className="relative flex size-full min-h-0 items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activePhoto.imageUrl} alt={activePhoto.caption || `Photo ${activePhotoIndex! + 1} from ${content.gallery.title}`} draggable={false}
                        className="max-h-full max-w-full select-none object-contain" />
                    {activePhoto.caption && <figcaption className="absolute bottom-0 left-1/2 max-w-[min(38rem,calc(100vw-3rem))] -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-center text-sm text-white backdrop-blur">{activePhoto.caption}</figcaption>}
                </figure>
            </section>}
        </dialog>
    );
}
