"use client";

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { LABEL_MAX_LENGTH, MAX_LABELS_PER_TASK } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (labels: string[]) => void;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

/** Chips de etiquetas: alta con Enter o coma, límites de plan §7.2 (10 / 20 caracteres). */
export function TagInput({
  value,
  onChange,
  id,
  disabled,
  invalid,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const hintId = useId();
  const full = value.length >= MAX_LABELS_PER_TASK;

  function commit(raw: string): boolean {
    const label = raw.trim();
    if (label === "") return true;
    if (full) {
      setMessage(`Máximo ${MAX_LABELS_PER_TASK} etiquetas por tarea`);
      return false;
    }
    if (value.some((l) => l.toLowerCase() === label.toLowerCase())) {
      setMessage(`La etiqueta "${label}" ya está agregada`);
      return false;
    }
    onChange([...value, label]);
    setMessage(null);
    return true;
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (commit(draft)) setDraft("");
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Etiquetas agregadas">
          {value.map((label) => (
            <li
              key={label.toLowerCase()}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 text-xs"
            >
              <span className="truncate">{label}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Quitar etiqueta ${label}`}
                onClick={() => onChange(value.filter((l) => l !== label))}
                className="rounded-full p-0.5 text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        disabled={disabled || full}
        maxLength={LABEL_MAX_LENGTH}
        aria-invalid={invalid || undefined}
        aria-describedby={hintId}
        placeholder={
          full
            ? "Límite de etiquetas alcanzado"
            : "Escribí una etiqueta y presioná Enter"
        }
        onChange={(e) => {
          setDraft(e.target.value);
          if (message) setMessage(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft.trim() !== "" && commit(draft)) setDraft("");
        }}
      />
      <p
        id={hintId}
        className="text-xs text-muted-foreground"
        aria-live="polite"
      >
        {message ? (
          <span className="text-destructive">{message}</span>
        ) : (
          <>
            {value.length}/{MAX_LABELS_PER_TASK} etiquetas · hasta{" "}
            {LABEL_MAX_LENGTH} caracteres cada una
          </>
        )}
      </p>
    </div>
  );
}
