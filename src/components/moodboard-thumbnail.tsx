"use client";

import { useState } from "react";
import Image from "next/image";

type MoodboardThumbnailProps = {
    src: string;
    alt: string;
    focalPointX?: number;
    focalPointY?: number;
    zoom?: number;
};

export function MoodboardThumbnail({
    src,
    alt,
    focalPointX = 50,
    focalPointY = 50,
    zoom = 1,
}: MoodboardThumbnailProps) {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div
                role="img"
                aria-label={`${alt} is unavailable`}
                className="flex h-full items-center justify-center bg-slate-100 p-3 text-center text-sm text-slate-500"
            >
                Image unavailable
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 33vw, 220px"
            className="object-cover"
            style={{
                objectPosition: `${focalPointX}% ${focalPointY}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${focalPointX}% ${focalPointY}%`,
            }}
            onError={() => setHasError(true)}
        />
    );
}
