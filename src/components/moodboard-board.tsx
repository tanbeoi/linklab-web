"use client";

import { DragEvent, MouseEvent, PointerEvent, useCallback, useEffect, useRef, useState } from "react";

import { flushSync } from "react-dom";

import type { Photo } from "@/types/galleries";

export const MOODBOARD_CANVAS_WIDTH = 2400;
export const MOODBOARD_CANVAS_HEIGHT = 1600;
export const MOODBOARD_CARD_WIDTH = 240;
const MOODBOARD_CARD_MIN_WIDTH = 120;
export const MOODBOARD_CAPTION_HEIGHT = 58;
const MOODBOARD_CAPTION_MIN_HEIGHT = 40;
const MOODBOARD_CAPTION_MAX_HEIGHT = 320;
const MOODBOARD_PRESENTATION_PADDING = 80;
const MIN_BOARD_ZOOM = 0.25;
const MAX_BOARD_ZOOM = 2;

type BoardPosition = { x: number; y: number };
export type MoodboardLayout = BoardPosition & {
    width: number;
    captionHeight: number;
};
type ResizeHandle = "north-west" | "north-east" | "south-west" | "south-east";
type BoardInteraction =
    | {
        kind: "move";
        photoId: string;
        offsetX: number;
        offsetY: number;
        layout: MoodboardLayout;
    }
    | {
        kind: "image-resize";
        photoId: string;
        handle: ResizeHandle;
        startClientX: number;
        startClientY: number;
        originalLayout: MoodboardLayout;
        aspectRatio: number;
        layout: MoodboardLayout;
    }
    | {
        kind: "caption-resize";
        photoId: string;
        startClientY: number;
        originalLayout: MoodboardLayout;
        layout: MoodboardLayout;
    };

type MoodboardBoardProps = {
    photos: Photo[];
    editable?: boolean;
    captionDrafts?: Record<string, string>;
    onLayoutChange?: (photoId: string, layout: MoodboardLayout) => void;
    onUnsortedDrop?: (photoId: string, layout: MoodboardLayout) => void;
    onCaptionChange?: (photo: Photo, caption: string) => void;
    onDeletePhoto?: (photo: Photo) => void;
};

function isPlaced(photo: Photo) {
    return photo.boardX !== null && photo.boardY !== null;
}

function clamp(value: number, minimum: number, maximum: number) {
    return Math.min(Math.max(value, minimum), maximum);
}

function getLayout(photo: Photo, position?: BoardPosition): MoodboardLayout {
    const width = photo.boardWidth ?? MOODBOARD_CARD_WIDTH;
    return {
        x: position?.x ?? photo.boardX ?? 0,
        y: position?.y ?? photo.boardY ?? 0,
        width,
        captionHeight: photo.captionHeight ?? MOODBOARD_CAPTION_HEIGHT,
    };
}

function clampPosition(position: BoardPosition, width: number): BoardPosition {
    return {
        x: Math.round(clamp(position.x, 0, MOODBOARD_CANVAS_WIDTH - width)),
        y: Math.round(clamp(position.y, 0, MOODBOARD_CANVAS_HEIGHT - 40)),
    };
}

function handleIncludesWest(handle: ResizeHandle) {
    return handle === "north-west" || handle === "south-west";
}

function handleIncludesNorth(handle: ResizeHandle) {
    return handle === "north-west" || handle === "north-east";
}

function resizeLayout(
    layout: MoodboardLayout,
    handle: ResizeHandle,
    width: number,
    aspectRatio: number,
): MoodboardLayout {
    const oldHeight = layout.width / aspectRatio;
    const height = width / aspectRatio;

    return {
        x: Math.round(layout.x + (handleIncludesWest(handle) ? layout.width - width : 0)),
        y: Math.round(layout.y + (handleIncludesNorth(handle) ? oldHeight - height : 0)),
        width: Math.round(width),
        captionHeight: layout.captionHeight,
    };
}

type MoodboardCompositionProps = {
    photos: Photo[];
    onOpenPhoto?: (photo: Photo) => void;
};

