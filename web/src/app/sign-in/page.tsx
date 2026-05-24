"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const authError = errorParam === "auth";
  const notAllowedError = errorParam === "not-allowed";
  // Preserve the destination the user was originally trying to reach so we
  // can bounce back after the magic-link round-trip.
  const nextPath = searchParams.get("next") ?? "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", nextPath);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <Link href="/" className="font-semibold tracking-tight text-lg">
          Voice Multiplier
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Enter your email to receive a magic link.
        </p>
      </div>

      {status === "sent" ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center space-y-2">
          <p className="font-medium">Check your email</p>
          <p className="text-sm text-zinc-500">
            We sent a sign-in link to{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {email}
            </span>
            . Click the link to continue.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "sending" ? "Sending..." : "Send magic link"}
          </button>
        </form>
      )}

      {authError && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          Sign-in failed. Please try again.
        </p>
      )}

      {notAllowedError && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          That email isn&apos;t on the access list yet. Reach out to the app
          owner if you think this is a mistake.
        </p>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50 flex items-center justify-center px-6">
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
