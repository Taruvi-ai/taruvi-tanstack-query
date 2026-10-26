import type { Client } from "@taruvi/sdk";
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

export function createTaruviProvider(client: Client, queryClient: TaruviQueryClient) {
  const config = createTaruviServicesConfig(client);

  return {
    database: databaseMethods(config, queryClient),
    storage: storageMethods(config, queryClient),
    users: userMethods(config, queryClient),
    policy: policyMethods(config),
    app: appMethods(config),
    settings: settingsMethods(config, queryClient),

    keys: config.keys,

    invalidate: {
      query: invalidateTaruviQuery,
      database: (qc: TaruviQueryClient) => invalidateTaruviDatabase(config.keys, qc),
      table: (qc: TaruviQueryClient, table: string) => invalidateTaruviTable(config.keys, qc, table),
      lists: (qc: TaruviQueryClient, table: string) => invalidateTaruviLists(config.keys, qc, table),
      record: (qc: TaruviQueryClient, table: string, id: string | number) =>
        invalidateTaruviRecord(config.keys, qc, table, id),
      storage: (qc: TaruviQueryClient, bucket?: string) => invalidateTaruviStorage(config.keys, qc, bucket),
      users: (qc: TaruviQueryClient) => invalidateTaruviUsers(config.keys, qc),
      settings: (qc: TaruviQueryClient) => invalidateTaruviSettings(config.keys, qc),
    },

    errors: {
      describe: describeTaruviError,
    },
  };
}

export type TaruviProvider = ReturnType<typeof createTaruviProvider>;
