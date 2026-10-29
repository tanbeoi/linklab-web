"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ProfileAvatar } from "@/components/profile-avatar";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import type { MyApplication, PagedResponse, ReceivedApplication } from "@/types/posts";

type ChatView = "all" | "individual" | "collaboration";

type DirectChat = {
    userId: string;
    displayName: string;
    createdAtUtc: string;
};

type CollaborationChat = {
    postId: string;
    postTitle: string;
    collaborators: string[];
};

function directChatsKey(userId: string) {
    return `linklab-demo-direct-chats:${userId}`;
}

function loadDirectChats(userId: string): DirectChat[] {
    try {
        const rawValue = window.localStorage.getItem(directChatsKey(userId));
        const parsed = rawValue ? JSON.parse(rawValue) : [];
        return Array.isArray(parsed) ? parsed.filter((chat): chat is DirectChat =>
            typeof chat?.userId === "string" && typeof chat?.displayName === "string" && typeof chat?.createdAtUtc === "string") : [];
    } catch {
        return [];
    }
}

function mergeCollaborationChats(mine: MyApplication[], received: ReceivedApplication[]): CollaborationChat[] {
    const chats = new Map<string, CollaborationChat>();

    for (const application of mine) {
        if (application.status !== "Accepted") continue;
        chats.set(application.postId, {
            postId: application.postId,
            postTitle: application.postTitle,
            collaborators: ["You and the post owner"],
        });
    }

    for (const application of received) {
        if (application.status !== "Accepted") continue;
        const existing = chats.get(application.postId);
        if (existing) {
            if (!existing.collaborators.includes(application.applicantDisplayName)) {
                existing.collaborators.push(application.applicantDisplayName);
            }
        } else {
            chats.set(application.postId, {
                postId: application.postId,
                postTitle: application.postTitle,
                collaborators: [application.applicantDisplayName],
            });
        }
    }

    return [...chats.values()].sort((first, second) => first.postTitle.localeCompare(second.postTitle));
}

export default function ChatsPage() {
    return <Suspense fallback={<main className="flex min-h-full flex-1 items-center justify-center bg-slate-50 px-4 py-10 text-slate-600">Loading chat demo…</main>}><ChatsContent /></Suspense>;
}

