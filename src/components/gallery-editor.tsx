"use client";

import Link from "next/link";
import { ChangeEvent, Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/contexts/auth-context";
import {
    MOODBOARD_CAPTION_HEIGHT,
    MOODBOARD_CARD_WIDTH,
    MoodboardBoard,
    type MoodboardLayout,
} from "@/components/moodboard-board";
import { apiRequest } from "@/lib/api";
import { uploadToSignedUrl } from "@/lib/direct-upload";
import { UploadProgressPreview, UploadProgressRing } from "@/components/upload-progress-preview";
import {
    galleryPurposeLabels,
    type Gallery,
    type GalleryPurpose,
    type Photo,
    type AddPhotoToGalleryRequest,
    type CreateGalleryThumbnailUploadUrlResponse,
    type CreatePhotoUploadUrlRequest,
    type CreatePhotoUploadUrlResponse,
    type GalleryThumbnailResponse,
    type UpdatePhotoCaptionsRequest,
    type UpdatePhotoBoardPositionRequest,
    type UpdateGalleryCollabPostRequest,
    type UpdateGalleryThumbnailFrameRequest,
    type UpdateGalleryThumbnailSourceRequest,
    type UpdateGalleryRequest,
} from "@/types/galleries";
import type { CollabPost, MyApplication, PagedResponse } from "@/types/posts";

type InsertionPoint = { insertAtStart: true } | { insertAfterPhotoId: string };
type PhotoUploadPreview = { imageUrl: string; progress: number; insertionPoint: InsertionPoint };

type CollaborationOption = { id: string; title: string };

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export function GalleryEditor({ galleryId }: { galleryId: string }) {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoPreviewUrlRef = useRef<string | null>(null);
    const [gallery, setGallery] = useState<Gallery | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
    const [collaborations, setCollaborations] = useState<CollaborationOption[]>([]);
    const [insertionPoint, setInsertionPoint] = useState<InsertionPoint>({ insertAtStart: true });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [photoUploadPreview, setPhotoUploadPreview] = useState<PhotoUploadPreview | null>(null);
    const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [settingsFeedback, setSettingsFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);
    const [copyFeedback, setCopyFeedback] = useState<{
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

    function clearPhotoUploadPreview() {
        setPhotoUploadPreview(null);
        if (photoPreviewUrlRef.current) {
            URL.revokeObjectURL(photoPreviewUrlRef.current);
            photoPreviewUrlRef.current = null;
        }
    }

    async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !gallery) return;

        if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
            setError("Choose a JPEG, PNG, or WebP image.");
            return;
        }

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            setError("Choose an image smaller than 10 MB.");
            return;
        }

        setError("");
        setNotice("");
        clearPhotoUploadPreview();
        const imageUrl = URL.createObjectURL(file);
        photoPreviewUrlRef.current = imageUrl;
        const previewInsertionPoint = insertionPoint;
        setPhotoUploadPreview({ imageUrl, progress: 0, insertionPoint: previewInsertionPoint });
        setIsUploading(true);

        try {
            const uploadRequest: CreatePhotoUploadUrlRequest = {
                fileName: file.name,
                contentType: file.type,
            };
            const uploadDetails = await apiRequest<CreatePhotoUploadUrlResponse>(`/api/galleries/${gallery.id}/photos/upload-url`, {
                method: "POST",
                body: JSON.stringify(uploadRequest),
            });

            // This request goes straight from the browser to S3. It deliberately
            // does not use apiRequest, which would attach the LinkLab API token.
            await uploadToSignedUrl({
                uploadUrl: uploadDetails.uploadUrl,
                file,
                onProgress: (progress) => setPhotoUploadPreview((current) => current ? { ...current, progress } : current),
            });

            const addPhotoRequest: AddPhotoToGalleryRequest = {
                photoId: uploadDetails.photoId,
                objectKey: uploadDetails.objectKey,
            };

            if ("insertAtStart" in insertionPoint) {
                addPhotoRequest.insertAtStart = true;
            } else {
                addPhotoRequest.insertAfterPhotoId = insertionPoint.insertAfterPhotoId;
            }

            const saved = await apiRequest<Photo>(`/api/galleries/${gallery.id}/photos`, {
                method: "POST",
                body: JSON.stringify(addPhotoRequest),
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
            clearPhotoUploadPreview();
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

    async function deletePhoto(photo: Photo) {
        if (!gallery || deletingPhotoId) return;

        const previousPhotos = photos;
        const previousDrafts = captionDrafts;
        setDeletingPhotoId(photo.id);
        setError("");
        setNotice("");
        setPhotos((current) => current.filter((candidate) => candidate.id !== photo.id));
        setCaptionDrafts((current) => {
            const remaining = { ...current };
            delete remaining[photo.id];
            return remaining;
        });

        try {
            await apiRequest<void>(`/api/galleries/${gallery.id}/photos/${photo.id}`, {
                method: "DELETE",
            });
            setGallery((current) => current ? {
                ...current,
                photoCount: Math.max(0, current.photoCount - 1),
            } : current);
            setNotice("Photo deleted.");
        } catch (cause) {
            setPhotos(previousPhotos);
            setCaptionDrafts(previousDrafts);
            setError(errorMessage(cause, "Could not delete the photo."));
        } finally {
            setDeletingPhotoId(null);
        }
    }

    async function copyPublicLink() {
        if (!gallery) return;

        const publicLink = `${window.location.origin}/galleries/${gallery.id}`;
        setCopyFeedback(null);

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(publicLink);
            } else {
                const fallbackInput = document.createElement("textarea");
                fallbackInput.value = publicLink;
                fallbackInput.setAttribute("readonly", "");
                fallbackInput.className = "fixed -left-[9999px]";
                document.body.appendChild(fallbackInput);
                fallbackInput.select();
                const copied = document.execCommand("copy");
                fallbackInput.remove();

                if (!copied) throw new Error("Clipboard access was denied.");
            }

            setCopyFeedback({ type: "success", message: "Public link copied." });
        } catch {
            setCopyFeedback({ type: "error", message: "Could not copy the link. Please copy it from the public gallery page." });
        }
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
                    uploadPreview={photoUploadPreview}
                    isUploading={isUploading}
                    deletingPhotoId={deletingPhotoId}
                    onUpload={() => openFilePicker()}
                    onPlace={(photoId, position) => { void saveMoodboardLayout(photoId, position); }}
                    onDelete={(photo) => { void deletePhoto(photo); }}
                />}

                {gallery.purpose === 1 ? (
                    <MoodboardBoard
                        photos={photos}
                        editable
                        captionDrafts={captionDrafts}
                        onLayoutChange={(photoId, layout) => { void saveMoodboardLayout(photoId, layout); }}
                        onUnsortedDrop={(photoId, layout) => { void saveMoodboardLayout(photoId, layout); }}
                        onCaptionChange={updateCaption}
                        onDeletePhoto={(photo) => { void deletePhoto(photo); }}
                    />
                ) : (
                    <section aria-label="Gallery photos" className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <InsertPhotoButton label={photos.length === 0 ? "Add your first photo" : "Add photo at the top"} isUploading={isUploading} onClick={() => openFilePicker({ insertAtStart: true })} />
                        {photoUploadPreview?.insertionPoint && "insertAtStart" in photoUploadPreview.insertionPoint && <UploadProgressPreview imageUrl={photoUploadPreview.imageUrl} progress={photoUploadPreview.progress} alt="Uploading gallery photo" className="w-full" imageClassName="h-auto" />}
                        {photos.map((photo) => (<Fragment key={photo.id}>
                            <div key={photo.id}>
                                <figure className="relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photo.imageUrl} alt={photo.caption || "Gallery photograph"} className="block h-auto w-full" />
                                    <button
                                        type="button"
                                        disabled={deletingPhotoId !== null}
                                        aria-label={`Delete ${photo.caption || "portfolio image"}`}
                                        title="Delete photo"
                                        onClick={() => { void deletePhoto(photo); }}
                                        className="absolute right-3 top-3 z-10 flex size-6 items-center justify-center rounded-full bg-white/85 text-base leading-none text-slate-500 shadow-sm backdrop-blur-sm transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span aria-hidden="true">×</span>
                                    </button>
                                    <figcaption className="border-t border-slate-100 px-5 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="block text-xs font-medium text-slate-500" htmlFor={`photo-caption-${photo.id}`}>Caption</label>
                                            <button
                                                type="button"
                                                disabled={deletingPhotoId !== null}
                                                onClick={() => { void deletePhoto(photo); }}
                                                className="text-xs font-medium text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {deletingPhotoId === photo.id ? "Deleting…" : "Delete photo"}
                                            </button>
                                        </div>
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
                            {photoUploadPreview?.insertionPoint && "insertAfterPhotoId" in photoUploadPreview.insertionPoint && photoUploadPreview.insertionPoint.insertAfterPhotoId === photo.id && <UploadProgressPreview imageUrl={photoUploadPreview.imageUrl} progress={photoUploadPreview.progress} alt="Uploading gallery photo" className="w-full" imageClassName="h-auto" />}
                        </Fragment>))}
                    </section>
                )}

                <aside className="xl:sticky xl:top-5 xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
                    <form action={saveDetails} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">Gallery settings</h2>
                        <label className="mt-5 block text-sm font-medium" htmlFor="gallery-title">Title</label>
                        <input id="gallery-title" name="title" defaultValue={gallery.title} maxLength={150} required className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                        <label className="mt-4 block text-sm font-medium" htmlFor="gallery-description">Description</label>
                        <textarea id="gallery-description" name="description" defaultValue={gallery.description ?? ""} maxLength={2000} rows={4} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
                        <ThumbnailSettings
                            gallery={gallery}
                            photos={photos}
                            onUpdated={(thumbnail) => setGallery((current) => current ? { ...current, ...thumbnail } : current)}
                        />
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
                        <button type="submit" disabled={isSaving} className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300">{isSaving ? "Saving gallery details…" : "Save gallery details"}</button>
                    </form>

                    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">Visibility</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{gallery.isPublished ? "Published galleries appear in Public Galleries and can be opened by anyone with the link." : "Draft galleries are visible only to you. Add at least one photo before publishing."}</p>
                        {gallery.isPublished && <>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                <Link href={`/galleries/${gallery.id}`} className="text-sm font-medium text-blue-700 hover:underline">Open public gallery ↗</Link>
                                <button type="button" onClick={() => { void copyPublicLink(); }} className="text-sm font-medium text-blue-700 hover:underline">
                                    Copy public link
                                </button>
                            </div>
                            {copyFeedback && <p
                                role={copyFeedback.type === "error" ? "alert" : "status"}
                                className={`mt-3 text-sm ${copyFeedback.type === "error" ? "text-red-700" : "text-green-700"}`}
                            >
                                {copyFeedback.message}
                            </p>}
                        </>}
                        <button type="button" disabled={isPublishing || (!gallery.isPublished && photos.length === 0)} onClick={changePublication} className="mt-4 w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">{isPublishing ? "Updating…" : gallery.isPublished ? "Unpublish gallery" : "Publish gallery"}</button>
                    </section>
                </aside>
            </div>
        </main>
    );
}

