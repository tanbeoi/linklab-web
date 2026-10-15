"use client";

import { DragEvent, PointerEvent, useRef, useState } from "react";

import type { Photo } from "@/types/galleries";

export const MOODBOARD_CANVAS_WIDTH = 2400;
export const MOODBOARD_CANVAS_HEIGHT = 1600;
export const MOODBOARD_CARD_WIDTH = 240;
const MOODBOARD_CARD_MIN_WIDTH = 120;
export const MOODBOARD_CAPTION_HEIGHT = 58;
const MOODBOARD_CAPTION_MIN_HEIGHT = 40;
const MOODBOARD_CAPTION_MAX_HEIGHT = 320;

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

export function MoodboardBoard({
    photos,
    editable = false,
    captionDrafts = {},
    onLayoutChange,
    onUnsortedDrop,
    onCaptionChange,
}: MoodboardBoardProps) {
    const boardRef = useRef<HTMLDivElement>(null);
    const [interaction, setInteraction] = useState<BoardInteraction | null>(null);
    const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

    const placedPhotos = photos
        .filter(isPlaced)
        .sort((a, b) => (a.boardZIndex ?? 0) - (b.boardZIndex ?? 0));

    function positionFromPointer(clientX: number, clientY: number, offsetX = 0, offsetY = 0, width = MOODBOARD_CARD_WIDTH) {
        const rect = boardRef.current?.getBoundingClientRect();
        if (!rect) return null;

        return clampPosition({
            x: clientX - rect.left - offsetX,
            y: clientY - rect.top - offsetY,
        }, width);
    }

    function beginPhotoDrag(event: PointerEvent<HTMLButtonElement>, photo: Photo) {
        if (!editable || event.button !== 0 || !isPlaced(photo)) return;

        event.preventDefault();
        const photoRect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);
        const layout = getLayout(photo);
        setInteraction({
            kind: "move",
            photoId: photo.id,
            offsetX: event.clientX - photoRect.left,
            offsetY: event.clientY - photoRect.top,
            layout,
        });
    }

    function beginImageResize(event: PointerEvent<HTMLButtonElement>, photo: Photo, handle: ResizeHandle) {
        if (!editable || event.button !== 0 || !isPlaced(photo)) return;

        event.preventDefault();
        event.stopPropagation();
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
                interaction.originalLayout.captionHeight + event.clientY - interaction.startClientY,
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
        const horizontalDelta = (event.clientX - interaction.startClientX) * horizontalMultiplier;
        const verticalDelta = (event.clientY - interaction.startClientY) * verticalMultiplier * interaction.aspectRatio;
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

    function saveAspectRatio(photo: Photo, image: HTMLImageElement) {
        if (image.naturalWidth === 0 || image.naturalHeight === 0) return;
        const aspectRatio = image.naturalWidth / image.naturalHeight;
        setAspectRatios((current) => current[photo.id] === aspectRatio
            ? current
            : { ...current, [photo.id]: aspectRatio });
    }

    return (
        <div className="overflow-auto rounded-lg border border-slate-300 bg-slate-100 shadow-sm">
            <div
                ref={boardRef}
                aria-label={editable ? "Moodboard canvas" : "Moodboard"}
                className="relative h-[1600px] w-[2400px] bg-white"
                style={{
                    backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                }}
                onPointerMove={moveInteraction}
                onPointerUp={finishInteraction}
                onPointerCancel={finishInteraction}
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
                    const caption = captionDrafts[photo.id] ?? photo.caption ?? "";

                    return (
                        <div
                            key={photo.id}
                            className="group absolute rounded-sm bg-white shadow-lg ring-1 ring-black/10"
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
                                            className={`absolute z-20 size-3 rounded-full border-2 border-white bg-blue-600 shadow-sm opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${classes}`}
                                        />
                                    ))}
                                </div>
                                {editable ? (
                                    <div className="relative border-t border-slate-100">
                                        <button
                                            type="button"
                                            aria-label="Resize caption area"
                                            onPointerDown={(event) => beginCaptionResize(event, photo)}
                                            className="absolute -top-1.5 left-0 z-10 flex h-3 w-full cursor-ns-resize items-center justify-center opacity-0 transition group-hover:opacity-100 focus:opacity-100"
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
    );
}