// Read-only public presentation of the editor's composition. It crops the
// 2400×1600 working canvas to the smallest area that contains every placed
// card, then scales that area responsively to the available width.
export function MoodboardComposition({ photos, onOpenPhoto }: MoodboardCompositionProps) {
    const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
    const placedPhotos = photos
        .filter(isPlaced)
        .sort((a, b) => (a.boardZIndex ?? 0) - (b.boardZIndex ?? 0));

    function saveAspectRatio(photo: Photo, image: HTMLImageElement) {
        if (image.naturalWidth === 0 || image.naturalHeight === 0) return;
        const aspectRatio = image.naturalWidth / image.naturalHeight;
        setAspectRatios((current) => current[photo.id] === aspectRatio
            ? current
            : { ...current, [photo.id]: aspectRatio });
    }

    if (placedPhotos.length === 0) {
        return (
            <p className="rounded-lg bg-white p-8 text-center text-slate-600">
                This moodboard has no placed images yet.
            </p>
        );
    }

    const bounds = placedPhotos.reduce((current, photo) => {
        const layout = getLayout(photo);
        const imageHeight = layout.width / (aspectRatios[photo.id] ?? 4 / 3);

        return {
            left: Math.min(current.left, layout.x),
            top: Math.min(current.top, layout.y),
            right: Math.max(current.right, layout.x + layout.width),
            bottom: Math.max(current.bottom, layout.y + imageHeight + layout.captionHeight),
        };
    }, {
        left: MOODBOARD_CANVAS_WIDTH,
        top: MOODBOARD_CANVAS_HEIGHT,
        right: 0,
        bottom: 0,
    });

    const crop = {
        left: Math.max(0, bounds.left - MOODBOARD_PRESENTATION_PADDING),
        top: Math.max(0, bounds.top - MOODBOARD_PRESENTATION_PADDING),
        right: Math.min(MOODBOARD_CANVAS_WIDTH, bounds.right + MOODBOARD_PRESENTATION_PADDING),
        bottom: Math.min(MOODBOARD_CANVAS_HEIGHT, bounds.bottom + MOODBOARD_PRESENTATION_PADDING),
    };
    const cropWidth = Math.max(1, crop.right - crop.left);
    const cropHeight = Math.max(1, crop.bottom - crop.top);

    return (
        <div
            aria-label="Moodboard composition"
            className="relative isolate w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            style={{
                aspectRatio: `${cropWidth} / ${cropHeight}`,
                backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
                backgroundSize: "18px 18px",
            }}
        >
            {placedPhotos.map((photo) => {
                const layout = getLayout(photo);
                const caption = photo.caption ?? "";

                return (
                    <figure
                        key={photo.id}
                        className="absolute overflow-hidden rounded-sm bg-white shadow-lg ring-1 ring-black/10"
                        style={{
                            left: `${((layout.x - crop.left) / cropWidth) * 100}%`,
                            top: `${((layout.y - crop.top) / cropHeight) * 100}%`,
                            width: `${(layout.width / cropWidth) * 100}%`,
                            zIndex: photo.boardZIndex ?? 0,
                        }}
                    >
                        {onOpenPhoto ? (
                            <button
                                type="button"
                                onClick={() => onOpenPhoto(photo)}
                                aria-label={`View ${caption || "moodboard image"} full screen`}
                                className="group block w-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-violet-600"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={photo.imageUrl}
                                    alt={caption || "Moodboard image"}
                                    loading="lazy"
                                    decoding="async"
                                    onLoad={(event) => saveAspectRatio(photo, event.currentTarget)}
                                    className="block h-auto w-full transition duration-200 group-hover:brightness-95"
                                />
                            </button>
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={photo.imageUrl}
                                alt={caption || "Moodboard image"}
                                loading="lazy"
                                decoding="async"
                                onLoad={(event) => saveAspectRatio(photo, event.currentTarget)}
                                className="block h-auto w-full"
                            />
                        )}
                        <figcaption
                            className="relative border-t border-slate-100 bg-white text-slate-600"
                            style={{ paddingTop: `${(layout.captionHeight / layout.width) * 100}%` }}
                        >
                            {caption && <span className="absolute inset-0 flex items-start overflow-hidden px-2 py-1.5 text-xs">{caption}</span>}
                        </figcaption>
                    </figure>
                );
            })}
        </div>
    );
}

