import { AppHeader } from "@/components/AppHeader";
import { VoiceProfileEditor } from "@/components/voice/VoiceProfileEditor";

export default function VoicePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <AppHeader active="voice" />
      <main className="mx-auto max-w-3xl px-6 py-10 pb-24">
        <VoiceProfileEditor />
      </main>
    </div>
  );
}
