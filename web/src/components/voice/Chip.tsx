"use client";

import { useState, KeyboardEvent } from "react";

export function ToggleChip({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        active
          ? "bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
          : "bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function RemovableChip({
  label,
  onRemove,
  variant = "default",
}: {
  label: string;
  onRemove: () => void;
  variant?: "default" | "avoid";
}) {
  const palette =
    variant === "avoid"
      ? "border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40"
      : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${palette}`}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 leading-none"
      >
        ×
      </button>
    </span>
  );
}

export function ChipList({
  items,
  onAdd,
  onRemove,
  placeholder,
  variant = "default",
}: {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  placeholder?: string;
  variant?: "default" | "avoid";
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
    }
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      submit();
    } else if (e.key === "Backspace" && value === "" && items.length > 0) {
      onRemove(items[items.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {items.map((item) => (
        <RemovableChip
          key={item}
          label={item}
          onRemove={() => onRemove(item)}
          variant={variant}
        />
      ))}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (value.trim()) submit();
        }}
        placeholder={placeholder ?? "Add and press Enter"}
        className="text-xs bg-transparent border-b border-transparent focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none px-1 py-1 min-w-[8rem]"
      />
    </div>
  );
}
