//  this component is a client component because it uses useState and useRouter, which are client-side hooks.
 "use client";

import { SubmitEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { CollabPost, CreateCollabPostRequest } from "@/types/posts";
import {apiRequest} from "@/lib/api";

export default function CreatePostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const request: CreateCollabPostRequest = {
    title,
    description,
    location: isRemote ? "" : location,
    isRemote,
  };

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await apiRequest<CollabPost>(
        "/api/posts", 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        }
      );

      router.push("/posts");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create post.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // Connect the handleSubmit function to the form's onSubmit event
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-blue-600">LinkLab</p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Create a Collaboration Post
          </h1>

          <p className="mt-2 leading-7 text-slate-600">
              Describe your project and find someone to collaborate with.
          </p>
        </header>

        <form onSubmit={handleSubmit}
              className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

        <label
          htmlFor="title"
          className="block text-sm font-medium text-slate-700"
        >
          Title
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
            minLength={5}
            maxLength={100}
            required
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-700"
        >
          Post description
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoComplete="off"
            minLength={5}
            maxLength={2000}
            rows={7}
            required
            className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <label
          className="flex items-center gap-3 text-sm font-medium text-slate-700"
          htmlFor="isRemote"
        >
          Is this project remote?
          <input
            id="isRemote"
            type="checkbox"
            checked={isRemote}
            onChange={(e) => setIsRemote(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
        </label>

        {/* && means only when this condition is true, eg. isRemote */}
        {!isRemote &&
        (<label
          htmlFor="location"
          className="block text-sm font-medium text-slate-700"
        >
          Location
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            autoComplete="address-level2"
            maxLength={100}
            placeholder="For example: Melbourne"
            required
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "Creating post..." : "Create post"}
        </button>

        </form>
      </div>
    </main>
  );
}
