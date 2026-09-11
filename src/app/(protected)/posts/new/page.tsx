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
    <main>
        <form onSubmit={handleSubmit}>
        <div>
          <p className="text-sm font-medium text-emerald-700">LinkLab</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            Create a Collaboration Post
          </h1>
        </div>

        <label
          htmlFor="title"
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
          />
        </label>

        <label
          htmlFor="description"
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
          />
        </label>

        <label
          htmlFor="isRemote"
        >
          Is this project remote?
          <input
            id="isRemote"
            type="checkbox"
            checked={isRemote}
            onChange={(e) => setIsRemote(e.target.checked)}
          />
        </label>

        {/* && means only when this condition is true, eg. isRemote */}
        {!isRemote &&
        (<label
          htmlFor="location"
        >
          Location
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            autoComplete="address-level2"
            maxLength={100}
            required
          />
        </label>
        )}

        {error && (
          <p
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating post..." : "Create post"}
        </button>

        </form>
    </main>
  );
}