type ThumbnailSource = "automatic" | "photo" | "custom";

type ThumbnailDraft = {
    source: ThumbnailSource;
    photoId: string | null;
    customObjectKey: string | null;
    previewImageUrl: string | null;
    focalPointX: number;
    focalPointY: number;
    zoom: number;
};

function thumbnailSourceFor(gallery: Gallery): ThumbnailSource {
    if (gallery.hasCustomThumbnail) return "custom";
    if (gallery.thumbnailPhotoId) return "photo";
    return "automatic";
}

function clampThumbnailFrame(value: number) {
    return Math.min(100, Math.max(0, value));
}

function ThumbnailSettings({
    gallery,
    photos,
    onUpdated,
}: {
    gallery: Gallery;
    photos: Photo[];
    onUpdated: (thumbnail: GalleryThumbnailResponse) => void;
}) {
    const thumbnailFileInputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; y: number; focalPointX: number; focalPointY: number } | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [draft, setDraft] = useState<ThumbnailDraft | null>(null);

    function openEditor() {
        setFeedback("");
        setDraft({
            source: thumbnailSourceFor(gallery),
            photoId: gallery.thumbnailPhotoId,
            customObjectKey: null,
            previewImageUrl: gallery.previewImageUrl,
            focalPointX: gallery.thumbnailFocalPointX ?? 50,
            focalPointY: gallery.thumbnailFocalPointY ?? 50,
            zoom: gallery.thumbnailZoom ?? 1,
        });
        setIsOpen(true);
    }

    const automaticPhoto = [...photos]
        .sort((left, right) => left.sortOrder - right.sortOrder || left.createdAtUtc.localeCompare(right.createdAtUtc))[0];
    const selectedPhoto = draft?.source === "photo"
        ? photos.find((photo) => photo.id === draft.photoId) ?? null
        : null;
    const previewImageUrl = draft?.source === "automatic"
        ? automaticPhoto?.imageUrl ?? null
        : draft?.source === "photo"
            ? selectedPhoto?.imageUrl ?? null
            : draft?.previewImageUrl ?? null;

    async function uploadCustomThumbnail(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
            setFeedback("Choose a JPEG, PNG, or WebP image.");
            return;
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            setFeedback("Choose an image smaller than 10 MB.");
            return;
        }

        setFeedback("");
        const localPreviewUrl = URL.createObjectURL(file);
        setDraft((current) => current ? {
            ...current,
            source: "custom",
            photoId: null,
            customObjectKey: null,
            previewImageUrl: localPreviewUrl,
            focalPointX: 50,
            focalPointY: 50,
            zoom: 1,
        } : current);
        setThumbnailUploadProgress(0);
        setIsUploading(true);
        try {
            const uploadDetails = await apiRequest<CreateGalleryThumbnailUploadUrlResponse>(
                `/api/galleries/${gallery.id}/thumbnail/upload-url`,
                {
                    method: "POST",
                    body: JSON.stringify({ fileName: file.name, contentType: file.type } satisfies CreatePhotoUploadUrlRequest),
                },
            );
            await uploadToSignedUrl({
                uploadUrl: uploadDetails.uploadUrl,
                file,
                onProgress: setThumbnailUploadProgress,
            });

            setDraft((current) => current ? {
                ...current,
                source: "custom",
                photoId: null,
                customObjectKey: uploadDetails.objectKey,
                previewImageUrl: uploadDetails.previewImageUrl,
                focalPointX: 50,
                focalPointY: 50,
                zoom: 1,
            } : current);
        } catch (cause) {
            setFeedback(errorMessage(cause, "Could not upload the thumbnail."));
        } finally {
            setThumbnailUploadProgress(null);
            setIsUploading(false);
        }
    }

    function choosePhoto(photo: Photo) {
        setDraft((current) => current ? {
            ...current,
            source: "photo",
            photoId: photo.id,
            customObjectKey: null,
            previewImageUrl: photo.imageUrl,
            focalPointX: 50,
            focalPointY: 50,
            zoom: 1,
        } : current);
    }

    function useAutomaticPhoto() {
        setDraft((current) => current ? {
            ...current,
            source: "automatic",
            photoId: null,
            customObjectKey: null,
            previewImageUrl: automaticPhoto?.imageUrl ?? null,
            focalPointX: 50,
            focalPointY: 50,
            zoom: 1,
        } : current);
    }

    function updateFrame(field: "focalPointX" | "focalPointY" | "zoom", value: number) {
        setDraft((current) => current ? { ...current, [field]: value } : current);
    }

    function startReframe(event: React.PointerEvent<HTMLDivElement>) {
        if (!draft || !previewImageUrl) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            focalPointX: draft.focalPointX,
            focalPointY: draft.focalPointY,
        };
    }

    function reframeFromDrag(event: React.PointerEvent<HTMLDivElement>) {
        if (!dragStartRef.current || !previewRef.current) return;
        const dragStart = dragStartRef.current;
        const bounds = previewRef.current.getBoundingClientRect();
        const horizontalDelta = ((event.clientX - dragStart.x) / bounds.width) * 100;
        const verticalDelta = ((event.clientY - dragStart.y) / bounds.height) * 100;
        setDraft((current) => current ? {
            ...current,
            focalPointX: clampThumbnailFrame(dragStart.focalPointX - horizontalDelta),
            focalPointY: clampThumbnailFrame(dragStart.focalPointY - verticalDelta),
        } : current);
    }

    function finishReframe() {
        dragStartRef.current = null;
    }

    async function saveThumbnail() {
        if (!draft) return;
        if (draft.source === "custom" && !draft.customObjectKey && !gallery.hasCustomThumbnail) {
            setFeedback("Upload an image before using a custom thumbnail.");
            return;
        }

        const originalSource = thumbnailSourceFor(gallery);
        const sourceChanged = draft.source !== originalSource ||
            (draft.source === "photo" && draft.photoId !== gallery.thumbnailPhotoId) ||
            (draft.source === "custom" && draft.customObjectKey !== null);

        setFeedback("");
        setIsSaving(true);
        try {
            let savedThumbnail: GalleryThumbnailResponse | null = null;
            if (sourceChanged) {
                const request: UpdateGalleryThumbnailSourceRequest = draft.source === "photo"
                    ? { photoId: draft.photoId }
                    : draft.source === "custom"
                        ? { objectKey: draft.customObjectKey }
                        : {};
                savedThumbnail = await apiRequest<GalleryThumbnailResponse>(`/api/galleries/${gallery.id}/thumbnail`, {
                    method: "PATCH",
                    body: JSON.stringify(request),
                });
            }

            const frameRequest: UpdateGalleryThumbnailFrameRequest = {
                focalPointX: draft.focalPointX,
                focalPointY: draft.focalPointY,
                zoom: draft.zoom,
            };
            savedThumbnail = await apiRequest<GalleryThumbnailResponse>(`/api/galleries/${gallery.id}/thumbnail/frame`, {
                method: "PATCH",
                body: JSON.stringify(frameRequest),
            });

            onUpdated(savedThumbnail);
            setIsOpen(false);
        } catch (cause) {
            setFeedback(errorMessage(cause, "Could not save the thumbnail."));
        } finally {
            setIsSaving(false);
        }
    }

    return <>
        <section className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-slate-200">
                    {gallery.previewImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={gallery.previewImageUrl} alt="Current gallery thumbnail" className="size-full object-cover" style={{ objectPosition: `${gallery.thumbnailFocalPointX ?? 50}% ${gallery.thumbnailFocalPointY ?? 50}%`, transform: `scale(${gallery.thumbnailZoom ?? 1})`, transformOrigin: `${gallery.thumbnailFocalPointX ?? 50}% ${gallery.thumbnailFocalPointY ?? 50}%` }} />
                    ) : <div className="flex size-full items-center justify-center text-xs text-slate-500">None</div>}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-800">Gallery thumbnail</h3>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">Choose an image and adjust its crop for gallery cards.</p>
                </div>
            </div>
            <button type="button" onClick={openEditor} className="mt-3 text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline">Change thumbnail</button>
        </section>

        {isOpen && draft && createPortal(<div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="thumbnail-editor-title">
            <section className="max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Gallery thumbnail</p>
                        <h2 id="thumbnail-editor-title" className="mt-1 text-xl font-semibold text-slate-900">Choose and reframe your thumbnail</h2>
                        <p className="mt-1 text-sm text-slate-600">This only changes the image shown on gallery cards. It does not crop or change your gallery photos.</p>
                    </div>
                    <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close thumbnail editor">×</button>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div>
                        <div
                            ref={previewRef}
                            onPointerDown={startReframe}
                            onPointerMove={reframeFromDrag}
                            onPointerUp={finishReframe}
                            onPointerCancel={finishReframe}
                            className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 ${previewImageUrl ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
                        >
                            {previewImageUrl ? <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewImageUrl} alt="Thumbnail crop preview" className={`size-full object-cover ${thumbnailUploadProgress !== null ? "brightness-75" : ""}`} draggable={false} onDragStart={(event) => event.preventDefault()} style={{ objectPosition: `${draft.focalPointX}% ${draft.focalPointY}%`, transform: `scale(${draft.zoom})`, transformOrigin: `${draft.focalPointX}% ${draft.focalPointY}%` }} />
                                <div className="pointer-events-none absolute inset-3 rounded-md border border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.12)]" />
                                <p className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-950/65 px-2 py-1 text-xs font-medium text-white">Drag to reframe</p>
                                {thumbnailUploadProgress !== null && <UploadProgressRing progress={thumbnailUploadProgress} />}
                            </> : <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">Choose an existing gallery photo or upload an image to start.</div>}
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <label className="text-sm font-medium text-slate-700">Horizontal
                                <input type="range" min="0" max="100" value={draft.focalPointX} onChange={(event) => updateFrame("focalPointX", Number(event.target.value))} className="mt-2 w-full accent-blue-600" />
                            </label>
                            <label className="text-sm font-medium text-slate-700">Vertical
                                <input type="range" min="0" max="100" value={draft.focalPointY} onChange={(event) => updateFrame("focalPointY", Number(event.target.value))} className="mt-2 w-full accent-blue-600" />
                            </label>
                            <label className="text-sm font-medium text-slate-700">Zoom
                                <input type="range" min="1" max="3" step="0.05" value={draft.zoom} onChange={(event) => updateFrame("zoom", Number(event.target.value))} className="mt-2 w-full accent-blue-600" />
                            </label>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">Image source</h3>
                        <button type="button" onClick={useAutomaticPhoto} className={`mt-3 flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${draft.source === "automatic" ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"}`}>
                            <div className="relative size-12 shrink-0 overflow-hidden rounded bg-slate-100">{automaticPhoto ? <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={automaticPhoto.imageUrl} alt="" className="size-full object-cover" />
                            </> : null}</div>
                            <span><span className="block text-sm font-medium">Use first gallery photo</span><span className="block text-xs text-slate-500">Automatic default</span></span>
                        </button>
                        <button type="button" onClick={() => thumbnailFileInputRef.current?.click()} disabled={isUploading} className="mt-3 w-full rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 hover:border-blue-500 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">{isUploading ? "Uploading image…" : "Upload a thumbnail image"}</button>
                        <input ref={thumbnailFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadCustomThumbnail} />
                        {photos.length > 0 && <div className="mt-5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gallery photos</p>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                {photos.map((photo) => <button type="button" key={photo.id} onClick={() => choosePhoto(photo)} title="Use this photo as the thumbnail" className={`relative aspect-square overflow-hidden rounded-md border-2 transition ${draft.source === "photo" && draft.photoId === photo.id ? "border-blue-500 ring-2 ring-blue-100" : "border-transparent hover:border-slate-300"}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photo.imageUrl} alt={photo.caption || "Gallery photo"} className="size-full object-cover" />
                                </button>)}
                            </div>
                        </div>}
                    </div>
                </div>

                {feedback && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{feedback}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                    <button type="button" disabled={isSaving} onClick={() => setIsOpen(false)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
                    <button type="button" disabled={isSaving || isUploading} onClick={() => { void saveThumbnail(); }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">{isSaving ? "Saving thumbnail…" : "Save thumbnail"}</button>
                </div>
            </section>
        </div>, document.body)}
    </>;
}

function InsertPhotoButton({ label, isUploading, onClick }: { label: string; isUploading: boolean; onClick: () => void }) {
    return <div className="group relative flex min-h-8 items-center justify-center bg-slate-50 py-1.5">
        <button type="button" disabled={isUploading} onClick={onClick} className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 opacity-100 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">{isUploading ? "Uploading…" : `＋ ${label}`}</button>
    </div>;
}

function UnsortedTray({
    photos,
    uploadPreview,
    isUploading,
    deletingPhotoId,
    onUpload,
    onPlace,
    onDelete,
}: {
    photos: Photo[];
    uploadPreview: PhotoUploadPreview | null;
    isUploading: boolean;
    deletingPhotoId: string | null;
    onUpload: () => void;
    onPlace: (photoId: string, layout: MoodboardLayout) => void;
    onDelete: (photo: Photo) => void;
}) {
    return (
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-5 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="font-semibold">Unsorted</h2>
                    <p className="mt-1 text-xs text-slate-500">Drag an image onto the board.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{photos.length + (uploadPreview ? 1 : 0)}</span>
            </div>
            <button type="button" disabled={isUploading} onClick={onUpload} className="mt-4 w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400">
                {isUploading ? "Uploading…" : "＋ Upload image"}
            </button>
            {photos.length === 0 && !uploadPreview ? (
                <p className="py-8 text-center text-sm text-slate-500">Uploaded images will appear here until you place them on the board.</p>
            ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-1">
                    {uploadPreview && <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50"><UploadProgressPreview imageUrl={uploadPreview.imageUrl} progress={uploadPreview.progress} alt="Uploading moodboard image" className="aspect-[4/3] w-full" /></div>}
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
                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={deletingPhotoId !== null}
                                        onClick={() => onDelete(photo)}
                                        className="text-xs font-medium text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {deletingPhotoId === photo.id ? "Deleting…" : "Delete"}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={deletingPhotoId !== null}
                                        onClick={() => onPlace(photo.id, {
                                            x: 120 + (index % 5) * (MOODBOARD_CARD_WIDTH + 30),
                                            y: 120 + Math.floor(index / 5) * 280,
                                            width: MOODBOARD_CARD_WIDTH,
                                            captionHeight: MOODBOARD_CAPTION_HEIGHT,
                                        })}
                                        className="text-xs font-medium text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Place
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </aside>
    );
}
