import type { ReactNode } from "react";

type FullPageLinkProps = {
    href: string;
    className?: string;
    children: ReactNode;
};

// Gallery details use intercepted routes for their overlay. Creation routes
// deliberately use a document navigation, so `/galleries/new` cannot be
// interpreted as the `[galleryId]` overlay route during a soft navigation.
export function FullPageLink({ href, className, children }: FullPageLinkProps) {
    return <a href={href} className={className}>{children}</a>;
}
