import type { QueryKey } from "@tanstack/query-core";
import type { TaruviQueryKeys } from "./query.js";

export type TaruviQueryClient = {
  invalidateQueries: (filters: { queryKey: QueryKey }) => Promise<void>;
};

type MutationFn = { mutationFn: (...args: any[]) => Promise<any> };

export function refreshOnSuccess<T extends MutationFn>(mutation: T, invalidate: () => Promise<unknown>): T {
  return {
    ...mutation,
    mutationFn: (async (...args: any[]) => {
      const result = await mutation.mutationFn(...args);
      await invalidate();
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
