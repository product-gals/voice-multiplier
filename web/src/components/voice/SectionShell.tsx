export function SectionShell({
  title,
  subtitle,
  children,
  meta,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <header className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-900 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {meta && <div className="text-xs text-zinc-400">{meta}</div>}
      </header>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{hint}</p>
      )}
    </div>
  );
}

export function RadioRow<T extends string>({
  name,
  options,
  value,
  onChange,
  labelMap,
}: {
  name: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const id = `${name}-${opt}`;
        const active = value === opt;
        const label = labelMap?.[opt] ?? opt.replace(/_/g, " ");
        return (
          <label
            key={id}
            className={[
              "cursor-pointer px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              active
                ? "bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                : "bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600",
            ].join(" ")}
          >
            <input
              type="radio"
              name={name}
              value={opt}
              checked={active}
              onChange={() => onChange(opt)}
              className="sr-only"
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-700",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-700",
        "resize-y",
        props.className ?? "",
      ].join(" ")}
    />
  );
}
