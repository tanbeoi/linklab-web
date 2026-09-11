export type CollabPost = {
    id: string;
    title: string;
    description: string;
    location: string;
    isRemote: boolean;
    createdAtUtc: string;
    userId: string;
    ownerDisplayName: string;
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

