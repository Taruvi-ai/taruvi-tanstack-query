# @taruvi/tanstack-query

`@taruvi/tanstack-query` connects a Taruvi `Client` to [TanStack Query](https://tanstack.com/query). `createTaruviProvider(client, queryClient)` returns the options object TanStack already understands: `queryKey`, `queryFn`, and, for writes, `mutationFn`. The app passes that object to `useQuery`, `useMutation`, or `useInfiniteQuery`.

The `QueryClient` given to `createTaruviProvider` is the same one the screen reads. Cache refreshes from this package land in that client.

Functions, analytics, file URLs, and downloads are plain functions. They take the SDK `Client` and return a value.

## Install

```bash
npm install @taruvi/tanstack-query
```

npm installs `@taruvi/sdk` and `@tanstack/query-core` with it.

The React, Vue, or Svelte query package stays in the app: `@tanstack/react-query`, `@tanstack/vue-query`, or `@tanstack/svelte-query`.

## A React screen

```tsx
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { Client, createTaruviProvider } from "@taruvi/tanstack-query";

const client = new Client({ apiUrl, appSlug, token });
const queryClient = new QueryClient();
const taruvi = createTaruviProvider(client, queryClient);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Users />
    </QueryClientProvider>
  );
}

function Users() {
  const list = useQuery(
    taruvi.database.list<User>({
      tableName: "users",
      filters: [{ field: "status", operator: "eq", value: "active" }],
      page: 1,
      pageSize: 20,
    }),
  );

  const create = useMutation(taruvi.database.create<User>({ tableName: "users" }));
  const pages = useInfiniteQuery(taruvi.database.infinite<User>({ tableName: "users" }));

  // create.mutate({ name: "Ada" })
  return list.data?.rows ?? pages.data?.pages ?? null;
}
```

`list()` is already `{ queryKey, queryFn, enabled }`. `useQuery` takes that object as it is. `list.data` is `{ rows, total, pagination }`. `one` and `first` resolve to the row or `null`.

`create({ tableName: "users" })` only binds the table. The new row is the argument of `mutate`. `infinite` also carries `initialPageParam` and `getNextPageParam`, which is why it belongs on `useInfiniteQuery`.

A browser client is created with `token`, or through hosted sign-in in `@taruvi/sdk`. An `apiKey` belongs in server code.

`queryOptions` on a method covers `enabled`, `staleTime`, and `gcTime`. Any other TanStack field is added on the object the hook receives, for example `{ ...taruvi.database.list({ tableName: "users" }), placeholderData }`. Filter operators are the SDK names, such as `eq`.

A read waits until it has what it needs. An empty `tableName`, a missing `id`, or a missing `params` list leaves `enabled` false.

## Services

| Provider | Reads | Writes |
| --- | --- | --- |
| `database` | `list` `many` `one` `first` `count` `infinite` `graph` `edges` | `create` `update` `delete` `upsert` `createMany` `updateMany` `deleteMany` `deleteFiltered` `createEdges` `deleteEdges` |
| `storage` | `list` `metadata` | `upload` `delete` `update` |
| `users` | `current` `list` `one` `preferences` `apps` | `update` `updatePreferences` `create` `delete` `assignRoles` `revokeRoles` |
| `policy` | `allowed` `check` | |
| `app` | `roles` `settings` | |
| `settings` | `site` `userAttributes` | `updateUserAttributes` |

`users.current({ params: [username] })` and `users.one({ params: [username] })` both call `User.getUser`. The `params` array is the SDK argument list. User writes use that same list: `users.update().mutationFn([username, body])`.

`settings.userAttributes` is the tenant schema. A person's attribute values go through `users.update`.

| Write | `mutate` argument |
| --- | --- |
| `create`, `upsert` | `Partial<T>`. `upsert` also accepts an array. `uniqueFields` is set on the method call |
| `update` | `{ id, data }` |
| `delete` | `id` |
| `createMany` | `Partial<T>[]` |
| `updateMany` | `Array<Partial<T> & { id }>` |
| `deleteMany` | `Array<string \| number>` |
| `deleteFiltered` | `{ filters?, filtersTree?, search? }` |
| `createEdges` | `EdgeRequest[]` |
| `deleteEdges` | `number[]` |
| `storage.upload` | `{ files, paths, metadatas? }` |
| `storage.update` | `{ path, body }` |
| `storage.delete` | `string[]` |

`deleteFiltered` removes every row that matches. With an empty filter set, that can be the whole table. Uploads take a web `File` or `{ uri, name, type }`, and `bucket` is set on the storage method call.

## Direct calls

```ts
import { analyticsExecute, functions, storageDownload, storageFileUrl } from "@taruvi/tanstack-query";

const url = storageFileUrl(client, { bucket, path });
const blob = await storageDownload(client, { bucket, path });
const stats = await analyticsExecute<Stats>(client, { querySlug: "dashboard", params: { range: "30d" } });
const result = await functions.query<Stats>(client, { slug: "dashboard", params: { range: "30d" } });
```

`storageFileUrl` returns a string. `storageDownload` returns `Promise<Blob>`. `analyticsExecute` returns the SDK response and throws when the query fails.

`functions.query`, `functions.infinite`, and `functions.execute` return `{ data, error }`. A failed function leaves `error` set and does not throw.

## Cache

After a write succeeds, the provider invalidates the area that write changed, before the mutation resolves:

| Write | Invalidates |
| --- | --- |
| Any `database` write | Every cached query for that table |
| Any `storage` write | That bucket |
| Any `users` write | User queries |
| `settings.updateUserAttributes` | Settings queries |

`policy` and `app` only read. Functions, analytics, downloads, and file URLs stay outside the query cache.

`taruvi.invalidate` is there for a refresh that did not come from one of those writes. Each method takes the same `QueryClient` the provider was built with:

| Call | Invalidates |
| --- | --- |
| `taruvi.invalidate.query(queryClient, queryKey)` | That key |
| `taruvi.invalidate.database(queryClient)` | Every database query |
| `taruvi.invalidate.table(queryClient, table)` | Every query for that datatable |
| `taruvi.invalidate.lists(queryClient, table)` | List queries for that datatable |
| `taruvi.invalidate.record(queryClient, table, id)` | That row |
| `taruvi.invalidate.storage(queryClient, bucket)` | That bucket, or every bucket when `bucket` is omitted |
| `taruvi.invalidate.users(queryClient)` | User queries |
| `taruvi.invalidate.settings(queryClient)` | Settings queries |

`taruviQueryKeys` builds those same keys when the app calls `invalidateQueries` itself.

## Session

The token lives on the SDK `Client`. A new token on that same client is `new Auth(client).setSession(token)` from `@taruvi/sdk`. A different client means calling `createTaruviProvider` again. Logout is `queryClient.clear()`.

`taruvi.errors.describe(err)` turns a failure into one line: `detail` or `message` on a `TaruviError`, the `Error` message otherwise, and `"Unknown error"` when the value is not an `Error`.

## Build

`npm run build` writes ESM to `dist` and CommonJS to `dist/cjs`. `dist` is generated. Source edits belong in `src`.
