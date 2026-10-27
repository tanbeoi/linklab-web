type UploadProgressRingProps = {
    progress: number;
    tone?: "blue" | "violet";
};

export function UploadProgressRing({ progress, tone = "blue" }: UploadProgressRingProps) {
    const radius = 27;
    const circumference = 2 * Math.PI * radius;
    const clampedProgress = Math.min(100, Math.max(0, progress));

    return <span aria-label={`Upload ${clampedProgress}% complete`} className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/45">
        <span className="relative grid size-[4.5rem] place-items-center rounded-full bg-slate-950/75 shadow-lg">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="absolute size-full -rotate-90">
                <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
                <circle cx="32" cy="32" r={radius} fill="none" stroke={tone === "violet" ? "#c4b5fd" : "#93c5fd"} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clampedProgress / 100)} className="transition-[stroke-dashoffset] duration-150" />
            </svg>
            <span className="relative text-sm font-bold tabular-nums text-white">{clampedProgress}%</span>
        </span>
    </span>;
}

type UploadProgressPreviewProps = UploadProgressRingProps & {
    imageUrl: string;
    alt: string;
    className?: string;
    imageClassName?: string;
};

export function UploadProgressPreview({ imageUrl, alt, progress, tone, className = "", imageClassName = "" }: UploadProgressPreviewProps) {
    return <div className={`relative overflow-hidden ${className}`}>
        {/* Local object URLs give instant feedback before the S3 upload completes. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={alt} className={`size-full object-cover brightness-75 ${imageClassName}`} />
        <UploadProgressRing progress={progress} tone={tone} />
    </div>;
}
