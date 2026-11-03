import type { QueryKey } from "@tanstack/query-core";
import type { TaruviQueryKeys } from "./query.js";

export type TaruviQueryClient = {
  invalidateQueries: (filters: { queryKey: QueryKey }) => Promise<void>;
};

export type TaruviMutationContext = {
  client?: TaruviQueryClient;
};

type MutationFn = { mutationFn: (...args: any[]) => Promise<any> };

export async function invalidateOn(
  providerClient: TaruviQueryClient,
  hookClient: TaruviQueryClient | undefined,
  invalidate: (queryClient: TaruviQueryClient) => Promise<unknown>,
) {
  const clients = hookClient && hookClient !== providerClient ? [hookClient, providerClient] : [providerClient];
  for (const queryClient of clients) {
    try {
      await invalidate(queryClient);
    } catch (error) {
      console.error("Taruvi query cache refresh failed after a successful write.", error);
    }
  }
}

export function refreshOnSuccess<T extends MutationFn>(
  mutation: T,
  invalidate: (queryClient: TaruviQueryClient, variables: unknown, result: unknown) => Promise<unknown>,
  queryClient: TaruviQueryClient,
): T {
  return {
    ...mutation,
    mutationFn: (async (variables: unknown, context?: TaruviMutationContext) => {
      const result = await mutation.mutationFn(variables, context);
      await invalidateOn(queryClient, context?.client, (active) => invalidate(active, variables, result));
      return result;
    }) as T["mutationFn"],
  };
}

export function invalidateTaruviQuery(queryClient: TaruviQueryClient, queryKey: QueryKey) {
  return queryClient.invalidateQueries({ queryKey });
}

export function invalidateTaruviDatabase(keys: TaruviQueryKeys, queryClient: TaruviQueryClient) {
  return queryClient.invalidateQueries({ queryKey: keys.database() });
}

export function invalidateTaruviTable(keys: TaruviQueryKeys, queryClient: TaruviQueryClient, table: string) {
  return queryClient.invalidateQueries({ queryKey: keys.table.all(table) });
}

export function invalidateTaruviLists(keys: TaruviQueryKeys, queryClient: TaruviQueryClient, table: string) {
  return queryClient.invalidateQueries({ queryKey: keys.table.lists(table) });
}

export function invalidateTaruviRecord(keys: TaruviQueryKeys, queryClient: TaruviQueryClient, table: string, id: string | number) {
  return queryClient.invalidateQueries({ queryKey: keys.table.detail(table, id) });
}

export function invalidateTaruviStorage(keys: TaruviQueryKeys, queryClient: TaruviQueryClient, bucket?: string) {
  if (bucket) return queryClient.invalidateQueries({ queryKey: keys.storage.bucket(bucket) });
  return queryClient.invalidateQueries({ queryKey: keys.storage.all() });
}

export function invalidateTaruviUsers(keys: TaruviQueryKeys, queryClient: TaruviQueryClient) {
  return queryClient.invalidateQueries({ queryKey: keys.users.all() });
}

export function invalidateTaruviSettings(keys: TaruviQueryKeys, queryClient: TaruviQueryClient) {
  return queryClient.invalidateQueries({ queryKey: keys.settings.all() });
}
