import {
  App,
  Database,
  Policy,
  Settings,
  Storage,
  User,
  type BackendFilterTreeRoot,
  type Client,
  type FilterOperator,
  type PaginationInfo,
  type SortOrder,
} from "@taruvi/sdk";

export type FilterValue = string | number | boolean | Array<string | number | boolean>;

export type Filter = {
  field: string;
  operator: FilterOperator;
  value: FilterValue;
};

export type SortInput = string | Array<{ field: string; order?: SortOrder }>;

export type TaruviListParams = {
  filters?: Filter[];
  filtersTree?: BackendFilterTreeRoot;
  sort?: SortInput;
  search?: string;
  page?: number;
  pageSize?: number;
  populate?: string[];
  populateAll?: boolean;
  fields?: string;
  allowedActions?: string[];
  aggregate?: string[];
  groupBy?: string[];
  having?: string;
};

export type TaruviListResult<T> = {
  rows: T[];
  total: number;
  pagination?: PaginationInfo;
};

export type QueryOptions = {
  enabled?: boolean | (() => boolean);
  staleTime?: number;
  gcTime?: number;
};

export type TaruviServicesConfig = {
  keys: TaruviQueryKeys;
  database: Database;
  getStorage: () => Storage;
  getUsers: () => User;
  getPolicy: () => Policy;
  getApp: () => App;
  getSettings: () => Settings;
};

export function createTaruviServicesConfig(client: Client): TaruviServicesConfig {
  return {
    keys: createTaruviQueryKeys(client),
    database: new Database(client),
    getStorage: () => new Storage(client),
    getUsers: () => new User(client),
    getPolicy: () => new Policy(client),
    getApp: () => new App(client),
    getSettings: () => new Settings(client),
  };
}

export function withEnabledOptions(gate: boolean, queryOptions?: QueryOptions) {
  return { ...queryOptions, enabled: gate && (queryOptions?.enabled ?? true) };
}

export type WithoutConfig<A extends { config?: unknown }> = Omit<A, "config">;

const TARUVI_ROOT = "taruvi";

const databaseKey = () => [TARUVI_ROOT, "database"];
const tableKey = (table: string) => [...databaseKey(), table];
const tableListKey = (table: string) => [...tableKey(table), "list"];

const storageKey = () => [TARUVI_ROOT, "storage"];
const storageBucketKey = (bucket: string) => [...storageKey(), bucket];

const usersKey = () => [TARUVI_ROOT, "users"];
const policyKey = () => [TARUVI_ROOT, "policy"];
const appKey = () => [TARUVI_ROOT, "app"];
const settingsKey = () => [TARUVI_ROOT, "settings"];

export const taruviQueryKeys = {
  database: databaseKey,
  table: {
    all: tableKey,
    lists: tableListKey,
    list: (table: string, paramsKey: string) => [...tableListKey(table), paramsKey],
    detail: (table: string, id: string | number) => [...tableKey(table), "one", id],
    first: (table: string, paramsKey: string) => [...tableKey(table), "first", paramsKey],
    count: (table: string, paramsKey: string) => [...tableKey(table), "count", paramsKey],
    infinite: (table: string, paramsKey: string) => [...tableKey(table), "infinite", paramsKey],
    graph: (table: string, id: string | number, opts: unknown) =>
      [...tableKey(table), "graph", id, opts],
    edges: (table: string) => [...tableKey(table), "edges"],
  },
  storage: {
    all: storageKey,
    bucket: storageBucketKey,
    list: (bucket: string, filtersKey: string) => [...storageBucketKey(bucket), "list", filtersKey],
    metadata: (bucket: string, path: string) => [...storageBucketKey(bucket), "metadata", path],
  },
  users: {
    all: usersKey,
    current: (paramsKey: string) => [...usersKey(), "current", paramsKey],
    list: (paramsKey: string) => [...usersKey(), "list", paramsKey],
    one: (paramsKey: string) => [...usersKey(), "one", paramsKey],
    preferences: () => [...usersKey(), "preferences"],
    apps: (paramsKey: string) => [...usersKey(), "apps", paramsKey],
  },
  policy: {
    allowed: (paramsKey: string) => [...policyKey(), "allowed", paramsKey],
    check: (paramsKey: string) => [...policyKey(), "check", paramsKey],
  },
  app: {
    roles: () => [...appKey(), "roles"],
    settings: () => [...appKey(), "settings"],
  },
  settings: {
    all: settingsKey,
    site: () => [...settingsKey(), "site"],
    userAttributes: () => [...settingsKey(), "userAttributes"],
  },
};

export type TaruviQueryKeys = typeof taruviQueryKeys;

export function createTaruviQueryKeys(client: Client): TaruviQueryKeys {
  const { apiUrl, appSlug } = client.getConfig();
  const scopeAll = (node: object): object =>
    Object.fromEntries(
      Object.entries(node).map(([name, value]) => [
        name,
        typeof value === "function"
          ? (...args: unknown[]) => [TARUVI_ROOT, apiUrl, appSlug ?? "", ...value(...args).slice(1)]
          : scopeAll(value),
      ]),
    );
  return scopeAll(taruviQueryKeys) as TaruviQueryKeys;
}

export function serializeParams(value: unknown) {
  return JSON.stringify(value, (_key, nested) => {
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) return nested;
    const source = nested as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) sorted[key] = source[key];
    return sorted;
  });
}
