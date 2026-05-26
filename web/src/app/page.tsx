import { AppHeader } from "@/components/AppHeader";
import { Generator } from "@/components/Generator";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <AppHeader active="multiply" />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Generator />

        <footer className="text-xs text-zinc-400 pt-10 mt-10 border-t border-zinc-100 dark:border-zinc-900">
          Rate-limited to 6 generations per IP per 30 seconds.
        </footer>
      </main>
    </div>
  );
}
