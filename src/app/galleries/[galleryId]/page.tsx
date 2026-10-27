"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { MoodboardComposition } from "@/components/moodboard-board";
import { CollaborationOrigin } from "@/components/collaboration-origin";
import { UserProfileLink } from "@/components/user-profile-link";
import type { Gallery, Photo } from "@/types/galleries";

export default function PublicGalleryPage() {
    const { galleryId } = useParams<{ galleryId: string }>();
    const [content, setContent] = useState<{ gallery: Gallery; photos: Photo[] } | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const [gallery, photos] = await Promise.all([
                    apiRequest<Gallery>(`/api/galleries/${galleryId}`),
                    apiRequest<Photo[]>(`/api/galleries/${galleryId}/photos`),
                ]);
                if (!cancelled) setContent({ gallery, photos });
            } catch (cause) {
                if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this gallery.");
            }
        }
        void load();
        return () => { cancelled = true; };
    }, [galleryId]);

    if (error) return <main className="public-gallery-page flex min-h-full flex-1 bg-slate-950 px-4 py-12 text-white"><p className="mx-auto max-w-4xl">{error}</p></main>;
    if (!content) return <main className="public-gallery-page flex min-h-full flex-1 bg-slate-950 px-4 py-12 text-white"><p className="mx-auto max-w-4xl">Loading gallery…</p></main>;

    return <main className="public-gallery-page flex min-h-full flex-1 flex-col bg-slate-950 px-4 py-10 text-white sm:px-6">
        <article className="mx-auto w-full max-w-5xl">
            <header className="mb-8">
                <p className="text-xs font-medium uppercase tracking-widest text-slate-300">{content.gallery.purpose === 1 ? "Moodboard" : "Portfolio"}</p>
                <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{content.gallery.title}</h1>
                <p className="mt-3 text-slate-300">By <UserProfileLink userId={content.gallery.ownerId} className="text-slate-100">{content.gallery.ownerDisplayName}</UserProfileLink></p>
                {content.gallery.description && <p className="mt-5 max-w-3xl whitespace-pre-wrap text-slate-200">{content.gallery.description}</p>}
            </header>
            <div className="mb-6"><CollaborationOrigin gallery={content.gallery} /></div>
            {content.photos.length === 0 ? <p className="rounded-lg bg-white p-8 text-slate-600">No photos have been added yet.</p>
                : content.gallery.purpose === 1 ? <MoodboardComposition photos={content.photos} />
                : <div className="overflow-hidden bg-white">
                    {content.photos.map((photo) => <figure key={photo.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.imageUrl} alt={photo.caption || "Gallery photograph"} className="block h-auto w-full" />
                        {photo.caption && <figcaption className="px-5 py-3 text-sm text-slate-600">{photo.caption}</figcaption>}
                    </figure>)}
                </div>}
        </article>
    </main>;
}
