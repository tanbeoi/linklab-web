"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import type { Gallery } from "@/types/galleries";

// Gallery URLs are shareable: a client-side navigation is intercepted into an
// overlay, while a refresh or a pasted URL renders the standalone gallery page.
export function useGalleryNavigation() {
    const router = useRouter();

    const openGallery = useCallback((galleryId: string) => {
        router.push(`/galleries/${galleryId}`, { scroll: false });
    }, [router]);

    const openPostMoodboard = useCallback(async (postId: string) => {
        try {
            const moodboard = await apiRequest<Gallery>(`/api/posts/${postId}/moodboard`);
            openGallery(moodboard.id);
        } catch {
            // A visible moodboard preview should always resolve, but leave the
            // current page intact if the linked gallery has since been removed.
        }
    }, [openGallery]);

    return { openGallery, openPostMoodboard };
}
