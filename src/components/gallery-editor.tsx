"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import {
    galleryPurposeLabels,
    type AddPhotoToGalleryRequest,
    type CreatePhotoUploadUrlRequest,
    type CreatePhotoUploadUrlResponse,
    type Gallery,
    type GalleryPurpose,
    type Photo,
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

    function openFilePicker(point: InsertionPoint) {
        setInsertionPoint(point);
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
            const uploadRequest: CreatePhotoUploadUrlRequest = {
                fileName: file.name,
                contentType: file.type,
            };
            const upload = await apiRequest<CreatePhotoUploadUrlResponse>(
                `/api/galleries/${gallery.id}/photos/upload-url`,
                { method: "POST", body: JSON.stringify(uploadRequest) },
            );

            const uploadResponse = await fetch(upload.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!uploadResponse.ok) throw new Error("The image could not be uploaded to storage.");

            const saved = await apiRequest<Photo>(`/api/galleries/${gallery.id}/photos`, {
                method: "POST",
                body: JSON.stringify({
                    photoId: upload.photoId,
                    objectKey: upload.objectKey,
                    ...("insertAtStart" in insertionPoint
                        ? { insertAtStart: true }
                        : { insertAfterPhotoId: insertionPoint.insertAfterPhotoId }),
                } satisfies AddPhotoToGalleryRequest),
            });

            setPhotos((current) => {
                const index = "insertAtStart" in insertionPoint
                    ? 0
                    : current.findIndex((photo) => photo.id === insertionPoint.insertAfterPhotoId) + 1;
                const copy = [...current];
                copy.splice(Math.max(index, 0), 0, saved);
                return copy;
            });
            setGallery((current) => current ? { ...current, photoCount: current.photoCount + 1 } : current);
            setNotice("Photo uploaded.");
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
                message: "Gallery settings saved.",
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

    if (isLoading) return <main className="gallery-editor-page flex min-h-full flex-1 bg-slate-100 px-4 py-10 text-slate-600">Loading gallery editor…</main>;
    if (error && !gallery) return <main className="gallery-editor-page flex min-h-full flex-1 bg-slate-100 px-4 py-10"><p role="alert" className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">{error}</p></main>;
    if (!gallery || gallery.ownerId !== user?.id) return <main className="gallery-editor-page flex min-h-full flex-1 bg-slate-100 px-4 py-10"><p className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-5 text-slate-700">You can only edit your own galleries.</p></main>;

    return (
        <main className="gallery-editor-page flex min-h-full flex-1 flex-col bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadPhoto} />
            <header className="mx-auto mb-6 flex max-w-7xl items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-blue-700">Gallery editor</p>
                    <h1 className="text-2xl font-bold sm:text-3xl">{gallery.title}</h1>
                </div>
                <Link href="/galleries/mine" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Done</Link>
            </header>

            {(error || notice) && <p role={error ? "alert" : "status"} className={`mx-auto mb-5 max-w-7xl rounded-lg border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>{error || notice}</p>}

            <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
                <section aria-label="Gallery photos" className="overflow-hidden rounded-lg bg-white shadow-sm">
                    <InsertPhotoButton label="Add your first photo" isUploading={isUploading} onClick={() => openFilePicker({ insertAtStart: true })} />
                    {photos.map((photo) => (
                        <div key={photo.id}>
                            <figure>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={photo.imageUrl} alt={photo.caption || "Gallery photograph"} className="block h-auto w-full" />
                                <figcaption className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">{photo.caption || "No caption"}</figcaption>
                            </figure>
                            <InsertPhotoButton label="Upload photo here" isUploading={isUploading} onClick={() => openFilePicker({ insertAfterPhotoId: photo.id })} />
                        </div>
                    ))}
                </section>

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
                        <button type="submit" disabled={isSaving} className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300">{isSaving ? "Saving…" : "Save settings"}</button>
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
