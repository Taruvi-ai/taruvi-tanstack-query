import type { Database, EdgeRequest, GraphFormat, GraphInclude, TaruviResponse } from "@taruvi/sdk";
import {
  withEnabledOptions,
  serializeParams,
  taruviQueryKeys,
  type QueryOptions,
  type TaruviListParams,
  type TaruviListResult,
  type TaruviServicesConfig,
} from "../query.js";

function applyTableQueryOptions<T>(
  database: Database,
  tableName: string,
  opts: TaruviListParams,
): Database<T> {
  let q = database.from<T>(tableName);
  for (const filter of opts.filters ?? []) q = q.filters(filter.field, filter.operator, filter.value);
  if (opts.filtersTree) q = q.filters(opts.filtersTree);
  if (opts.sort) q = q.sort(opts.sort);
  if (opts.search) q = q.search(opts.search);
  if (opts.pageSize != null) q = q.pageSize(opts.pageSize);
  if (opts.page != null) q = q.page(opts.page);
  if (opts.populate?.length) q = q.populate(opts.populate);
  if (opts.populateAll) q = q.populateAll();
  if (opts.fields) q = q.fields(opts.fields);
  if (opts.allowedActions?.length) q = q.allowedActions(opts.allowedActions);
  if (opts.aggregate?.length) q = q.aggregate(...opts.aggregate);
  if (opts.groupBy?.length) q = q.groupBy(...opts.groupBy);
  if (opts.having) q = q.having(opts.having);
  return q;
}

function normalizeListResult<T>(res: TaruviResponse<T | T[]>): TaruviListResult<T> {
  const data = res.data;
  const rows = Array.isArray(data) ? data : data != null ? [data as T] : [];
  return { rows, total: res.total ?? rows.length, pagination: res.pagination };
}

function normalizeOneResult<T>(res: TaruviResponse<T | T[]>): T | null {
  const data = res.data;
  if (Array.isArray(data)) return data[0] ?? null;
  return (data as T) ?? null;
}

function executeList<T>(config: TaruviServicesConfig, tableName: string, params: TaruviListParams) {
  return applyTableQueryOptions<T>(config.database, tableName, params).execute().then(normalizeListResult<T>);
}

function executeOne<T>(
  config: TaruviServicesConfig,
  tableName: string,
  id: string | number | null | undefined,
  params: Pick<TaruviListParams, "populate" | "populateAll" | "allowedActions">,
) {
  return applyTableQueryOptions<T>(config.database, tableName, params)
    .get(String(id))
    .execute()
    .then(normalizeOneResult<T>);
}

export function listQuery<T>(
  args: { config: TaruviServicesConfig; tableName: string; queryOptions?: QueryOptions } &
    TaruviListParams,
) {
  const { config, tableName, queryOptions, ...params } = args;
  return {
    ...withEnabledOptions(tableName.length > 0, queryOptions),
    queryKey: taruviQueryKeys.table.list(tableName, serializeParams(params)),
    queryFn: () => executeList<T>(config, tableName, params),
  };
}

export function oneQuery<T>(args: {
  config: TaruviServicesConfig;
  tableName: string;
  id: string | number | null | undefined;
  populate?: string[];
  populateAll?: boolean;
  allowedActions?: string[];
  queryOptions?: QueryOptions;
}) {
  const { config, tableName, id, populate, populateAll, allowedActions, queryOptions } = args;
  const variant = serializeParams({ populate, populateAll, allowedActions });
  return {
    ...withEnabledOptions(tableName.length > 0 && id != null, queryOptions),
    queryKey: [...taruviQueryKeys.table.detail(tableName, id ?? ""), variant],
    queryFn: () => executeOne<T>(config, tableName, id, { populate, populateAll, allowedActions }),
  };
}

export function firstQuery<T>(
  args: {
    config: TaruviServicesConfig;
    tableName: string;
    queryOptions?: QueryOptions;
  } & Omit<TaruviListParams, "page" | "pageSize">,
) {
  const { config, tableName, queryOptions, ...params } = args;
  return {
    ...withEnabledOptions(tableName.length > 0, queryOptions),
    queryKey: taruviQueryKeys.table.first(tableName, serializeParams(params)),
    queryFn: () => applyTableQueryOptions<T>(config.database, tableName, params).first(),
  };
}

export function countQuery(
  args: {
    config: TaruviServicesConfig;
    tableName: string;
    queryOptions?: QueryOptions;
  } & Pick<TaruviListParams, "filters" | "filtersTree" | "search">,
) {
  const { config, tableName, queryOptions, ...params } = args;
  return {
    ...withEnabledOptions(tableName.length > 0, queryOptions),
    queryKey: taruviQueryKeys.table.count(tableName, serializeParams(params)),
    queryFn: () => applyTableQueryOptions(config.database, tableName, params).count(),
  };
}

