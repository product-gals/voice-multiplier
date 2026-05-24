"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function AuthStatus() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    // Render a fixed-width placeholder to avoid layout shift
    return <span className="w-16" />;
  }

  if (!email) {
    return (
      <Link
        href="/sign-in"
        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        Sign in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <span className="text-zinc-500 truncate max-w-[160px]" title={email}>
        {email}
      </span>
      <button
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          router.refresh();
        }}
        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        Sign out
      </button>
    </span>
  );
}
