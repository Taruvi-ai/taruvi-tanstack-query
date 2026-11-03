import { Client, Functions, type FunctionResponse } from "@taruvi/sdk";

type FunctionArgs = { slug: string; params?: Record<string, unknown>; runAsync?: boolean };

export type FunctionResult<T> = { data: T; error: null } | { data: null; error: object };

async function execute<T = unknown>(
  client: Client,
  { slug, params, runAsync }: FunctionArgs,
): Promise<FunctionResult<FunctionResponse<T>>> {
  try {
    const data = await new Functions(client).execute<T>(slug, { params, async: runAsync });
    if (data && typeof data === "object" && !Array.isArray(data) && "status" in data && data.status === "error") {
      return { data: null, error: data };
    }
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: typeof error === "object" && error !== null ? error : { message: String(error) },
    };
  }
}

async function query<T = unknown>(client: Client, args: FunctionArgs): Promise<FunctionResult<T | null>> {
  const result = await execute<T>(client, args);
  if (result.error) return { data: null, error: result.error };
  const data = result.data?.data === undefined ? result.data : result.data.data;
  return { data: data as T | null, error: null };
}

export type FunctionCursorPage = { next?: string | null };

function infinite<T extends FunctionCursorPage>(
  client: Client,
  { slug, params = {}, before, runAsync }: FunctionArgs & { before?: string | null },
): Promise<FunctionResult<T | null>> {
  const next = { ...params };
  if (before) next.before = before;
  else delete next.before;
  return query<T>(client, { slug, params: next, runAsync });
}

export const functions = { query, infinite, execute };
