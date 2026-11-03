import type { Client } from "@taruvi/sdk";
import type { QueryKey } from "@tanstack/query-core";
import {
  invalidateTaruviDatabase,
  invalidateTaruviLists,
  invalidateTaruviQuery,
  invalidateTaruviRecord,
  invalidateTaruviSettings,
  invalidateTaruviStorage,
  invalidateTaruviTable,
  invalidateTaruviUsers,
  type TaruviQueryClient,
} from "./cache.js";
import { describeTaruviError } from "./errors.js";
import { appMethods } from "./app/methods.js";
import { databaseMethods } from "./database/methods.js";
import { policyMethods } from "./policy/methods.js";
import { createTaruviServicesConfig } from "./query.js";
import { settingsMethods } from "./settings/methods.js";
import { storageMethods } from "./storage/methods.js";
import { userMethods } from "./users/methods.js";

export function createTaruviProvider<TQueryClient extends TaruviQueryClient>(
  client: Client,
  queryClient: TQueryClient,
) {
  const config = createTaruviServicesConfig(client);

  return {
    queryClient,
    database: databaseMethods(config, queryClient),
    storage: storageMethods(config, queryClient),
    users: userMethods(config, queryClient),
    policy: policyMethods(config),
    app: appMethods(config),
    settings: settingsMethods(config, queryClient),

    keys: config.keys,

    invalidate: {
      query: (queryKey: QueryKey) => invalidateTaruviQuery(queryClient, queryKey),
      database: () => invalidateTaruviDatabase(config.keys, queryClient),
      table: (table: string) => invalidateTaruviTable(config.keys, queryClient, table),
      lists: (table: string) => invalidateTaruviLists(config.keys, queryClient, table),
      record: (table: string, id: string | number) => invalidateTaruviRecord(config.keys, queryClient, table, id),
      storage: (bucket?: string) => invalidateTaruviStorage(config.keys, queryClient, bucket),
      users: () => invalidateTaruviUsers(config.keys, queryClient),
      settings: () => invalidateTaruviSettings(config.keys, queryClient),
    },

    errors: {
      describe: describeTaruviError,
    },
  };
}

export type TaruviProvider = ReturnType<typeof createTaruviProvider>;
