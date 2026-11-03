# @taruvi/tanstack-query

`createTaruviProvider(client, queryClient)` returns TanStack Query options (`queryKey`, `queryFn`, `mutationFn`). Pass them to `useQuery`, `useMutation`, or `useInfiniteQuery`. The same object works with Vue Query and Svelte Query.

`taruvi.queryClient` is that `QueryClient`. Pass it to `QueryClientProvider`. `taruvi.invalidate` refreshes it. Functions, analytics, file URLs, and downloads are plain functions on the SDK `Client`.

## Install

```bash
npm install @taruvi/tanstack-query @taruvi/sdk@1.5.4 axios
```

`@tanstack/query-core`, `@taruvi/sdk`, and `axios` are peers. Install the query-core copy that comes with `@tanstack/react-query`, `@tanstack/vue-query`, or `@tanstack/svelte-query`. Install `@taruvi/sdk` 1.5.4 and axios 1.x in the app, so this package and the app share one `QueryClient` and one SDK.

## React

Create the `Client` and `QueryClient` once per browser tab, or once per server request. Do not construct them at module scope.

```tsx
import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Client, createTaruviProvider, type TaruviProvider } from "@taruvi/tanstack-query";

function makeTaruvi(token?: string) {
  const sdk = new Client({ apiUrl, appSlug, token });
  return createTaruviProvider(sdk, new QueryClient());
}

let browserTaruvi: TaruviProvider | undefined;

function getTaruvi(token?: string) {
  if (typeof window === "undefined") return makeTaruvi(token);
  browserTaruvi ??= makeTaruvi(token);
  return browserTaruvi;
}

export function App({ token }: { token?: string }) {
  const [taruvi] = useState(() => getTaruvi(token));
  return (
    <QueryClientProvider client={taruvi.queryClient}>
      <Users taruvi={taruvi} />
    </QueryClientProvider>
  );
}

function Users({ taruvi }: { taruvi: TaruviProvider }) {
  const list = useQuery(taruvi.database.list<User>({ tableName: "users", page: 1, pageSize: 20 }));
  const create = useMutation(taruvi.database.create<User>({ tableName: "users" }));
  // create.mutate({ name: "Ada" })
  return list.data?.rows ?? null;
}
```

On the server, each request calls `getTaruvi(token)` again. In the browser, the first pair is kept. Later sign-in is `auth.setSession(token)` on that client.

`list.data` is `{ rows, total, pagination }`. `one` and `first` resolve to the row or `null`. `infinite` follows `pagination.has_next` when present, otherwise page counts, otherwise `total`. The previous page walks backward unless `has_previous` is false.

`queryOptions` sets `enabled`, `staleTime`, and `gcTime`. Add other TanStack fields on the object the hook receives. A read stays disabled until it has a table name, id, or params. `database.many` also stays disabled when `ids` is empty. A read passes TanStack's abort signal into the HTTP request, so a cancelled query stops the call. A response that arrives after the abort is discarded.

Import `Filter`, `TaruviListResult`, `QueryOptions`, `UpdateVariables`, and `TaruviError` from this package.

## Vue and Svelte

```ts
import { QueryClient, VueQueryPlugin, useQuery } from "@tanstack/vue-query";
import { Client, createTaruviProvider } from "@taruvi/tanstack-query";

export function mount(token?: string) {
  const queryClient = new QueryClient();
  const taruvi = createTaruviProvider(new Client({ apiUrl, appSlug, token }), queryClient);
  app.use(VueQueryPlugin, { queryClient: taruvi.queryClient });
  return useQuery(taruvi.database.list({ tableName: "users" }));
}
```

```svelte
<script lang="ts">
  import { QueryClient, QueryClientProvider, createQuery } from "@tanstack/svelte-query";
  import { Client, createTaruviProvider } from "@taruvi/tanstack-query";

  const queryClient = new QueryClient();
  const taruvi = createTaruviProvider(new Client({ apiUrl, appSlug, token }), queryClient);
  const list = createQuery(() => taruvi.database.list({ tableName: "users" }));
</script>

<QueryClientProvider client={queryClient}>{list.data?.rows}</QueryClientProvider>
```

## Services

| Provider | Reads | Writes |
| --- | --- | --- |
| `database` | `list` `many` `one` `first` `count` `infinite` `graph` `edges` | `create` `update` `delete` `upsert` `createMany` `updateMany` `deleteMany` `deleteFiltered` `createEdges` `deleteEdges` |
| `storage` | `list` `metadata` `browse` `viewAccess` `editAccess` | `upload` `delete` `update` |
| `users` | `current` `list` `one` `preferences` `apps` | `update` `updatePreferences` `create` `delete` `assignRoles` `revokeRoles` |
| `policy` | `allowed` `check` | |
| `app` | `roles` `settings` | |
| `settings` | `site` `userAttributes` | `updateUserAttributes` |

