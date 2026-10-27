import Link from "next/link";
import type { ReactNode } from "react";

type UserProfileLinkProps = {
    userId: string | null | undefined;
    children: ReactNode;
    className?: string;
};

// Keep attribution links consistent and prevent a surrounding clickable card
// from also navigating when someone chooses the person's profile.
export function UserProfileLink({ userId, children, className = "" }: UserProfileLinkProps) {
    if (!userId) return <>{children}</>;

    return (
        <Link
            href={`/profiles/${userId}`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            className={`rounded-sm font-medium underline decoration-current/35 underline-offset-2 transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${className}`}
            title="View profile"
        >
            {children}
        </Link>
    );
}
