"use client";

import { useParams } from "next/navigation";

import { PostEditor } from "@/components/post-editor";

export default function EditPostPage() {
    const { postId } = useParams<{ postId: string }>();
    return <PostEditor postId={postId} />;
}
