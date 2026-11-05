type BackendActivity = "idle" | "pending" | "slow" | "delayed";

let activity: BackendActivity = "idle";
const requests = new Set<symbol>();
const listeners = new Set<() => void>();
let slowTimer: ReturnType<typeof setTimeout> | undefined;
let delayedTimer: ReturnType<typeof setTimeout> | undefined;

function update(next: BackendActivity) {
    activity = next;
    listeners.forEach((listener) => listener());
}

export function subscribeToBackendActivity(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function getBackendActivity() { return activity; }
export function getServerBackendActivity(): BackendActivity { return "idle"; }

// Track overlapping requests together so one fast response cannot hide a notice
// while another request is still waiting for the server.
export function trackBackendRequest() {
    if (typeof window === "undefined") return () => {};
    const request = Symbol();
    requests.add(request);
    if (requests.size === 1) {
        update("pending");
        slowTimer = setTimeout(() => update("slow"), 3000);
        delayedTimer = setTimeout(() => update("delayed"), 60000);
    }
    return () => {
        if (!requests.delete(request) || requests.size > 0) return;
        clearTimeout(slowTimer);
        clearTimeout(delayedTimer);
        update("idle");
    };
}

let warmup: Promise<void> | undefined;

// One bounded startup attempt per browser page load, shared across React mounts.
// This is not a keep-alive: it stops once ready and does not poll during idle time.
export function warmBackend() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (typeof window === "undefined" || !apiUrl) return Promise.resolve();
    return warmup ??= (async () => {
        const finish = trackBackendRequest();
        const deadline = Date.now() + 90000;
        try {
            while (Date.now() < deadline) {
                try {
                    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/health`, {
                        cache: "no-store",
                        signal: AbortSignal.timeout(Math.min(15000, deadline - Date.now())),
                    });
                    if (response.ok && response.headers.get("content-type")?.includes("application/json")) return;
                    // Don't loop on missing endpoints or configuration errors.
                    if (![502, 503, 504].includes(response.status) && !response.ok) return;
                } catch {
                    // Cold starts can temporarily fail before the app is reachable.
                }
                const remaining = deadline - Date.now();
                if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(3000, remaining)));
            }
        } finally {
            finish();
        }
    })();
}
