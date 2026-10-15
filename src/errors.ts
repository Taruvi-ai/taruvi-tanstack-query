import { TaruviError } from "@taruvi/sdk";

export function describeTaruviError(err: unknown): string {
  if (err instanceof TaruviError) return err.detail || err.message;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
