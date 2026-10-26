import { invalidateTaruviSettings, refreshOnSuccess, type TaruviQueryClient } from "../cache.js";
import type { TaruviServicesConfig, WithoutConfig } from "../query.js";
import { siteSettingsQuery, userAttributesQuery } from "./helpers.js";

export function settingsMethods(config: TaruviServicesConfig, queryClient: TaruviQueryClient) {
  return {
    site<T = unknown>(args?: WithoutConfig<Parameters<typeof siteSettingsQuery<T>>[0]>) {
      return siteSettingsQuery<T>({ config, ...args });
    },
    userAttributes<T = unknown>(args?: WithoutConfig<Parameters<typeof userAttributesQuery<T>>[0]>) {
      return userAttributesQuery<T>({ config, ...args });
    },
    updateUserAttributes<T = unknown>() {
      return refreshOnSuccess(
        {
          mutationFn: (schema: Record<string, unknown>) =>
            config.getSettings().updateUserAttributes<T>(schema),
        },
        () => invalidateTaruviSettings(config.keys, queryClient),
      );
    },
  };
}
