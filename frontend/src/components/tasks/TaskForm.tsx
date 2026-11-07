"use client";

import type { ReactNode } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  COLUMNS,
  DESCRIPTION_MAX_LENGTH,
  PRIORITIES,
  PRIORITY_LABELS,
  TITLE_MAX_LENGTH,
} from "@/lib/constants";
import type { TaskFormValues } from "@/lib/validation";
import { TagInput } from "./TagInput";

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span
      className={value > max ? "text-destructive" : "text-muted-foreground"}
      aria-live="off"
    >
      {value}/{max}
    </span>
  );
}

function FieldRow({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint && <span className="text-xs">{hint}</span>}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

interface TaskFormProps {
  form: UseFormReturn<TaskFormValues>;
  idPrefix: string;
  disabled?: boolean;
  onSubmit: () => void;
  children?: ReactNode;
}

/** Campos del modal de tarea (crear/editar). El botón de envío vive en el pie del diálogo. */
export function TaskForm({
  form,
  idPrefix,
  disabled,
  onSubmit,
  children,
}: TaskFormProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const titleLength = watch("title").length;
  const descriptionLength = watch("description").length;
  const id = (name: string) => `${idPrefix}-${name}`;
  const err = (message?: string) => ({
    "aria-invalid": message ? true : undefined,
    "aria-describedby": message ? undefined : undefined,
  });

  return (
    <form
      id={id("form")}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <FieldRow
        id={id("title")}
        label="Título"
        error={errors.title?.message}
        hint={<Counter value={titleLength} max={TITLE_MAX_LENGTH} />}
      >
        <Input
          id={id("title")}
          autoComplete="off"
          disabled={disabled}
          {...err(errors.title?.message)}
          {...register("title")}
        />
      </FieldRow>

      <FieldRow
        id={id("description")}
        label="Descripción"
        error={errors.description?.message}
        hint={
          <Counter value={descriptionLength} max={DESCRIPTION_MAX_LENGTH} />
        }
      >
        <Textarea
          id={id("description")}
          rows={4}
          disabled={disabled}
          {...err(errors.description?.message)}
          {...register("description")}
        />
      </FieldRow>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldRow
          id={id("status")}
          label="Estado"
          error={errors.status?.message}
        >
          <NativeSelect
            id={id("status")}
            disabled={disabled}
            {...register("status")}
          >
            {COLUMNS.map((c) => (
              <option key={c.status} value={c.status}>
                {c.title}
              </option>
            ))}
          </NativeSelect>
        </FieldRow>
        <FieldRow
          id={id("priority")}
          label="Prioridad"
          error={errors.priority?.message}
        >
          <NativeSelect
            id={id("priority")}
            disabled={disabled}
            {...register("priority")}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </NativeSelect>
        </FieldRow>
      </div>

      <FieldRow
        id={id("dueDate")}
        label="Vencimiento"
        error={errors.dueDate?.message}
      >
        <Input
          id={id("dueDate")}
          type="date"
          disabled={disabled}
          {...err(errors.dueDate?.message)}
          {...register("dueDate")}
        />
      </FieldRow>

      <FieldRow
        id={id("labels")}
        label="Etiquetas"
        error={
          errors.labels?.message ??
          errors.labels?.find?.((l) => l?.message)?.message
        }
      >
        <Controller
          control={control}
          name="labels"
          render={({ field }) => (
            <TagInput
              id={id("labels")}
              value={field.value}
              onChange={field.onChange}
              disabled={disabled}
              invalid={!!errors.labels}
            />
          )}
        />
      </FieldRow>
      {children}
    </form>
  );
}
