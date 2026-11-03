import { TaruviError } from "@taruvi/sdk";

function scalarText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function appendFieldErrors(errors: Record<string, unknown>, lines: string[], prefix = ""): void {
  for (const key of Object.keys(errors).sort()) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = errors[key];
    if (Array.isArray(value)) {
      const parts = value.map(scalarText).filter((part) => part.length > 0);
      if (parts.length > 0) lines.push(`${path}: ${parts.join(", ")}`);
      continue;
    }
    if (value && typeof value === "object") {
      appendFieldErrors(value as Record<string, unknown>, lines, path);
      continue;
    }
    const text = scalarText(value);
    if (text) lines.push(`${path}: ${text}`);
  }
}

export function describeTaruviError(err: unknown): string {
  if (err instanceof TaruviError) {
    const summary = err.detail || err.message;
    const fields: string[] = [];
    if (err.errors) appendFieldErrors(err.errors, fields);
    return fields.length > 0 ? `${summary}\n${fields.join("\n")}` : summary;
  }
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") return err.message;
  return "Unknown error";
}
