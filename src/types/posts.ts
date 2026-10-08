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
    hasCurrentUserApplied: boolean;
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
