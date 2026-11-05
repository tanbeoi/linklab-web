"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
    getBackendActivity,
    getServerBackendActivity,
    subscribeToBackendActivity,
    warmBackend,
} from "@/lib/backend-activity";

export function BackendWakeUp() {
    useEffect(() => { void warmBackend(); }, []);
    return <BackendWakeUpNotice />;
}

// Dialogs render their own notice because native dialogs sit above the app shell.
export function BackendWakeUpNotice({ inline = false }: { inline?: boolean }) {
    const activity = useSyncExternalStore(subscribeToBackendActivity, getBackendActivity, getServerBackendActivity);

    if (activity !== "slow" && activity !== "delayed") return null;

    return <aside role="status" aria-live="polite" className={`shrink-0 border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 ${inline ? "mb-4 rounded-lg border" : "border-b sm:px-6"}`}>
        <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold">{activity === "delayed" ? "The server is taking longer than usual…" : "Waking up the server…"}</p>
            <p className="mt-1 text-sm leading-6">{activity === "delayed"
                ? "We’re still waiting for a response. Please keep this page open. If an error appears, try again in a moment."
                : "LinkLab uses free hosting, so the first request after inactivity may take about a minute. Sorry for the wait, and thanks for your patience."}</p>
        </div>
    </aside>;
}
