import {
  App,
  Auth,
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
  getAuth: () => Auth;
  getPolicy: () => Policy;
  getApp: () => App;
  getSettings: () => Settings;
};

export function createTaruviServicesConfig(client: Client): TaruviServicesConfig {
  bindClientAbort(client);
  return {
    keys: createTaruviQueryKeys(client),
    database: new Database(client),
    getStorage: () => new Storage(client),
    getUsers: () => new User(client),
    getAuth: () => new Auth(client),
    getPolicy: () => new Policy(client),
    getApp: () => new App(client),
    getSettings: () => new Settings(client),
  };
}

export function withEnabledOptions(gate: boolean, queryOptions?: QueryOptions) {
  return { ...queryOptions, enabled: gate && (queryOptions?.enabled ?? true) };
}

const abortSignals: AbortSignal[] = [];
const boundClients = new WeakSet<object>();

function bindClientAbort(client: Client) {
  const http = client.httpClient as unknown as { axiosInstance?: Record<string, (...args: unknown[]) => unknown> };
  const axiosInstance = http.axiosInstance;
  if (!axiosInstance || boundClients.has(axiosInstance)) return;
  boundClients.add(axiosInstance);
  for (const method of ["request", "get", "delete", "head", "options", "post", "put", "patch"] as const) {
    const original = axiosInstance[method];
    if (typeof original !== "function") continue;
    axiosInstance[method] = (...args: unknown[]) => {
      const signal = abortSignals.at(-1);
      if (signal) {
        const configIndex = method === "request" ? 0 : method === "post" || method === "put" || method === "patch" ? 2 : 1;
        const config = (args[configIndex] ?? {}) as { signal?: AbortSignal };
        args[configIndex] = { ...config, signal: config.signal ?? signal };
      }
      return original.apply(axiosInstance, args);
    };
  }
}

export function withQuerySignal<TContext extends { signal: AbortSignal }, T>(
  run: (context: TContext) => Promise<T> | T,
): (context: TContext) => Promise<T> {
  return (context: TContext) => {
    const signal = context?.signal;
    if (!signal) return Promise.resolve(run(context));
    if (signal.aborted) return Promise.reject(signal.reason);
    abortSignals.push(signal);
    let pending: Promise<T>;
    try {
      pending = Promise.resolve(run(context));
    } catch (error) {
      abortSignals.pop();
      return Promise.reject(error);
    }
    abortSignals.pop();
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
      pending.then(
        (value) => {
          signal.removeEventListener("abort", onAbort);
          if (signal.aborted) reject(signal.reason);
          else resolve(value);
        },
        (error: unknown) => {
          signal.removeEventListener("abort", onAbort);
          if (signal.aborted) reject(signal.reason);
          else reject(error);
        },
      );
    });
  };
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
    browse: (bucket: string, filtersKey: string) => [...storageBucketKey(bucket), "browse", filtersKey],
    viewAccess: (bucket: string, path: string) => [...storageBucketKey(bucket), "viewAccess", path],
    editAccess: (bucket: string, path: string) => [...storageBucketKey(bucket), "editAccess", path],
  },
  users: {
    all: usersKey,
    current: () => [...usersKey(), "current"],
    list: (paramsKey: string) => [...usersKey(), "list", paramsKey],
    one: (paramsKey: string) => [...usersKey(), "one", paramsKey],
    preferences: () => [...usersKey(), "preferences"],
    apps: (paramsKey: string) => [...usersKey(), "apps", paramsKey],
  },
  policy: {
    all: policyKey,
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

const ANONYMOUS_ACTOR = "anonymous";

function actorScope(client: Client): string {
  const { authMode, apiKey } = client.getConfig();
  const secret = authMode === "apiKey" ? apiKey : client.tokenClient.getSessionToken();
  if (!secret) return ANONYMOUS_ACTOR;
  let hash = 0;
  for (let i = 0; i < secret.length; i++) hash = Math.imul(hash, 31) + secret.charCodeAt(i);
  return `${authMode === "apiKey" ? "apiKey" : "session"}:${(hash >>> 0).toString(16)}`;
}

export function createTaruviQueryKeys(client: Client): TaruviQueryKeys {
  const { apiUrl: configuredUrl, appSlug } = client.getConfig();
  const apiUrl = normalizeApiUrl(configuredUrl);
  const scopeAll = (node: object): object =>
    Object.fromEntries(
      Object.entries(node).map(([name, value]) => [
        name,
        typeof value === "function"
          ? (...args: unknown[]) => [
              TARUVI_ROOT,
              apiUrl,
              appSlug ?? "",
              actorScope(client),
              ...value(...args).slice(1),
            ]
          : scopeAll(value),
      ]),
    );
  return scopeAll(taruviQueryKeys) as TaruviQueryKeys;
}

const UNORDERED_FILTER_VALUES = new Set(["in", "nin", "ina", "nina"]);

function writeParam(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "bigint") return `bigint:${value.toString()}`;
  if (value instanceof Date) return `date:${value.getTime()}`;
  if (Array.isArray(value)) return `[${value.map(writeParam).join(",")}]`;
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return `{${Object.keys(source)
      .map((key) => `${JSON.stringify(key)}:${writeParam(source[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sortParams(values: unknown[]): unknown[] {
  return [...values].sort((left, right) => {
    const a = writeParam(left);
    const b = writeParam(right);
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}

function normalizeParams(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(normalizeParams);
    const unordered = items.every((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const record = item as Record<string, unknown>;
      const leaf = typeof record.field === "string" && typeof record.operator === "string" && "value" in record;
      const group = (record.operator === "and" || record.operator === "or") && Array.isArray(record.value);
      return leaf || group;
    });
    return items.length > 0 && unordered ? sortParams(items) : items;
  }
  if (value instanceof Date || value === null || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) normalized[key] = normalizeParams(source[key]);
  const operator = normalized.operator;
  if (
    typeof normalized.field === "string" &&
    typeof operator === "string" &&
    UNORDERED_FILTER_VALUES.has(operator) &&
    Array.isArray(normalized.value)
  ) {
    normalized.value = sortParams(normalized.value);
  }
  if ((operator === "and" || operator === "or") && Array.isArray(normalized.value)) {
    normalized.value = sortParams(normalized.value);
  }
  return normalized;
}

export function serializeParams(value: unknown) {
  return writeParam(normalizeParams(value));
}

function normalizeApiUrl(apiUrl: string): string {
  try {
    const url = new URL(apiUrl);
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href.replace(/\/$/, "");
  } catch {
    return apiUrl.replace(/\/+$/, "");
  }
}
