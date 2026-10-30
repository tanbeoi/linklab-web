"use client";

import { useParams, useRouter } from "next/navigation";

import { GalleryViewer } from "@/components/gallery-viewer";

export default function GalleryModalRoute() {
  const { galleryId } = useParams<{ galleryId: string }>();
  const router = useRouter();

  return <GalleryViewer source={{ galleryId }} onClose={() => router.back()} />;
}
