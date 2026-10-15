export type GalleryPurpose = 0 | 1;

export const galleryPurposeLabels: Record<GalleryPurpose, string> = {
    0: "Portfolio",
    1: "Moodboard",
};

export type Gallery = {
    id: string;
    title: string;
    description: string | null;
    purpose: GalleryPurpose;
    isPublished: boolean;
    ownerId: string;
    collabPostId: string | null;
    collabPostTitle: string | null;
    sortOrder: number;
    createdAtUtc: string;
    publishedAtUtc: string | null;
    photoCount: number;
    ownerDisplayName: string;
    previewImageUrl: string | null;
};

export type Photo = {
    id: string;
    galleryId: string;
    objectKey: string;
    imageUrl: string;
    caption: string | null;
    sortOrder: number;
    boardX: number | null;
    boardY: number | null;
    boardWidth: number | null;
    captionHeight: number | null;
    boardZIndex: number | null;
    createdAtUtc: string;
};

export type CreateGalleryRequest = {
    title: string;
    description: string;
    purpose: GalleryPurpose;
    collabPostId?: string | null;
};

export type UpdateGalleryRequest = {
    title: string;
    description: string;
    purpose: GalleryPurpose;
};

export type UpdateGalleryCollabPostRequest = {
    collabPostId: string | null;
};

export type CreatePhotoUploadUrlRequest = {
    fileName?: string;
    contentType: string;
};

export type CreatePhotoUploadUrlResponse = {
    photoId: string;
    galleryId: string;
    objectKey: string;
    uploadUrl: string;
    expiresAtUtc: string;
};

export type AddPhotoToGalleryRequest = {
    photoId: string;
    objectKey: string;
    caption?: string;
    insertAfterPhotoId?: string;
    insertAtStart?: boolean;
};

export type UpdatePhotoBoardPositionRequest = {
    boardX: number;
    boardY: number;
    boardWidth?: number;
    captionHeight?: number;
};

export type UpdatePhotoCaptionsRequest = {
    captions: Array<{
        photoId: string;
        caption: string;
    }>;
};
