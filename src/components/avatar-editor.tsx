"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProfileAvatar } from "@/components/profile-avatar";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import { uploadToSignedUrl } from "@/lib/direct-upload";
import { UploadProgressRing } from "@/components/upload-progress-preview";
import type { AuthUser } from "@/types/auth";

type AvatarUploadUrlResponse = {
    objectKey: string;
    uploadUrl: string;
    previewImageUrl: string;
    expiresAtUtc: string;
};

type AvatarDraft = {
    objectKey: string | null;
    imageUrl: string | null;
    focalPointX: number;
    focalPointY: number;
    zoom: number;
};

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function clampFrame(value: number) {
    return Math.min(100, Math.max(0, value));
}

function errorMessage(cause: unknown, fallback: string) {
    return cause instanceof Error && cause.message ? cause.message : fallback;
}

function draftFor(user: AuthUser): AvatarDraft {
    return {
        objectKey: null,
        imageUrl: user.avatarImageUrl,
        focalPointX: user.avatarFocalPointX ?? 50,
        focalPointY: user.avatarFocalPointY ?? 50,
        zoom: user.avatarZoom ?? 1,
    };
}

export function AvatarEditor() {
    const router = useRouter();
    const { user, isLoading: isAuthLoading, updateUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; y: number; focalPointX: number; focalPointY: number } | null>(null);
    const [draft, setDraft] = useState<AvatarDraft | null>(null);
    const [draftUserId, setDraftUserId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // The authenticated user arrives after the provider restores the session.
    // Reset only when the signed-in account changes, not on every render.
    if (user && draftUserId !== user.id) {
        setDraftUserId(user.id);
        setDraft(draftFor(user));
    }

    function updateFrame(field: "focalPointX" | "focalPointY" | "zoom", value: number) {
        setDraft((current) => current ? { ...current, [field]: value } : current);
    }

    function startReframe(event: React.PointerEvent<HTMLDivElement>) {
        if (!draft?.imageUrl) return;
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
        // Capture this before scheduling React state. Pointer-up may clear the
        // ref before the updater runs on a quick drag and release.
        const dragStart = dragStartRef.current;
        const bounds = previewRef.current.getBoundingClientRect();
        const horizontalDelta = ((event.clientX - dragStart.x) / bounds.width) * 100;
        const verticalDelta = ((event.clientY - dragStart.y) / bounds.height) * 100;
        setDraft((current) => current ? {
            ...current,
            focalPointX: clampFrame(dragStart.focalPointX - horizontalDelta),
            focalPointY: clampFrame(dragStart.focalPointY - verticalDelta),
        } : current);
    }

    function finishReframe() {
        dragStartRef.current = null;
    }

    async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
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
        setDraft({ objectKey: null, imageUrl: localPreviewUrl, focalPointX: 50, focalPointY: 50, zoom: 1 });
        setUploadProgress(0);
        setIsUploading(true);
        try {
            const upload = await apiRequest<AvatarUploadUrlResponse>("/api/auth/avatar/upload-url", {
                method: "POST",
                body: JSON.stringify({ fileName: file.name, contentType: file.type }),
            });
            await uploadToSignedUrl({
                uploadUrl: upload.uploadUrl,
                file,
                onProgress: setUploadProgress,
            });

            setDraft({
                objectKey: upload.objectKey,
                imageUrl: upload.previewImageUrl,
                focalPointX: 50,
                focalPointY: 50,
                zoom: 1,
            });
        } catch (cause) {
            setDraft(user ? draftFor(user) : null);
            setFeedback(errorMessage(cause, "Could not upload the profile photo."));
        } finally {
            setUploadProgress(null);
            setIsUploading(false);
        }
    }

    async function saveAvatar() {
        if (!draft?.imageUrl) {
            setFeedback("Upload a photo before saving your avatar.");
            return;
        }

        setFeedback("");
        setIsSaving(true);
        try {
            const updatedUser = await apiRequest<AuthUser>("/api/auth/avatar", {
                method: "PATCH",
                body: JSON.stringify({
                    objectKey: draft.objectKey,
                    focalPointX: draft.focalPointX,
                    focalPointY: draft.focalPointY,
                    zoom: draft.zoom,
                }),
            });
            updateUser(updatedUser);
            router.push("/profile");
        } catch (cause) {
            setFeedback(errorMessage(cause, "Could not save the profile photo."));
        } finally {
            setIsSaving(false);
        }
    }

    if (isAuthLoading || !user || !draft) {
        return <main className="flex min-h-full flex-1 items-center justify-center bg-slate-50 px-4 py-12 text-slate-600">Loading avatar editor…</main>;
    }

    return <main className="min-h-full flex-1 bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-4xl">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Profile photo</p>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Choose and reframe your avatar</h1>
                    <p className="mt-3 max-w-2xl leading-7 text-slate-600">Your profile photo appears on your profile and in the navigation. Reframing does not change the uploaded image.</p>
                </div>
                <Link href="/profile" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</Link>
            </header>

            <section className="mt-7 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
                <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-violet-50 px-5 py-4 sm:px-6">
                    <p className="text-sm font-medium text-slate-700">Drag the image in the preview or use the controls below to set the crop.</p>
                </div>
                <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
                    <div>
                        <div
                            ref={previewRef}
                            onPointerDown={startReframe}
                            onPointerMove={reframeFromDrag}
                            onPointerUp={finishReframe}
                            onPointerCancel={finishReframe}
                            className={`relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-full border-8 border-white bg-slate-100 shadow-xl ${draft.imageUrl ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
                        >
                            {draft.imageUrl ? <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={draft.imageUrl} alt="Avatar crop preview" draggable={false} onDragStart={(event) => event.preventDefault()} className={`size-full object-cover ${uploadProgress !== null ? "brightness-75" : ""}`} style={{ objectPosition: `${draft.focalPointX}% ${draft.focalPointY}%`, transform: `scale(${draft.zoom})`, transformOrigin: `${draft.focalPointX}% ${draft.focalPointY}%` }} />
                                <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-black/10" />
                                <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-white">Drag to reframe</p>
                                {uploadProgress !== null && <UploadProgressRing progress={uploadProgress} />}
                            </> : <div className="flex size-full flex-col items-center justify-center gap-3 px-8 text-center text-sm text-slate-500"><ProfileAvatar className="size-20" iconClassName="size-11" /><span>Upload a photo to create your avatar.</span></div>}
                        </div>

                        <div className="mx-auto mt-6 grid max-w-md gap-4 sm:grid-cols-3">
                            <label className="text-sm font-medium text-slate-700">Horizontal
                                <input type="range" min="0" max="100" value={draft.focalPointX} disabled={!draft.imageUrl} onChange={(event) => updateFrame("focalPointX", Number(event.target.value))} className="mt-2 w-full accent-blue-600 disabled:opacity-40" />
                            </label>
                            <label className="text-sm font-medium text-slate-700">Vertical
                                <input type="range" min="0" max="100" value={draft.focalPointY} disabled={!draft.imageUrl} onChange={(event) => updateFrame("focalPointY", Number(event.target.value))} className="mt-2 w-full accent-blue-600 disabled:opacity-40" />
                            </label>
                            <label className="text-sm font-medium text-slate-700">Zoom
                                <input type="range" min="1" max="3" step="0.05" value={draft.zoom} disabled={!draft.imageUrl} onChange={(event) => updateFrame("zoom", Number(event.target.value))} className="mt-2 w-full accent-blue-600 disabled:opacity-40" />
                            </label>
                        </div>
                    </div>

                    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Image source</p>
                        <h2 className="mt-2 text-lg font-semibold">Your avatar</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Use a JPG, PNG, or WebP image up to 10 MB. You can upload a replacement at any time.</p>
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="mt-5 w-full rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-500 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">{isUploading ? "Uploading photo…" : draft.imageUrl ? "Replace profile photo" : "Upload profile photo"}</button>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadAvatar} />

                        <div className="mt-6 border-t border-slate-200 pt-5">
                            <p className="text-sm font-medium text-slate-700">Navigation preview</p>
                            <div className="mt-3 flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                                <ProfileAvatar imageUrl={draft.imageUrl} focalPointX={draft.focalPointX} focalPointY={draft.focalPointY} zoom={draft.zoom} className="size-10" iconClassName="size-5" />
                                <span className="text-sm text-slate-600">How it will look in the nav</span>
                            </div>
                        </div>
                    </aside>
                </div>
                {feedback && <p role="alert" className="mx-5 mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6">{feedback}</p>}
                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-white px-5 py-5 sm:px-6">
                    <Link href="/profile" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</Link>
                    <button type="button" disabled={isSaving || isUploading || !draft.imageUrl} onClick={() => { void saveAvatar(); }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">{isSaving ? "Saving profile photo…" : "Save profile photo"}</button>
                </div>
            </section>
        </div>
    </main>;
}
