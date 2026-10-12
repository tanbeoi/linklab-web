import { GalleryEditor } from "@/components/gallery-editor";

export default async function EditGalleryPage(
    props: PageProps<"/galleries/[galleryId]/edit">,
) {
    const { galleryId } = await props.params;

    return <GalleryEditor galleryId={galleryId} />;
}
