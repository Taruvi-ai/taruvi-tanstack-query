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

    invalidate: {
      query: invalidateTaruviQuery,
      database: invalidateTaruviDatabase,
      table: invalidateTaruviTable,
      lists: invalidateTaruviLists,
      record: invalidateTaruviRecord,
      storage: invalidateTaruviStorage,
      users: invalidateTaruviUsers,
      settings: invalidateTaruviSettings,
    },

    errors: {
      describe: describeTaruviError,
    },
  };
}

export type TaruviProvider = ReturnType<typeof createTaruviProvider>;
