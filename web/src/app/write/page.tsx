import { AppHeader } from "@/components/AppHeader";
import { WriteWorkspace } from "@/components/WriteWorkspace";

export default function WritePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <AppHeader active="write" />

      <main className="mx-auto max-w-5xl px-6 py-6">
        <WriteWorkspace />
      </main>
    </div>
  );
}
