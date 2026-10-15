import type { TaruviServicesConfig, WithoutConfig } from "../query.js";
import { appRolesQuery, appSettingsQuery } from "./helpers.js";

export function appMethods(config: TaruviServicesConfig) {
  return {
    roles<T = unknown>(args?: WithoutConfig<Parameters<typeof appRolesQuery<T>>[0]>) {
      return appRolesQuery<T>({ config, ...args });
    },
    settings<T = unknown>(args?: WithoutConfig<Parameters<typeof appSettingsQuery<T>>[0]>) {
      return appSettingsQuery<T>({ config, ...args });
    },
  };
}
