import { AppHeader } from "@/components/AppHeader";
import { Writer } from "@/components/Writer";

export default function WritePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <AppHeader active="write" />

      <main className="mx-auto max-w-3xl px-6 py-6">
        <Writer />
      </main>
    </div>
  );
}
