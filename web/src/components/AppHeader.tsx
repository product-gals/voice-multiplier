import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthStatus } from "@/components/AuthStatus";

type NavLink = { label: string; href?: string; active?: boolean };

export function AppHeader({
  active,
}: {
  active?: "multiply" | "write" | "voice" | "settings";
}) {
  const links: NavLink[] = [
    { label: "Write", href: "/write", active: active === "write" },
    { label: "Multiply", href: "/", active: active === "multiply" },
    { label: "Voice", href: "/voice", active: active === "voice" },
    { label: "Settings", href: "/settings", active: active === "settings" },
  ];

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          Voice Multiplier
        </Link>
        <nav className="text-sm flex items-center gap-6">
          {links.map((link) => {
            const cls = link.active
              ? "text-zinc-900 dark:text-zinc-50 font-medium"
              : link.href
              ? "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              : "text-zinc-300 dark:text-zinc-700 cursor-default";
            return link.href ? (
              <Link key={link.label} href={link.href} className={cls}>
                {link.label}
              </Link>
            ) : (
              <span key={link.label} className={cls} title="Not built yet">
                {link.label}
              </span>
            );
          })}
          <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <AuthStatus />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