export function MoodboardBoard({
    photos,
    editable = false,
    captionDrafts = {},
    onLayoutChange,
    onUnsortedDrop,
    onCaptionChange,
    onDeletePhoto,
}: MoodboardBoardProps) {
    const boardRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const spaceHeldRef = useRef(false);
    const pointerInsideRef = useRef(false);
    const suppressPanClickRef = useRef(false);
    const panRef = useRef<{ pointerId: number; clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null);
    const [spaceHeld, setSpaceHeld] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [zoom, setZoom] = useState(1);
    const zoomRef = useRef(1);

    const [interaction, setInteraction] = useState<BoardInteraction | null>(null);
    const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
    const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

    const placedPhotos = photos
        .filter(isPlaced)
        .sort((a, b) => (a.boardZIndex ?? 0) - (b.boardZIndex ?? 0));

    useEffect(() => {
        if (!editable || !selectedPhotoId || !onDeletePhoto) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key !== "Delete" && event.key !== "Backspace") return;

            const target = event.target;
            if (target instanceof HTMLElement && (
                target.isContentEditable ||
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.tagName === "SELECT"
            )) return;

            const photo = photos.find((candidate) => candidate.id === selectedPhotoId);
            if (!photo) return;

            event.preventDefault();
            onDeletePhoto?.(photo);
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [editable, onDeletePhoto, photos, selectedPhotoId]);

    useEffect(() => {
        if (!editable) return;
        const viewport = viewportRef.current;

        function resetPan() {
            spaceHeldRef.current = false;
            setSpaceHeld(false);
            const pan = panRef.current;
            panRef.current = null;
            setIsPanning(false);
            if (pan && viewportRef.current?.hasPointerCapture(pan.pointerId)) {
                viewportRef.current.releasePointerCapture(pan.pointerId);
            }
        }

        function keyDown(event: KeyboardEvent) {
            if (event.code !== "Space" || event.ctrlKey || event.metaKey || event.altKey) return;
            const target = event.target;
            if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [role='textbox']"))) return;
            if (!pointerInsideRef.current && !viewportRef.current?.contains(document.activeElement)) return;
            event.preventDefault();
            spaceHeldRef.current = true;
            setSpaceHeld(true);
        }

        function keyUp(event: KeyboardEvent) {
            if (event.code !== "Space") return;
            if (spaceHeldRef.current) event.preventDefault();
            resetPan();
        }

        function visibilityChange() {
            if (document.hidden) resetPan();
        }

        window.addEventListener("keydown", keyDown);
        window.addEventListener("keyup", keyUp);
        window.addEventListener("blur", resetPan);
        document.addEventListener("visibilitychange", visibilityChange);
        return () => {
            window.removeEventListener("keydown", keyDown);
            window.removeEventListener("keyup", keyUp);
            window.removeEventListener("blur", resetPan);
            document.removeEventListener("visibilitychange", visibilityChange);
            const pan = panRef.current;
            if (pan && viewport?.hasPointerCapture(pan.pointerId)) viewport.releasePointerCapture(pan.pointerId);
            panRef.current = null;
            spaceHeldRef.current = false;
        };
    }, [editable]);

    const changeZoom = useCallback((requestedZoom: number, clientX: number, clientY: number) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const previousZoom = zoomRef.current;
        const nextZoom = clamp(requestedZoom, MIN_BOARD_ZOOM, MAX_BOARD_ZOOM);
        if (nextZoom === previousZoom) return;
        const rect = viewport.getBoundingClientRect();
        const x = clientX - rect.left - viewport.clientLeft;
        const y = clientY - rect.top - viewport.clientTop;
        const canvasX = (viewport.scrollLeft + x) / previousZoom;
        const canvasY = (viewport.scrollTop + y) / previousZoom;
        zoomRef.current = nextZoom;
        // Commit the new scrollable dimensions before restoring the point under
        // the cursor. This also keeps rapid wheel events in the same coordinate system.
        flushSync(() => setZoom(nextZoom));
        viewport.scrollLeft = canvasX * nextZoom - x;
        viewport.scrollTop = canvasY * nextZoom - y;
    }, []);

    useEffect(() => {
        if (!editable) return;
        const viewport = viewportRef.current;
        if (!viewport) return;
        function wheel(event: WheelEvent) {
            if (!event.metaKey && !event.ctrlKey) return;
            event.preventDefault();
            if (panRef.current || interaction) return;
            const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport!.clientHeight : 1;
            const delta = clamp(event.deltaY * unit, -200, 200);
            changeZoom(zoomRef.current * Math.exp(-delta * 0.002), event.clientX, event.clientY);
        }
        // React wheel listeners are passive; a native listener lets this prevent
        // browser page zoom only while the pointer is over the workspace.
        viewport.addEventListener("wheel", wheel, { passive: false });
        return () => viewport.removeEventListener("wheel", wheel);
    }, [editable, interaction, changeZoom]);

    function zoomFromCenter(nextZoom: number) {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        changeZoom(nextZoom, rect.left + viewport.clientLeft + viewport.clientWidth / 2,
            rect.top + viewport.clientTop + viewport.clientHeight / 2);
    }

    function beginPan(event: PointerEvent<HTMLDivElement>) {
        suppressPanClickRef.current = false;
        if (!editable || !spaceHeldRef.current || event.button !== 0 || interaction) return;
        event.preventDefault();
        event.stopPropagation();
        const viewport = event.currentTarget;
        panRef.current = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            scrollLeft: viewport.scrollLeft,
            scrollTop: viewport.scrollTop,
        };
        suppressPanClickRef.current = true;
        viewport.setPointerCapture(event.pointerId);
        setIsPanning(true);
    }

    function movePan(event: PointerEvent<HTMLDivElement>) {
        const pan = panRef.current;
        if (!pan || pan.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.scrollLeft = pan.scrollLeft - (event.clientX - pan.clientX);
        event.currentTarget.scrollTop = pan.scrollTop - (event.clientY - pan.clientY);
    }

    function finishPan(event: PointerEvent<HTMLDivElement>) {
        const pan = panRef.current;
        if (!pan || pan.pointerId !== event.pointerId) return;
        event.stopPropagation();
        panRef.current = null;
        setIsPanning(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }

    function positionFromPointer(clientX: number, clientY: number, offsetX = 0, offsetY = 0, width = MOODBOARD_CARD_WIDTH) {
        const rect = boardRef.current?.getBoundingClientRect();
        if (!rect) return null;

        return clampPosition({
            x: (clientX - rect.left) / zoomRef.current - offsetX,
            y: (clientY - rect.top) / zoomRef.current - offsetY,
        }, width);
    }

    function beginPhotoDrag(event: PointerEvent<HTMLButtonElement>, photo: Photo) {
        if (!editable || event.button !== 0 || !isPlaced(photo)) return;

        event.preventDefault();
        setSelectedPhotoId(photo.id);
        const photoRect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);
        const layout = getLayout(photo);
        setInteraction({
            kind: "move",
            photoId: photo.id,
            offsetX: (event.clientX - photoRect.left) / zoomRef.current,
            offsetY: (event.clientY - photoRect.top) / zoomRef.current,
            layout,
        });
    }

    function beginImageResize(event: PointerEvent<HTMLButtonElement>, photo: Photo, handle: ResizeHandle) {
        if (!editable || event.button !== 0 || !isPlaced(photo)) return;

        event.preventDefault();
        event.stopPropagation();
        setSelectedPhotoId(photo.id);
        event.currentTarget.setPointerCapture(event.pointerId);
        const layout = getLayout(photo);
        setInteraction({
            kind: "image-resize",
            photoId: photo.id,
            handle,
            startClientX: event.clientX,
            startClientY: event.clientY,
            originalLayout: layout,
            aspectRatio: aspectRatios[photo.id] ?? 4 / 3,
            layout,
        });
    }

    function beginCaptionResize(event: PointerEvent<HTMLButtonElement>, photo: Photo) {
        if (!editable || event.button !== 0 || !isPlaced(photo)) return;

        event.preventDefault();
        event.stopPropagation();
        setSelectedPhotoId(photo.id);
        event.currentTarget.setPointerCapture(event.pointerId);
        const layout = getLayout(photo);
        setInteraction({
            kind: "caption-resize",
            photoId: photo.id,
            startClientY: event.clientY,
            originalLayout: layout,
            layout,
        });
    }

    function moveInteraction(event: PointerEvent<HTMLDivElement>) {
        if (!interaction) return;

        if (interaction.kind === "move") {
            const position = positionFromPointer(
                event.clientX,
                event.clientY,
                interaction.offsetX,
                interaction.offsetY,
                interaction.layout.width,
            );
            if (!position) return;
            setInteraction((current) => current?.kind === "move" ? {
                ...current,
                layout: { ...current.layout, ...position },
            } : current);
            return;
        }

        if (interaction.kind === "caption-resize") {
            const captionHeight = Math.round(clamp(
                interaction.originalLayout.captionHeight + (event.clientY - interaction.startClientY) / zoomRef.current,
                MOODBOARD_CAPTION_MIN_HEIGHT,
                MOODBOARD_CAPTION_MAX_HEIGHT,
            ));
            setInteraction((current) => current?.kind === "caption-resize" ? {
                ...current,
                layout: { ...current.layout, captionHeight },
            } : current);
            return;
        }

        const horizontalMultiplier = handleIncludesWest(interaction.handle) ? -1 : 1;
        const verticalMultiplier = handleIncludesNorth(interaction.handle) ? -1 : 1;
        const horizontalDelta = (event.clientX - interaction.startClientX) / zoomRef.current * horizontalMultiplier;
        const verticalDelta = (event.clientY - interaction.startClientY) / zoomRef.current * verticalMultiplier * interaction.aspectRatio;
        const widthDelta = Math.abs(horizontalDelta) >= Math.abs(verticalDelta)
            ? horizontalDelta
            : verticalDelta;

        const originalImageHeight = interaction.originalLayout.width / interaction.aspectRatio;
        const maxHorizontalWidth = handleIncludesWest(interaction.handle)
            ? interaction.originalLayout.x + interaction.originalLayout.width
            : MOODBOARD_CANVAS_WIDTH - interaction.originalLayout.x;
        const maxVerticalWidth = handleIncludesNorth(interaction.handle)
            ? (interaction.originalLayout.y + originalImageHeight) * interaction.aspectRatio
            : (MOODBOARD_CANVAS_HEIGHT - interaction.originalLayout.y) * interaction.aspectRatio;
        const width = clamp(
            interaction.originalLayout.width + widthDelta,
            MOODBOARD_CARD_MIN_WIDTH,
            Math.max(MOODBOARD_CARD_MIN_WIDTH, Math.min(maxHorizontalWidth, maxVerticalWidth)),
        );
        const layout = resizeLayout(interaction.originalLayout, interaction.handle, width, interaction.aspectRatio);

        setInteraction((current) => current?.kind === "image-resize" ? { ...current, layout } : current);
    }

    function finishInteraction() {
        if (!interaction) return;
        onLayoutChange?.(interaction.photoId, interaction.layout);
        setInteraction(null);
    }

    function dropUnsortedPhoto(event: DragEvent<HTMLDivElement>) {
        if (!editable) return;
        event.preventDefault();
        const photoId = event.dataTransfer.getData("application/x-linklab-photo");
        const photo = photos.find((candidate) => candidate.id === photoId);
        const position = positionFromPointer(event.clientX, event.clientY, 0, 0, photo?.boardWidth ?? MOODBOARD_CARD_WIDTH);
        if (photoId && photo && position) onUnsortedDrop?.(photoId, getLayout(photo, position));
    }

    function deleteSelectedPhoto(event: MouseEvent<HTMLButtonElement>, photo: Photo) {
        event.preventDefault();
        event.stopPropagation();
        onDeletePhoto?.(photo);
    }

    function saveAspectRatio(photo: Photo, image: HTMLImageElement) {
        if (image.naturalWidth === 0 || image.naturalHeight === 0) return;
        const aspectRatio = image.naturalWidth / image.naturalHeight;
        setAspectRatios((current) => current[photo.id] === aspectRatio
            ? current
            : { ...current, [photo.id]: aspectRatio });
    }

    return (
        <div className="min-w-0">
            {editable && <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <p>⌘ / Ctrl + scroll to zoom · Space + drag to pan</p>
                <div className="flex items-center rounded-md border border-slate-300 bg-white text-slate-700">
                    <button type="button" aria-label="Zoom out" disabled={zoom <= MIN_BOARD_ZOOM} onClick={() => zoomFromCenter(zoom / 1.2)} className="px-3 py-2 hover:bg-slate-50 disabled:opacity-40">−</button>
                    <button type="button" aria-label="Reset zoom to 100%" title="Reset zoom to 100%" onClick={() => zoomFromCenter(1)} className="min-w-14 px-2 py-2 tabular-nums hover:bg-slate-50">{Math.round(zoom * 100)}%</button>
                    <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_BOARD_ZOOM} onClick={() => zoomFromCenter(zoom * 1.2)} className="px-3 py-2 hover:bg-slate-50 disabled:opacity-40">+</button>
                </div>
            </div>}
        <div
            ref={viewportRef}
            tabIndex={editable ? 0 : undefined}
            aria-label={editable ? "Moodboard workspace. Hold Space and drag to pan. Command or Control plus scroll to zoom." : undefined}
            className={`min-w-0 overflow-auto rounded-lg border border-slate-300 bg-slate-100 shadow-sm ${editable ? "h-[75dvh] min-h-80 overscroll-contain focus-visible:outline-2 focus-visible:outline-blue-500" : ""} ${spaceHeld ? "select-none touch-none" : ""} ${isPanning ? "cursor-grabbing [&_*]:!cursor-grabbing" : spaceHeld ? "cursor-grab [&_*]:!cursor-grab" : ""}`}
            onPointerEnter={() => { pointerInsideRef.current = true; }}
            onPointerLeave={() => { pointerInsideRef.current = false; }}
            onPointerDownCapture={beginPan}
            onPointerMoveCapture={movePan}
            onPointerUpCapture={finishPan}
            onPointerCancelCapture={finishPan}
            onLostPointerCapture={finishPan}
            onClickCapture={(event) => {
                if (!suppressPanClickRef.current) return;
                event.preventDefault();
                event.stopPropagation();
                suppressPanClickRef.current = false;
            }}
        >
            <div className="relative overflow-hidden" style={{ width: MOODBOARD_CANVAS_WIDTH * zoom, height: MOODBOARD_CANVAS_HEIGHT * zoom }}>
            <div
                ref={boardRef}
                aria-label={editable ? "Moodboard canvas" : "Moodboard"}
                className="absolute left-0 top-0 h-[1600px] w-[2400px] origin-top-left bg-white"
                style={{
                    transform: `scale(${zoom})`,
                    backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                }}
                onPointerMove={moveInteraction}
                onPointerUp={finishInteraction}
                onPointerCancel={finishInteraction}
                onPointerDown={(event) => {
                    if (event.target === event.currentTarget) setSelectedPhotoId(null);
                }}
                onDragOver={(event) => { if (editable) event.preventDefault(); }}
                onDrop={dropUnsortedPhoto}
            >
                {placedPhotos.length === 0 && (
                    <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-sm">
                        {editable ? "Drag an image here from Unsorted." : "This moodboard has no placed images yet."}
                    </p>
                )}
                {placedPhotos.map((photo) => {
                    const layout = interaction?.photoId === photo.id
                        ? interaction.layout
                        : getLayout(photo);
                    const isActive = interaction?.photoId === photo.id;
                    const isSelected = selectedPhotoId === photo.id;
                    const caption = captionDrafts[photo.id] ?? photo.caption ?? "";

                    return (
                        <div
                            key={photo.id}
                            className={`group absolute rounded-sm bg-white shadow-lg ring-1 ring-black/10 ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                            style={{
                                left: layout.x,
                                top: layout.y,
                                width: layout.width,
                                zIndex: isActive ? 10000 : photo.boardZIndex ?? 0,
                            }}
                        >
                            <div className="rounded-sm">
                                <div className="relative">
                                    <button
                                        type="button"
                                        aria-label={editable ? `Move ${caption || "moodboard image"}` : caption || "Moodboard image"}
                                        onPointerDown={(event) => beginPhotoDrag(event, photo)}
                                        className={`block w-full overflow-hidden rounded-t-sm outline-none ${editable ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-default"}`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={photo.imageUrl}
                                            alt={caption || "Moodboard image"}
                                            draggable={false}
                                            onLoad={(event) => saveAspectRatio(photo, event.currentTarget)}
                                            className="block h-auto w-full"
                                        />
                                    </button>
                                    {editable && isSelected && (
                                        <button
                                            type="button"
                                            aria-label={`Delete ${caption || "moodboard image"}`}
                                            title="Delete photo"
                                            onClick={(event) => deleteSelectedPhoto(event, photo)}
                                            className="absolute right-2 top-2 z-30 flex size-6 items-center justify-center rounded-full bg-white/85 text-base leading-none text-slate-500 shadow-sm backdrop-blur-sm transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                                        >
                                            <span aria-hidden="true">×</span>
                                        </button>
                                    )}
                                    {editable && ([
                                        ["north-west", "-left-1.5 -top-1.5 cursor-nwse-resize"],
                                        ["north-east", "-right-1.5 -top-1.5 cursor-nesw-resize"],
                                        ["south-west", "-bottom-1.5 -left-1.5 cursor-nesw-resize"],
                                        ["south-east", "-bottom-1.5 -right-1.5 cursor-nwse-resize"],
                                    ] as const).map(([handle, classes]) => (
                                        <button
                                            key={handle}
                                            type="button"
                                            aria-label={`Resize image from the ${handle.replace("-", " ")} corner`}
                                            onPointerDown={(event) => beginImageResize(event, photo, handle)}
                                            className={`absolute z-20 size-3 rounded-full border-2 border-white bg-blue-600 shadow-sm transition ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"} ${classes}`}
                                        />
                                    ))}
                                </div>
                                {editable ? (
                                    <div className="relative border-t border-slate-100" onPointerDown={() => setSelectedPhotoId(photo.id)}>
                                        <button
                                            type="button"
                                            aria-label="Resize caption area"
                                            onPointerDown={(event) => beginCaptionResize(event, photo)}
                                            className={`absolute -top-1.5 left-0 z-10 flex h-3 w-full cursor-ns-resize items-center justify-center transition ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}`}
                                        >
                                            <span className="h-1 w-10 rounded-full bg-slate-400 shadow-sm" />
                                        </button>
                                        <label className="block p-2 pt-3" style={{ height: layout.captionHeight }}>
                                            <span className="sr-only">Caption</span>
                                            <textarea
                                                value={caption}
                                                onChange={(event) => onCaptionChange?.(photo, event.target.value)}
                                                maxLength={500}
                                                placeholder="Click to add a caption"
                                                className="block h-full w-full resize-none rounded border border-transparent bg-transparent px-1 py-0.5 text-left text-xs text-slate-600 outline-none placeholder:text-slate-400 hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                            />
                                        </label>
                                    </div>
                                ) : photo.caption && <span className="block px-2 py-1.5 text-left text-xs text-slate-600">{photo.caption}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
            </div>
        </div>
        </div>
    );
}
