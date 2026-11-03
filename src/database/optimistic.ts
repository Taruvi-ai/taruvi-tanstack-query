import type { QueryKey } from "@tanstack/query-core";
import type { TaruviQueryClient, TaruviMutationContext } from "../cache.js";
import type { TaruviQueryKeys, TaruviServicesConfig } from "../query.js";

type CacheEditor = TaruviQueryClient & {
  cancelQueries?: (filters: { queryKey: QueryKey }) => Promise<void>;
  getQueriesData?: (filters: { queryKey: QueryKey }) => Array<[QueryKey, unknown]>;
  setQueryData?: (queryKey: QueryKey, data: unknown) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function sameId(row: Record<string, unknown>, id: string | number) {
  return "id" in row && String(row.id) === String(id);
}

function walk(value: unknown, id: string | number, patch: Record<string, unknown> | null, where: "own" | "foreign" | "nested"): unknown {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const edited = walk(item, id, patch, "nested");
      if (edited !== item) changed = true;
      return edited;
    });
    if (!changed) return value;
    return patch === null ? next.filter((item) => item != null) : next;
  }
  if (!isRecord(value)) return value;
  if (Array.isArray(value.pages)) {
    let changed = false;
    const pages = value.pages.map((page) => {
      const next = walk(page, id, patch, where);
      if (next !== page) changed = true;
      return next;
    });
    return changed ? { ...value, pages } : value;
  }
  if (Array.isArray(value.rows)) {
    if (where === "own") {
      let changed = false;
      const rows = value.rows.flatMap((row) => {
        if (!isRecord(row) || !sameId(row, id)) return [row];
        changed = true;
        return patch ? [{ ...row, ...patch }] : [];
      });
      if (!changed) return value;
      const removed = value.rows.length - rows.length;
      return { ...value, rows, total: typeof value.total === "number" ? value.total - removed : value.total };
    }
    let changed = false;
    const rows = value.rows.map((row) => {
      const next = walk(row, id, patch, "foreign");
      if (next !== row) changed = true;
      return next;
    });
    return changed ? { ...value, rows } : value;
  }
  if (where === "nested" && sameId(value, id)) return patch ? { ...value, ...patch } : null;
  if (where === "own") return sameId(value, id) ? (patch ? { ...value, ...patch } : null) : value;
  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const edited = key === "id" ? child : walk(child, id, patch, "nested");
    next[key] = edited;
    if (edited !== child) changed = true;
  }
  return changed ? next : value;
}

function editEntry(key: QueryKey, data: unknown, tableName: string, id: string | number, patch: Record<string, unknown> | null) {
  const parts = key as readonly unknown[];
  const index = parts.indexOf("database");
  const own = index >= 0 && parts[index + 1] === tableName;
  return walk(data, id, patch, own ? "own" : "foreign");
}

export function patchCachedRecord(
  client: TaruviQueryClient,
  keys: TaruviQueryKeys,
  tableName: string,
  id: string | number,
  patch: Record<string, unknown> | null,
) {
  const cache = client as CacheEditor;
  if (!cache.getQueriesData || !cache.setQueryData) return;
  for (const [key, data] of cache.getQueriesData({ queryKey: keys.database() })) {
    const next = editEntry(key, data, tableName, id, patch);
    if (next !== data) cache.setQueryData(key, next);
  }
  if (patch === null) void client.invalidateQueries({ queryKey: [...keys.table.all(tableName), "count"] });
}

function addRow(data: unknown, row: Record<string, unknown>): unknown {
  if (!isRecord(data)) return data;
  if (Array.isArray(data.pages)) {
    let changed = false;
    const pages = data.pages.map((page, index) => {
      if (index !== 0) return page;
      const next = addRow(page, row);
      if (next !== page) changed = true;
      return next;
    });
    return changed ? { ...data, pages } : data;
  }
  if (!Array.isArray(data.rows)) return data;
  if (data.rows.some((item) => isRecord(item) && String(item.id) === String(row.id))) return data;
  return {
    ...data,
    rows: [...data.rows, row],
    total: typeof data.total === "number" ? data.total + 1 : data.total,
  };
}

export function rowsFromResult(result: unknown): Record<string, unknown>[] {
  if (!isRecord(result)) return [];
  if (Array.isArray(result.data)) return result.data.filter(isRecord);
  return isRecord(result.data) ? [result.data] : [];
}

export function writeCachedRows(
  client: TaruviQueryClient,
  keys: TaruviQueryKeys,
  tableName: string,
  rows: Record<string, unknown>[],
) {
  const cache = client as CacheEditor;
  if (!cache.getQueriesData || !cache.setQueryData) return;
  let added = false;
  for (const row of rows) {
    if (typeof row.id !== "string" && typeof row.id !== "number") continue;
    patchCachedRecord(client, keys, tableName, row.id, row);
    for (const [key, data] of cache.getQueriesData({ queryKey: keys.table.all(tableName) })) {
      const next = addRow(data, row);
      if (next !== data) {
        cache.setQueryData(key, next);
        added = true;
      }
    }
  }
  if (added) void client.invalidateQueries({ queryKey: [...keys.table.all(tableName), "count"] });
}

export function withRowEdit<T extends object, V>(
  mutation: T,
  args: {
    config: TaruviServicesConfig;
    queryClient: TaruviQueryClient;
    tableName: string;
    edit: (variables: V) => { id: string | number; patch: Record<string, unknown> | null };
  },
) {
  return {
    ...mutation,
    onMutate: async (variables: V, context?: TaruviMutationContext) => {
      const { id, patch } = args.edit(variables);
      const prefix = args.config.keys.database();
      const undo: Array<() => void> = [];
      const clients = (
        context?.client && context.client !== args.queryClient ? [context.client, args.queryClient] : [args.queryClient]
      ).map((client) => client as CacheEditor);
      for (const client of clients) {
        await client.cancelQueries?.({ queryKey: prefix });
        const entries = client.getQueriesData?.({ queryKey: prefix }) ?? [];
        undo.push(() => {
          for (const [key, data] of entries) client.setQueryData?.(key, data);
        });
        for (const [key, data] of entries) client.setQueryData?.(key, editEntry(key, data, args.tableName, id, patch));
      }
      return undo;
    },
    onError: (_error: unknown, _variables: V, undo?: Array<() => void>) => {
      undo?.forEach((restore) => restore());
    },
  };
}
