export function YoutubeVideo({ videoId, aspectRatio, title }: {
    videoId: string;
    aspectRatio?: number | null;
    title?: string | null;
}) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    const ratio = aspectRatio && aspectRatio >= 0.3 && aspectRatio <= 3 ? aspectRatio : 16 / 9;
    return <div className="flex w-full justify-center bg-black">
        <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={title || "YouTube video player"}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="block w-full border-0"
            style={{ aspectRatio: ratio, maxWidth: ratio < 1 ? `${ratio * 80}vh` : undefined }}
        />
    </div>;
}
