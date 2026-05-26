import { AppHeader } from "@/components/AppHeader";
import { CorpusManager } from "@/components/CorpusManager";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <AppHeader active="settings" />
      <main className="mx-auto max-w-3xl px-6 py-10 pb-24 space-y-10">
        <CorpusManager />
      </main>
    </div>
  );
}
