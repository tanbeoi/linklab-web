//  this component is a client component because it uses useState and useRouter, which are client-side hooks.
 "use client";

import { SubmitEvent, useState } from "react";
import type { AuthResponse } from "@/types/auth";
import {apiRequest} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

export default function RegisterPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // create a function called submit 
  // tells typesscript that the event is a SubmitEvent of an HTMLFormElement
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    // prevent form submission from reloading the browser page to avoid losing the states of the component
    event.preventDefault();
    // clear any previous error messages and set the isSubmitting state to true
    // to disable the button and prevent repeated clicks 
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest<AuthResponse>(
        "/api/auth/register", 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            displayName,
          }),
        }
      );

      login(data);

      // read "next" after successful login 
      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get("next");

      // validate the destination 
      const destination = next?.startsWith("/") && !next.startsWith("//") 
                          ? next 
                          : "/dashboard";

      // redirect
      window.location.href = destination;

    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Registration failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // Connect the handleSubmit function to the form's onSubmit event
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <div>
          <p className="text-sm font-medium text-emerald-700">LinkLab</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            Create account
          </h1>
        </div>

        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-zinc-700"
        >
          Display name
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            required
            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700"
        >
          Email
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
            Password
          </label>
          <div className="relative mt-2">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-md border border-zinc-300 py-2 pl-3 pr-20 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-controls="password"
              className="absolute inset-y-0 right-0 rounded-r-md px-3 text-sm font-medium text-zinc-600 transition hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

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
          className="w-full rounded-md bg-zinc-900 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isSubmitting ? "Registering..." : "Create account"}
        </button>
      </form>
    </main>
  );
}
