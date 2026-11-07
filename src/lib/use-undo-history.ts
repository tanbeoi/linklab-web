"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useUndoHistory<T extends { label: string }>({ apply, onError, blocked = false }: {
    apply: (action: T, direction: "undo" | "redo") => Promise<void>;
    onError: (cause: unknown) => void;
    blocked?: boolean;
}) {
    const undoStack = useRef<T[]>([]);
    const redoStack = useRef<T[]>([]);
    const busy = useRef(false);
    const [state, setState] = useState({ isBusy: false, undoLabel: "", redoLabel: "" });
    const sync = useCallback(() => setState({
        isBusy: busy.current,
        undoLabel: undoStack.current.at(-1)?.label ?? "",
        redoLabel: redoStack.current.at(-1)?.label ?? "",
    }), []);

    const perform = useCallback(async (direction: "undo" | "redo", newAction?: T) => {
        if (busy.current || blocked) return false;
        const source = direction === "undo" ? undoStack.current : redoStack.current;
        const action = newAction ?? source.at(-1);
        if (!action) return false;
        busy.current = true;
        sync();
        try {
            await apply(action, direction);
            if (newAction) {
                undoStack.current.push(action);
                if (undoStack.current.length > 100) undoStack.current.shift();
                redoStack.current = [];
            } else {
                source.pop();
                (direction === "undo" ? redoStack.current : undoStack.current).push(action);
            }
            return true;
        } catch (cause) {
            onError(cause);
            return false;
        } finally {
            busy.current = false;
            sync();
        }
    }, [apply, blocked, onError, sync]);
    const undo = useCallback(() => perform("undo"), [perform]);
    const redo = useCallback(() => perform("redo"), [perform]);
    const commit = useCallback((action: T) => perform("redo", action), [perform]);
    // Uploads have already been persisted when their batch finishes. Record
    // them without replaying the upload or waiting for React's busy state reset.
    const recordApplied = useCallback((action: T) => {
        if (busy.current) return false;
        undoStack.current.push(action);
        if (undoStack.current.length > 100) undoStack.current.shift();
        redoStack.current = [];
        sync();
        return true;
    }, [sync]);
    const clear = useCallback(() => {
        if (busy.current) return;
        undoStack.current = [];
        redoStack.current = [];
        sync();
    }, [sync]);
    const clearRedo = useCallback(() => { redoStack.current = []; sync(); }, [sync]);

    useEffect(() => {
        function keyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.altKey || (!event.metaKey && !event.ctrlKey)) return;
            const target = event.target;
            // A file picker can retain focus after upload, but it has no text
            // edits to undo. Let gallery shortcuts work immediately afterward.
            if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input:not([type='file']), textarea, select, [role='textbox']"))) return;
            if (document.querySelector("dialog[open], [role='dialog'][aria-modal='true']")) return;
            const key = event.key.toLowerCase();
            if (key === "z") {
                event.preventDefault();
                void (event.shiftKey ? redo() : undo());
            } else if (key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey) {
                event.preventDefault();
                void redo();
            }
        }
        window.addEventListener("keydown", keyDown);
        return () => window.removeEventListener("keydown", keyDown);
    }, [undo, redo]);

    return { ...state, commit, recordApplied, undo, redo, clear, clearRedo };
}
