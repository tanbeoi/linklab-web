type ProfileAvatarProps = {
    imageUrl?: string | null;
    focalPointX?: number;
    focalPointY?: number;
    zoom?: number;
    alt?: string;
    className?: string;
    iconClassName?: string;
};

export function ProfileAvatar({
    imageUrl,
    focalPointX = 50,
    focalPointY = 50,
    zoom = 1,
    alt = "",
    className = "",
    iconClassName = "",
}: ProfileAvatarProps) {
    return (
        <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-500 shadow-sm ${className}`}>
            {imageUrl ? (
                // Presigned avatar URLs are dynamic, so a native image avoids an
                // unnecessary Next image host allow-list while retaining the crop.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={imageUrl}
                    alt={alt}
                    className="size-full object-cover"
                    style={{
                        objectPosition: `${focalPointX}% ${focalPointY}%`,
                        transform: `scale(${zoom})`,
                        transformOrigin: `${focalPointX}% ${focalPointY}%`,
                    }}
                />
            ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={iconClassName}>
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5.5 20a6.5 6.5 0 0 1 13 0Z" />
                </svg>
            )}
        </span>
    );
}
