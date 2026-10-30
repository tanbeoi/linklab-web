// Keep the workspace route out of the gallery modal matcher. Without this
// exception, "mine" is interpreted as a gallery ID during client navigation.
export default function MyGalleriesSlotDefault() {
  return null;
}
