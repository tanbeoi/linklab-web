export type Gallery = {
    id: string;
    title: string;
    description: string | null;
    isPublished: boolean;
    createdAtUtc: string;
    publishedAtUtc: string | null;
    photoCount: number;
    purpose: 0 | 1;
    ownerDisplayName: string;
    previewImageUrl: string | null;
};