`users.current()` calls `Auth.getCurrentUser()` and needs no username. It is `null` when there is no token, and the SDK also returns `null` when that request fails. `users.update()` takes `{ username, data }`. `settings.userAttributes` is the tenant schema. A person's values go through `users.update`.

`storage.browse` lists one folder (`filters.prefix`, or the bucket root). `viewAccess` and `editAccess` return the SharePoint link. Secrets stay in server code with `@taruvi/sdk`.

| Write | `mutate` argument |
| --- | --- |
| `create`, `upsert` | `Partial<T>`. `upsert` also accepts an array. `uniqueFields` is set on the method call |
| `update` | `{ id, data }` |
| `delete` | `id` |
| `createMany` | `Partial<T>[]` |
| `updateMany` | `Array<Partial<T> & { id }>` |
| `deleteMany` | `Array<string \| number>` |
| `deleteFiltered` | `{ filters?, filtersTree? }` |
| `createEdges` | `EdgeRequest[]` |
| `deleteEdges` | `number[]` |
| `storage.upload` | `{ files, paths, metadatas? }` |
| `storage.update` | `{ path, body }` |
| `storage.delete` | `string[]` |
| `users.update` | `{ username, data }` |
| `users.create` | user fields such as `username`, `email`, `password` |
| `users.delete` | `username` |
| `users.updatePreferences` | preference fields such as `theme` or `timezone` |
| `users.assignRoles` | `{ roles, usernames, expires_at? }` |
| `users.revokeRoles` | `{ roles, usernames }` |

`storage.upload` takes a web `File` or a React Native file `{ uri, name, type }`. Upload and delete throw when any item fails. `error.cause` is the SDK batch response, and the bucket is refreshed when some items succeeded. `deleteFiltered` needs filters. Full-text `search` is not supported there. Delete those rows with `deleteMany`.

## Direct calls

```ts
import { analyticsExecute, functions, storageDownload, storageFileUrl } from "@taruvi/tanstack-query";

const url = storageFileUrl(client, { bucket, path });
const blob = await storageDownload(client, { bucket, path });
const stats = await analyticsExecute<Stats>(client, { querySlug: "dashboard", params: { range: "30d" } });
const result = await functions.query<Stats>(client, { slug: "dashboard", params: { range: "30d" } });
```

`functions.query`, `functions.infinite`, and `functions.execute` return `{ data, error }` and do not throw. An HTTP 200 body with `status: "error"` is `{ data: null, error: body }`. A successful `query` or `infinite` unwraps `data` when that field is present. `execute` keeps the full response.

## Cache

| Write | What changes |
| --- | --- |
| `database.update` | Patches that row, including a populated copy on another table, then refetches that row |
| `database.delete` | Removes that row, including a populated copy on another table, then refetches that row |
| `database.create`, `createMany`, `upsert`, `updateMany`, `deleteMany` | Patches the cached rows for that table. Create adds the returned row |
| `database.deleteFiltered` | That table's queries |
| `database.createEdges`, `deleteEdges` | That table's edge and graph queries |
| Any `storage` write | That bucket |
| `users.assignRoles`, `users.revokeRoles` | Users, policy, and `app.roles` |
| Other `users` writes | User queries |
| `settings.updateUserAttributes` | Settings queries |

A failed update or delete restores the cache snapshot. A populated copy keeps the other table's own row. A failed cache refresh does not fail a write that already succeeded.

`taruvi.invalidate` takes no `QueryClient`. `query(queryKey)`, `database()`, `table(table)`, `lists(table)`, `record(table, id)`, `storage(bucket?)`, `users()`, and `settings()` refresh those areas.

Every key is `["taruvi", apiUrl, appSlug, actor, ...]`. The host in `apiUrl` is lowercase and has no trailing slash. `actor` is `"anonymous"`, or a hash of the session token or API key. The raw credential is not in the key. Equivalent filters share a key: object keys are sorted, `undefined` stays distinct from a missing field and from `null`, and unordered filter lists match in any order. Call provider methods during render so a new token builds a new key. On logout, call `taruvi.queryClient.clear()` and delete any `persistQueryClient` file. That file still holds the previous rows, and the next user's keys do not match them.

## Session

```ts
import { Auth } from "@taruvi/tanstack-query";

const auth = new Auth(sdk);
auth.login(window.location.origin);
await auth.validateSession();
await auth.logout(window.location.origin);
```

`deskUrl` sets the hosted sign-in host and defaults to `apiUrl`. A 403 leaves the token in place. 401, 410, and 419 clear the session. `taruvi.errors.describe(err)` returns `detail` or `message`, then one line per field error.

Before 1.0.0, a minor or patch release may change behavior. `@taruvi/sdk` is pinned to 1.5.4. `npm run build` writes ESM to `dist` and CommonJS to `dist/cjs`.
