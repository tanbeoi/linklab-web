// Parallel-route slots retain their last active view during a soft navigation
// unless the next route matches the slot. This catch-all intentionally clears
// the gallery modal whenever the user navigates away from a gallery URL.
export default function GallerySlotCatchAll() {
  return null;
}