function ChatsContent() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const searchParams = useSearchParams();
    const [view, setView] = useState<ChatView>("all");
    const [directChats, setDirectChats] = useState<DirectChat[]>([]);
    const [collaborationChats, setCollaborationChats] = useState<CollaborationChat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const requestedUserId = searchParams.get("with");
    const requestedDisplayName = searchParams.get("name")?.trim() || "LinkLab creator";

    useEffect(() => {
        if (isAuthLoading || !user) return;
        const loadTimer = window.setTimeout(() => setDirectChats(loadDirectChats(user.id)), 0);
        return () => window.clearTimeout(loadTimer);
    }, [isAuthLoading, user]);

    useEffect(() => {
        if (isAuthLoading || !user) return;
        let cancelled = false;

        async function loadCollaborationChats() {
            setIsLoading(true);
            setError("");
            try {
                const [mine, received] = await Promise.all([
                    apiRequest<PagedResponse<MyApplication>>("/api/applications/mine?page=1&pageSize=50"),
                    apiRequest<PagedResponse<ReceivedApplication>>("/api/applications/received?page=1&pageSize=50"),
                ]);
                if (!cancelled) setCollaborationChats(mergeCollaborationChats(mine.items, received.items));
            } catch (cause) {
                if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load collaboration chat rooms.");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void loadCollaborationChats();
        return () => { cancelled = true; };
    }, [isAuthLoading, user]);

    useEffect(() => {
        if (!user || !requestedUserId || requestedUserId === user.id) return;
        const startTimer = window.setTimeout(() => {
            setDirectChats((currentChats) => {
                const existing = currentChats.find((chat) => chat.userId === requestedUserId);
                const nextChats = existing ? currentChats : [{ userId: requestedUserId, displayName: requestedDisplayName, createdAtUtc: new Date().toISOString() }, ...currentChats];
                window.localStorage.setItem(directChatsKey(user.id), JSON.stringify(nextChats));
                return nextChats;
            });
            setView("individual");
            setSelectedChatId(`direct:${requestedUserId}`);
        }, 0);
        return () => window.clearTimeout(startTimer);
    }, [requestedDisplayName, requestedUserId, user]);

    const visibleChats = useMemo(() => {
        const direct = directChats.map((chat) => ({ kind: "direct" as const, id: `direct:${chat.userId}`, chat }));
        const collaboration = collaborationChats.map((chat) => ({ kind: "collaboration" as const, id: `collaboration:${chat.postId}`, chat }));
        if (view === "individual") return direct;
        if (view === "collaboration") return collaboration;
        return [...direct, ...collaboration];
    }, [collaborationChats, directChats, view]);

    const activeChatId = visibleChats.some((chat) => chat.id === selectedChatId)
        ? selectedChatId
        : (visibleChats[0]?.id ?? "");
    const selectedChat = visibleChats.find((chat) => chat.id === activeChatId) ?? null;

    if (isAuthLoading || !user) return <main className="flex min-h-full flex-1 items-center justify-center bg-slate-50 px-4 py-10 text-slate-600">Loading chat demo…</main>;

    return <main className="bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-6xl">
            <header className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3"><p className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Demo extension</p><p className="text-sm text-slate-500">Not live messaging</p></div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Chats</h1>
                <p className="mt-3 leading-7 text-slate-600">Explore how private and collaboration conversations could work in LinkLab. Conversations are not sent, shared, or stored in the app yet.</p>
            </header>

            <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Chat views">
                {(["all", "individual", "collaboration"] as const).map((option) => {
                    const label = option === "all" ? "All chats" : option === "individual" ? "Individual chats" : "Collab chats";
                    const isActive = view === option;
                    return <button key={option} type="button" role="tab" aria-selected={isActive} onClick={() => setView(option)} className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${isActive ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}>{label}</button>;
                })}
            </div>

            {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <section className="mt-5 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[21rem_1fr]" aria-label="Chat demo">
                <aside className="border-b border-slate-200 bg-slate-50/70 p-4 lg:border-b-0 lg:border-r">
                    <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">{view === "all" ? "Conversations" : view === "individual" ? "People" : "Projects"}</h2><span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">{visibleChats.length}</span></div>
                    {isLoading ? <p className="py-8 text-sm text-slate-500">Loading collaboration rooms…</p> : visibleChats.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500">{view === "individual" ? <>Start a demo conversation from another creator&apos;s profile.</> : view === "collaboration" ? <>A group room will appear when an application is accepted for one of your collaboration posts, or when you are accepted onto a post.</> : <>No demo conversations yet. Visit a creator profile to start an individual one.</>}</div> : <div className="mt-4 space-y-2">{visibleChats.map((item) => {
                        const active = activeChatId === item.id;
                        const title = item.kind === "direct" ? item.chat.displayName : item.chat.postTitle;
                        const detail = item.kind === "direct" ? "Individual demo conversation" : `${item.chat.collaborators.length} accepted collaborator${item.chat.collaborators.length === 1 ? "" : "s"}`;
                        return <button key={item.id} type="button" onClick={() => setSelectedChatId(item.id)} className={`w-full rounded-xl p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${active ? "bg-violet-100 text-violet-950" : "bg-white hover:bg-slate-100"}`}><div className="flex items-center gap-3">{item.kind === "direct" ? <ProfileAvatar className="size-9" iconClassName="size-5" /> : <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">#{item.chat.collaborators.length + 1}</span>}<span className="min-w-0"><span className="block truncate font-semibold">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{detail}</span></span></div></button>;
                    })}</div>}
                </aside>

                <div className="flex min-h-80 flex-col p-6 sm:p-8">
                    {selectedChat ? <>{selectedChat.kind === "direct" ? <><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Individual chat · demo</p><h2 className="mt-2 text-2xl font-bold tracking-tight">{selectedChat.chat.displayName}</h2><p className="mt-3 max-w-xl leading-7 text-slate-600">This conversation has been added to your browser&apos;s demo chat list. Messaging, notifications, and message history are intentionally not available yet.</p></> : <><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Collaboration chat · demo</p><h2 className="mt-2 text-2xl font-bold tracking-tight">{selectedChat.chat.postTitle}</h2><p className="mt-3 max-w-xl leading-7 text-slate-600">This project room appears once a collaboration is accepted. A future version could let the accepted team coordinate here.</p><div className="mt-5 flex flex-wrap gap-2">{selectedChat.chat.collaborators.map((collaborator) => <span key={collaborator} className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800">{collaborator}</span>)}</div><Link href={`/posts/${selectedChat.chat.postId}`} className="mt-6 w-fit rounded-md border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">View collaboration post</Link></>}
                        <div className="mt-auto rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">Messaging is intentionally disabled in this portfolio demo.</div>
                    </> : <div className="m-auto max-w-md text-center"><p className="text-lg font-semibold text-slate-800">A future home for project conversations.</p><p className="mt-2 leading-7 text-slate-600">Direct conversations can be started from a creator&apos;s profile. Collaboration rooms appear once someone is accepted.</p></div>}
                </div>
            </section>
        </div>
    </main>;
}
