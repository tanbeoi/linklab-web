export type CollabPost = {
    id: string;
    title: string;
    description: string;
    location: string;
    isRemote: boolean;
    createdAtUtc: string;
    userId: string;
    ownerDisplayName: string;
    moodboardPreviewImageUrls: string[];
    moodboardPhotoCount: number;
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

