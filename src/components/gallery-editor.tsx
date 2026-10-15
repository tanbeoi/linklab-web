"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
    MOODBOARD_CAPTION_HEIGHT,
    MOODBOARD_CARD_WIDTH,
    MoodboardBoard,
    type MoodboardLayout,
} from "@/components/moodboard-board";
import { apiRequest } from "@/lib/api";
import {
    galleryPurposeLabels,
    type Gallery,
    type GalleryPurpose,
    type Photo,
    type UpdatePhotoCaptionsRequest,
    type UpdatePhotoBoardPositionRequest,
    type UpdateGalleryCollabPostRequest,
    type UpdateGalleryRequest,
} from "@/types/galleries";
import type { CollabPost, MyApplication, PagedResponse } from "@/types/posts";

type InsertionPoint = { insertAtStart: true } | { insertAfterPhotoId: string };

type CollaborationOption = { id: string; title: string };

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export function GalleryEditor({ galleryId }: { galleryId: string }) {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [gallery, setGallery] = useState<Gallery | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
    const [collaborations, setCollaborations] = useState<CollaborationOption[]>([]);
    const [insertionPoint, setInsertionPoint] = useState<InsertionPoint>({ insertAtStart: true });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [settingsFeedback, setSettingsFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadEditor() {
            setIsLoading(true);
            setError("");

            try {
                const [galleryData, photoData, ownPosts, acceptedApplications] = await Promise.all([
                    apiRequest<Gallery>(`/api/galleries/${galleryId}`),
                    apiRequest<Photo[]>(`/api/galleries/${galleryId}/photos`),
                    apiRequest<PagedResponse<CollabPost>>("/api/posts/mine?page=1&pageSize=50"),
                    apiRequest<PagedResponse<MyApplication>>("/api/applications/mine/accepted?page=1&pageSize=50"),
                ]);

                if (cancelled) return;

                const options = new Map<string, string>();
                ownPosts.items.forEach((post) => options.set(post.id, post.title));
                acceptedApplications.items.forEach((application) => options.set(application.postId, application.postTitle));

                setGallery(galleryData);
                setPhotos(photoData);
                setCaptionDrafts({});
                setCollaborations([...options].map(([id, title]) => ({ id, title })));
            } catch (cause) {
                if (!cancelled) setError(errorMessage(cause, "Could not load this gallery."));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void loadEditor();
        return () => { cancelled = true; };
    }, [galleryId]);

    function openFilePicker(point?: InsertionPoint) {
        setInsertionPoint(point ?? { insertAtStart: true });
        fileInputRef.current?.click();
    }

    async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !gallery) return;

        setError("");
        setNotice("");
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.set("file", file);
            if ("insertAtStart" in insertionPoint) {
                formData.set("insertAtStart", "true");
            } else {
                formData.set("insertAfterPhotoId", insertionPoint.insertAfterPhotoId);
            }

            const saved = await apiRequest<Photo>(`/api/galleries/${gallery.id}/photos/upload`, {
                method: "POST",
                body: formData,
            });

            setPhotos((current) => {
                if (gallery.purpose === 1) return [...current, saved];

                const index = "insertAtStart" in insertionPoint
                    ? 0
                    : current.findIndex((photo) => photo.id === insertionPoint.insertAfterPhotoId) + 1;
                const copy = [...current];
                copy.splice(Math.max(index, 0), 0, saved);
                return copy;
            });
            setGallery((current) => current ? { ...current, photoCount: current.photoCount + 1 } : current);
            setNotice(gallery.purpose === 1 ? "Photo uploaded to Unsorted." : "Photo uploaded.");
        } catch (cause) {
            setError(errorMessage(cause, "Could not upload the photo."));
        } finally {
            setIsUploading(false);
        }
    }

    async function saveDetails(formData: FormData) {
        if (!gallery) return;
        setError("");
        setNotice("");
        setSettingsFeedback(null);
        setIsSaving(true);

        try {
            const request: UpdateGalleryRequest = {
                title: String(formData.get("title") ?? ""),
                description: String(formData.get("description") ?? ""),
                purpose: Number(formData.get("purpose")) as GalleryPurpose,
            };
            const saved = await apiRequest<Pick<Gallery, "title" | "description" | "purpose">>(`/api/galleries/${gallery.id}`, {
                method: "PUT",
                body: JSON.stringify(request),
            });

            const collabPostId = String(formData.get("collabPostId") ?? "") || null;
            if (collabPostId !== gallery.collabPostId) {
                await apiRequest<unknown>(`/api/galleries/${gallery.id}/collab-post`, {
                    method: "PATCH",
                    body: JSON.stringify({ collabPostId } satisfies UpdateGalleryCollabPostRequest),
                });
            }

            const editedCaptions = Object.entries(captionDrafts).map(([photoId, caption]) => ({
                photoId,
                caption,
            }));
            if (editedCaptions.length > 0) {
                await apiRequest<void>(`/api/galleries/${gallery.id}/photos/captions`, {
                    method: "PATCH",
                    body: JSON.stringify({ captions: editedCaptions } satisfies UpdatePhotoCaptionsRequest),
                });
                setPhotos((current) => current.map((photo) =>
                    photo.id in captionDrafts ? { ...photo, caption: captionDrafts[photo.id].trim() || null } : photo,
                ));
                setCaptionDrafts({});
            }

            setGallery((current) => current ? {
                ...current,
                ...saved,
                collabPostId,
                collabPostTitle: collabPostId
                    ? collaborations.find((option) => option.id === collabPostId)?.title ?? null
                    : null,
            } : current);
            setSettingsFeedback({
                type: "success",
                message: "Gallery changes saved.",
            });
        } catch (cause) {
            setSettingsFeedback({
                type: "error",
                message: errorMessage(cause, "Could not save the gallery settings."),
            });
        } finally {
            setIsSaving(false);
        }
    }

    async function changePublication() {
        if (!gallery) return;
        setError("");
        setNotice("");
        setIsPublishing(true);

        try {
            const result = await apiRequest<{ isPublished: boolean; publishedAtUtc?: string | null }>(
                `/api/galleries/${gallery.id}/${gallery.isPublished ? "unpublish" : "publish"}`,
                { method: "POST" },
            );
            setGallery((current) => current ? {
                ...current,
                isPublished: result.isPublished,
                publishedAtUtc: result.publishedAtUtc ?? (result.isPublished ? new Date().toISOString() : null),
            } : current);
            setNotice(result.isPublished ? "Gallery published." : "Gallery moved back to draft.");
        } catch (cause) {
            setError(errorMessage(cause, "Could not change gallery visibility."));
        } finally {
            setIsPublishing(false);
        }
    }

    async function saveMoodboardLayout(photoId: string, layout: MoodboardLayout) {
        if (!gallery) return;

        const previousPhotos = photos;
        const nextZIndex = Math.max(0, ...photos.map((photo) => photo.boardZIndex ?? 0)) + 1;

        setPhotos((current) => current.map((photo) => photo.id === photoId ? {
            ...photo,
            boardX: layout.x,
            boardY: layout.y,
            boardWidth: layout.width,
            captionHeight: layout.captionHeight,
            boardZIndex: nextZIndex,
        } : photo));
        setError("");

        try {
            const saved = await apiRequest<Photo>(
                `/api/galleries/${gallery.id}/photos/${photoId}/board-position`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        boardX: layout.x,
                        boardY: layout.y,
                        boardWidth: layout.width,
                        captionHeight: layout.captionHeight,
                    } satisfies UpdatePhotoBoardPositionRequest),
                },
            );
            setPhotos((current) => current.map((photo) => photo.id === photoId ? saved : photo));
        } catch (cause) {
            setPhotos(previousPhotos);
            setError(errorMessage(cause, "Could not save the image position."));
        }
    }

    function updateCaption(photo: Photo, caption: string) {
        setCaptionDrafts((current) => {
            if (caption === (photo.caption ?? "")) {
                const remaining = { ...current };
                delete remaining[photo.id];
                return remaining;
            }

            return { ...current, [photo.id]: caption };
        });
    }

    if (isLoading) return <main className="gallery-editor-page flex min-h-full flex-1 bg-slate-100 px-4 py-10 text-slate-600">Loading gallery editor…</main>;
    if (error && !gallery) return <main className="gallery-editor-page flex min-h-full flex-1 bg-slate-100 px-4 py-10"><p role="alert" className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">{error}</p></main>;
    if (!gallery || gallery.ownerId !== user?.id) return <main className="gallery-editor-page flex min-h-full flex-1 bg-slate-100 px-4 py-10"><p className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-5 text-slate-700">You can only edit your own galleries.</p></main>;

    return (
        <main className="gallery-editor-page flex min-h-full flex-1 flex-col bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadPhoto} />
            <header className="mx-auto mb-6 flex w-full max-w-none items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-blue-700">Gallery editor</p>
                    <h1 className="text-2xl font-bold sm:text-3xl">{gallery.title}</h1>
                </div>
                <Link href="/galleries/mine" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Done</Link>
            </header>

            {(error || notice) && <p role={error ? "alert" : "status"} className={`mx-auto mb-5 w-full max-w-none rounded-lg border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>{error || notice}</p>}

            <div className={`mx-auto grid w-full max-w-none gap-6 ${gallery.purpose === 1 ? "xl:grid-cols-[15rem_minmax(0,1fr)_22rem]" : "xl:grid-cols-[minmax(0,1fr)_22rem]"} xl:items-start`}>
                {gallery.purpose === 1 && <UnsortedTray
                    photos={photos.filter((photo) => photo.boardX === null || photo.boardY === null)}
                    isUploading={isUploading}
                    onUpload={() => openFilePicker()}
                    onPlace={(photoId, position) => { void saveMoodboardLayout(photoId, position); }}
                />}

                {gallery.purpose === 1 ? (
                    <MoodboardBoard
                        photos={photos}
                        editable
                        captionDrafts={captionDrafts}
                        onLayoutChange={(photoId, layout) => { void saveMoodboardLayout(photoId, layout); }}
                        onUnsortedDrop={(photoId, layout) => { void saveMoodboardLayout(photoId, layout); }}
                        onCaptionChange={updateCaption}
                    />
                ) : (
                    <section aria-label="Gallery photos" className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <InsertPhotoButton label="Add your first photo" isUploading={isUploading} onClick={() => openFilePicker({ insertAtStart: true })} />
                        {photos.map((photo) => (
                            <div key={photo.id}>
                                <figure>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photo.imageUrl} alt={photo.caption || "Gallery photograph"} className="block h-auto w-full" />
                                    <figcaption className="border-t border-slate-100 px-5 py-3">
                                        <label className="block text-xs font-medium text-slate-500" htmlFor={`photo-caption-${photo.id}`}>Caption</label>
                                        <textarea
                                            id={`photo-caption-${photo.id}`}
                                            value={captionDrafts[photo.id] ?? photo.caption ?? ""}
                                            onChange={(event) => updateCaption(photo, event.target.value)}
                                            maxLength={500}
                                            rows={2}
                                            placeholder="Click to add a caption"
                                            className="mt-1.5 block w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-600 outline-none transition placeholder:text-slate-400 hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                        />
                                    </figcaption>
                                </figure>
                                <InsertPhotoButton label="Upload photo here" isUploading={isUploading} onClick={() => openFilePicker({ insertAfterPhotoId: photo.id })} />
                            </div>
                        ))}
                    </section>
                )}

                <aside className="lg:sticky lg:top-5">
                    <form action={saveDetails} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">Gallery settings</h2>
                        <label className="mt-5 block text-sm font-medium" htmlFor="gallery-title">Title</label>
                        <input id="gallery-title" name="title" defaultValue={gallery.title} maxLength={150} required className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                        <label className="mt-4 block text-sm font-medium" htmlFor="gallery-description">Description</label>
                        <textarea id="gallery-description" name="description" defaultValue={gallery.description ?? ""} maxLength={2000} rows={4} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                        <label className="mt-4 block text-sm font-medium" htmlFor="gallery-purpose">Gallery type</label>
                        <select id="gallery-purpose" name="purpose" defaultValue={gallery.purpose} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                            {Object.entries(galleryPurposeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <label className="mt-4 block text-sm font-medium" htmlFor="gallery-collaboration">Linked collaboration</label>
                        <select id="gallery-collaboration" name="collabPostId" defaultValue={gallery.collabPostId ?? ""} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                            <option value="">Not linked to a collaboration</option>
                            {collaborations.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                        </select>
                        <p className="mt-2 text-xs leading-5 text-slate-500">You can link your own post or a collaboration where your application was accepted. Each post can have one moodboard.</p>
                        {settingsFeedback && <p
                            role={settingsFeedback.type === "error" ? "alert" : "status"}
                            className={`mt-5 rounded-md border p-3 text-sm ${settingsFeedback.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}
                        >
                            {settingsFeedback.message}
                        </p>}
                        {Object.keys(captionDrafts).length > 0 && <p className="mt-4 text-xs text-amber-700">You have unsaved photo caption changes.</p>}
                        <button type="submit" disabled={isSaving} className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300">{isSaving ? "Saving changes…" : "Save changes"}</button>
                    </form>

                    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">Visibility</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{gallery.isPublished ? "Published galleries appear in Public Galleries and can be opened by anyone with the link." : "Draft galleries are visible only to you. Add at least one photo before publishing."}</p>
                        {gallery.isPublished && <Link href={`/galleries/${gallery.id}`} className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline">Open public gallery ↗</Link>}
                        <button type="button" disabled={isPublishing || (!gallery.isPublished && photos.length === 0)} onClick={changePublication} className="mt-4 w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">{isPublishing ? "Updating…" : gallery.isPublished ? "Unpublish gallery" : "Publish gallery"}</button>
                    </section>
                </aside>
            </div>
        </main>
    );
}

function InsertPhotoButton({ label, isUploading, onClick }: { label: string; isUploading: boolean; onClick: () => void }) {
    return <div className="group relative flex min-h-8 items-center justify-center bg-slate-50 py-1.5">
        <button type="button" disabled={isUploading} onClick={onClick} className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 opacity-100 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">{isUploading ? "Uploading…" : `＋ ${label}`}</button>
    </div>;
}

function UnsortedTray({
    photos,
    isUploading,
    onUpload,
    onPlace,
}: {
    photos: Photo[];
    isUploading: boolean;
    onUpload: () => void;
    onPlace: (photoId: string, layout: MoodboardLayout) => void;
}) {
    return (
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-5 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="font-semibold">Unsorted</h2>
                    <p className="mt-1 text-xs text-slate-500">Drag an image onto the board.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{photos.length}</span>
            </div>
            <button type="button" disabled={isUploading} onClick={onUpload} className="mt-4 w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400">
                {isUploading ? "Uploading…" : "＋ Upload image"}
            </button>
            {photos.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Uploaded images will appear here until you place them on the board.</p>
            ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-1">
                    {photos.map((photo, index) => (
                        <div
                            key={photo.id}
                            draggable
                            onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("application/x-linklab-photo", photo.id);
                            }}
                            className="cursor-grab overflow-hidden rounded-md border border-slate-200 bg-slate-50 active:cursor-grabbing"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.imageUrl} alt={photo.caption || "Unsorted moodboard image"} draggable={false} className="block h-auto w-full" />
                            <div className="flex items-center justify-between gap-2 p-2">
                                <span className="min-w-0 truncate text-xs text-slate-500">{photo.caption || "Untitled image"}</span>
                                <button
                                    type="button"
                                    onClick={() => onPlace(photo.id, {
                                        x: 120 + (index % 5) * (MOODBOARD_CARD_WIDTH + 30),
                                        y: 120 + Math.floor(index / 5) * 280,
                                        width: MOODBOARD_CARD_WIDTH,
                                        captionHeight: MOODBOARD_CAPTION_HEIGHT,
                                    })}
                                    className="shrink-0 text-xs font-medium text-blue-700 hover:underline"
                                >
                                    Place
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </aside>
    );
}
