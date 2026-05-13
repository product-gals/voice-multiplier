import { AppHeader } from "@/components/AppHeader";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10 pb-24">
        <OnboardingFlow />
      </main>
    </div>
  );
}