export function infiniteListQuery<T>(
  args: {
    config: TaruviServicesConfig;
    tableName: string;
    pageSize?: number;
    queryOptions?: QueryOptions;
  } & Omit<TaruviListParams, "page" | "pageSize">,
) {
  const { config, tableName, pageSize = 20, queryOptions, ...rest } = args;
  return {
    ...withEnabledOptions(tableName.length > 0, queryOptions),
    queryKey: taruviQueryKeys.table.infinite(tableName, serializeParams({ ...rest, pageSize })),
    initialPageParam: 1,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      executeList<T>(config, tableName, { ...rest, page: pageParam, pageSize }),
    getNextPageParam: (last: TaruviListResult<T>, _pages: TaruviListResult<T>[], page: number) =>
      last.pagination?.has_next ? page + 1 : undefined,
  };
}

export function graphQuery<T>(args: {
  config: TaruviServicesConfig;
  tableName: string;
  id: string | number | null | undefined;
  include?: GraphInclude;
  depth?: number;
  format?: GraphFormat;
  types?: string[];
  queryOptions?: QueryOptions;
}) {
  const { config, tableName, id, include, depth, format, types, queryOptions } = args;
  return {
    ...withEnabledOptions(tableName.length > 0 && id != null, queryOptions),
    queryKey: taruviQueryKeys.table.graph(tableName, id ?? "", serializeParams({ include, depth, format, types })),
    queryFn: () => {
      let q = config.database.from<T>(tableName).get(String(id));
      if (include) q = q.include(include);
      if (depth != null) q = q.depth(depth);
      if (format) q = q.format(format);
      if (types?.length) q = q.types(types);
      return q.execute();
    },
  };
}

export function edgesQuery<T>(args: {
  config: TaruviServicesConfig;
  tableName: string;
  queryOptions?: QueryOptions;
}) {
  const { config, tableName, queryOptions } = args;
  return {
    ...withEnabledOptions(tableName.length > 0, queryOptions),
    queryKey: taruviQueryKeys.table.edges(tableName),
    queryFn: () => config.database.from<T>(tableName).edges().execute(),
  };
}

export function createMutation<T>(args: {
  config: TaruviServicesConfig;
  tableName: string;
}) {
  const { config, tableName } = args;
  return {
    mutationFn: (data: Partial<T>) => config.database.from<T>(tableName).create(data).execute(),
  };
}

export type UpdateVariables<T> = { id: string | number; data: Partial<T> };

export function updateMutation<T>(args: {
  config: TaruviServicesConfig;
  tableName: string;
}) {
  const { config, tableName } = args;
  return {
    mutationFn: ({ id, data }: UpdateVariables<T>) =>
      config.database.from<T>(tableName).get(String(id)).update(data).execute(),
  };
}

export function deleteMutation(args: {
  config: TaruviServicesConfig;
  tableName: string;
}) {
  const { config, tableName } = args;
  return {
    mutationFn: (id: string | number) => config.database.from(tableName).delete(String(id)).execute(),
  };
}

export function upsertMutation<T>(args: {
  config: TaruviServicesConfig;
  tableName: string;
  uniqueFields?: string[];
}) {
  const { config, tableName, uniqueFields } = args;
  return {
    mutationFn: (data: Partial<T> | Partial<T>[]) =>
      config.database.from<T>(tableName).upsert(data, uniqueFields).execute(),
  };
}

export type BulkUpdateItem<T> = Partial<T> & { id: string | number };

export function createManyMutation<T>(args: {
  config: TaruviServicesConfig;
  tableName: string;
}) {
  const { config, tableName } = args;
  return {
    mutationFn: (data: Partial<T>[]) => config.database.from<T>(tableName).create(data).execute(),
  };
}

export function updateManyMutation<T>(args: {
  config: TaruviServicesConfig;
  tableName: string;
}) {
  const { config, tableName } = args;
  return {
    mutationFn: (items: Array<BulkUpdateItem<T>>) =>
      config.database.from<T>(tableName).bulkUpdate(items).execute(),
  };
}

export function deleteManyMutation(args: {
  config: TaruviServicesConfig;
  tableName: string;
}) {
  const { config, tableName } = args;
  return {
    mutationFn: (ids: Array<string | number>) =>
      config.database.from(tableName).bulkDelete(ids.map(String)).execute(),
  };
}

export type DeleteFilteredCriteria = Pick<TaruviListParams, "filters" | "filtersTree" | "search">;

export function deleteFilteredMutation(args: {
  config: TaruviServicesConfig;
  tableName: string;
}) {
  const { config, tableName } = args;
  return {
    mutationFn: (criteria: DeleteFilteredCriteria) =>
      applyTableQueryOptions(config.database, tableName, criteria).deleteFiltered().execute(),
  };
}

export function createEdgesMutation(args: {
  config: TaruviServicesConfig;
  tableName: string;
}) {
  const { config, tableName } = args;
  return {
    mutationFn: (edges: EdgeRequest[]) => config.database.from(tableName).edges().create(edges).execute(),
  };
}

export function deleteEdgesMutation(args: {
  config: TaruviServicesConfig;
  tableName: string;
}) {
  const { config, tableName } = args;
  return {
    mutationFn: (edgeIds: number[]) => config.database.from(tableName).edges().delete(edgeIds).execute(),
  };
}
