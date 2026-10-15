import { Client, Functions, type FunctionResponse } from "@taruvi/sdk";

type FunctionArgs = { slug: string; params?: Record<string, unknown>; runAsync?: boolean };

export type FunctionResult<T> = { data: T; error: null } | { data: null; error: object };

function callError(error: unknown): object {
  return typeof error === "object" && error !== null ? error : { message: String(error) };
}

async function execute<T = unknown>(
  client: Client,
  { slug, params, runAsync }: FunctionArgs,
): Promise<FunctionResult<FunctionResponse<T>>> {
  try {
    const data = await new Functions(client).execute<T>(slug, { params, async: runAsync });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: callError(error) };
  }
}

async function query<T = unknown>(client: Client, args: FunctionArgs): Promise<FunctionResult<T>> {
  const result = await execute<T>(client, args);
  if (result.error) return { data: null, error: result.error };
  const data = (result.data.data ?? result.data) as T;
  if (data && typeof data === "object" && (data as { success?: unknown }).success === false) {
    return { data: null, error: callError(data) };
  }
  return { data, error: null };
}

export type FunctionCursorPage = { next?: string | null };

function infinite<T extends FunctionCursorPage>(
  client: Client,
  { slug, params = {}, before }: FunctionArgs & { before?: string | null },
): Promise<FunctionResult<T>> {
  const next = { ...params };
  if (before) next.before = before;
  else delete next.before;
  return query<T>(client, { slug, params: next });
}

export const functions = { query, infinite, execute };
