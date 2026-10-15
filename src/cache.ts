import type { QueryKey } from "@tanstack/query-core";
import { taruviQueryKeys } from "./query.js";

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

export function invalidateTaruviDatabase(queryClient: TaruviQueryClient) {
  return queryClient.invalidateQueries({ queryKey: taruviQueryKeys.database() });
}

export function invalidateTaruviTable(queryClient: TaruviQueryClient, table: string) {
  return queryClient.invalidateQueries({ queryKey: taruviQueryKeys.table.all(table) });
}

export function invalidateTaruviLists(queryClient: TaruviQueryClient, table: string) {
  return queryClient.invalidateQueries({ queryKey: taruviQueryKeys.table.lists(table) });
}

export function invalidateTaruviRecord(queryClient: TaruviQueryClient, table: string, id: string | number) {
  return queryClient.invalidateQueries({ queryKey: taruviQueryKeys.table.detail(table, id) });
}

export function invalidateTaruviStorage(queryClient: TaruviQueryClient, bucket?: string) {
  if (bucket) return queryClient.invalidateQueries({ queryKey: taruviQueryKeys.storage.bucket(bucket) });
  return queryClient.invalidateQueries({ queryKey: taruviQueryKeys.storage.all() });
}

export function invalidateTaruviUsers(queryClient: TaruviQueryClient) {
  return queryClient.invalidateQueries({ queryKey: taruviQueryKeys.users.all() });
}

export function invalidateTaruviSettings(queryClient: TaruviQueryClient) {
  return queryClient.invalidateQueries({ queryKey: taruviQueryKeys.settings.all() });
}
