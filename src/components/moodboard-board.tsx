"use client";

import { PointerEvent, DragEvent, useRef, useState } from "react";

import type { Photo } from "@/types/galleries";

export const MOODBOARD_CANVAS_WIDTH = 2400;
export const MOODBOARD_CANVAS_HEIGHT = 1600;
export const MOODBOARD_CARD_WIDTH = 240;

type BoardPosition = { x: number; y: number };

type MoodboardBoardProps = {
    photos: Photo[];
    editable?: boolean;
    captionDrafts?: Record<string, string>;
    onPositionChange?: (photoId: string, position: BoardPosition) => void;
    onUnsortedDrop?: (photoId: string, position: BoardPosition) => void;
    onCaptionChange?: (photo: Photo, caption: string) => void;
};

function isPlaced(photo: Photo) {
    return photo.boardX !== null && photo.boardY !== null;
}

function clampPosition(position: BoardPosition): BoardPosition {
    return {
        x: Math.round(Math.min(Math.max(position.x, 0), MOODBOARD_CANVAS_WIDTH - MOODBOARD_CARD_WIDTH)),
        y: Math.round(Math.min(Math.max(position.y, 0), MOODBOARD_CANVAS_HEIGHT - 40)),
    };
}

export function MoodboardBoard({
    photos,
    editable = false,
    captionDrafts = {},
    onPositionChange,
    onUnsortedDrop,
    onCaptionChange,
}: MoodboardBoardProps) {
    const boardRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<{
        photoId: string;
        offsetX: number;
        offsetY: number;
        position: BoardPosition;
    } | null>(null);

    const placedPhotos = photos
        .filter(isPlaced)
        .sort((a, b) => (a.boardZIndex ?? 0) - (b.boardZIndex ?? 0));

    function positionFromPointer(clientX: number, clientY: number, offsetX = 0, offsetY = 0) {
        const rect = boardRef.current?.getBoundingClientRect();
        if (!rect) return null;

        return clampPosition({
            x: clientX - rect.left - offsetX,
            y: clientY - rect.top - offsetY,
        });
    }

    function beginPhotoDrag(event: PointerEvent<HTMLButtonElement>, photo: Photo) {
        if (!editable || event.button !== 0 || photo.boardX === null || photo.boardY === null) return;

        event.preventDefault();
        const photoRect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging({
            photoId: photo.id,
            offsetX: event.clientX - photoRect.left,
            offsetY: event.clientY - photoRect.top,
            position: { x: photo.boardX, y: photo.boardY },
        });
    }

    function movePhoto(event: PointerEvent<HTMLDivElement>) {
        if (!dragging) return;
        const position = positionFromPointer(event.clientX, event.clientY, dragging.offsetX, dragging.offsetY);
        if (position) setDragging((current) => current ? { ...current, position } : current);
    }

    function finishPhotoDrag() {
        if (!dragging) return;
        onPositionChange?.(dragging.photoId, dragging.position);
        setDragging(null);
    }

    function dropUnsortedPhoto(event: DragEvent<HTMLDivElement>) {
        if (!editable) return;
        event.preventDefault();
        const photoId = event.dataTransfer.getData("application/x-linklab-photo");
        const position = positionFromPointer(event.clientX, event.clientY);
        if (photoId && position) onUnsortedDrop?.(photoId, position);
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
                onPointerMove={movePhoto}
                onPointerUp={finishPhotoDrag}
                onPointerCancel={finishPhotoDrag}
                onDragOver={(event) => { if (editable) event.preventDefault(); }}
                onDrop={dropUnsortedPhoto}
            >
                {placedPhotos.length === 0 && (
                    <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-sm">
                        {editable ? "Drag an image here from Unsorted." : "This moodboard has no placed images yet."}
                    </p>
                )}
                {placedPhotos.map((photo) => {
                    const previewPosition = dragging?.photoId === photo.id ? dragging.position : null;
                    const position = previewPosition ?? { x: photo.boardX!, y: photo.boardY! };

                    return (
                        <div
                            key={photo.id}
                            className="absolute overflow-hidden rounded-sm bg-white shadow-lg ring-1 ring-black/10"
                            style={{
                                left: position.x,
                                top: position.y,
                                width: MOODBOARD_CARD_WIDTH,
                                zIndex: dragging?.photoId === photo.id ? 10000 : photo.boardZIndex ?? 0,
                            }}
                        >
                            <button
                                type="button"
                                aria-label={editable ? `Move ${photo.caption || "moodboard image"}` : photo.caption || "Moodboard image"}
                                onPointerDown={(event) => beginPhotoDrag(event, photo)}
                                className={`block w-full ${editable ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-default"}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={photo.imageUrl} alt={(captionDrafts[photo.id] ?? photo.caption) || "Moodboard image"} draggable={false} className="block h-auto w-full" />
                            </button>
                            {editable ? (
                                <label className="block border-t border-slate-100 p-2">
                                    <span className="sr-only">Caption</span>
                                    <textarea
                                        value={captionDrafts[photo.id] ?? photo.caption ?? ""}
                                        onChange={(event) => onCaptionChange?.(photo, event.target.value)}
                                        maxLength={1000}
                                        rows={2}
                                        placeholder="Click to add a caption"
                                        className="block w-full resize-y rounded border border-transparent bg-transparent px-1 py-0.5 text-left text-xs text-slate-600 outline-none placeholder:text-slate-400 hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                    />
                                </label>
                            ) : photo.caption && <span className="block px-2 py-1.5 text-left text-xs text-slate-600">{photo.caption}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
