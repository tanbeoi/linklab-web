export type CollabPost = {
    id: string;
    title: string;
    description: string;
    location: string;
    isRemote: boolean;
    isClosed: boolean;
    createdAtUtc: string;
    userId: string;
    ownerDisplayName: string;
    moodboardPreviewImageUrls: string[];
    moodboardPhotoCount: number;
    // Available for a post owner even when the linked moodboard is still private
    // or does not have photos yet.
    hasLinkedMoodboard?: boolean;
    portfolioGalleries: PortfolioGalleryPreview[];
    hasCurrentUserApplied: boolean;
    currentUserApplicationStatus?: ApplicationStatus | null;
};

export type PortfolioGalleryPreview = {
    id: string;
    title: string;
    ownerId: string;
    ownerDisplayName: string;
    previewImageUrl: string | null;
    photoCount: number;
    thumbnailFocalPointX: number;
    thumbnailFocalPointY: number;
    thumbnailZoom: number;
};

export type PagedResponse<T> = {
    items: T[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
};

export type CreateCollabPostRequest = {
    title: string;
    description: string;
    location: string;
    isRemote: boolean;
}

export type UpdateCollabPostRequest = CreateCollabPostRequest;

export type UpdatePostClosureRequest = {
    isClosed: boolean;
};

export type ApplyToPostRequest = {
    message: string;
};

export type ApplyToPostResponse = {
    id: string;
    postId: string;
    applicantUserId: string;
    message: string;
    status: string;
    createdAtUtc: string;
    decidedAtUtc?: string;
};

export type ApplicationStatus = "Pending" | "Accepted" | "Rejected";

export type MyApplication = {
    id: string;
    postId: string;
    postTitle: string;
    message: string;
    status: ApplicationStatus;
    createdAtUtc: string;
    decidedAtUtc: string | null;
};

export type ReceivedApplication = {
    id: string;
    postId: string;
    postTitle: string;
    applicantUserId: string;
    applicantDisplayName: string;
    message: string;
    status: ApplicationStatus;
    createdAtUtc: string;
    decidedAtUtc: string | null;
};

export type PostApplication = {
    id: string;
    postId: string;
    applicantUserId: string;
    applicantEmail: string;
    applicantDisplayName: string;
    message: string;
    status: ApplicationStatus;
    createdAtUtc: string;
    decidedAtUtc: string | null;
};

export type ApplicationDecisionResponse = {
    id: string;
    postId: string;
    applicantUserId: string;
    message: string;
    status: ApplicationStatus;
    createdAtUtc: string;
    decidedAtUtc: string | null;
};
