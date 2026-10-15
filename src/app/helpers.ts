import type { App } from "@taruvi/sdk";
import {
  taruviQueryKeys,
  type QueryOptions,
  type TaruviServicesConfig,
} from "../query.js";

type AppQueryArgs = {
  config: TaruviServicesConfig;
  queryOptions?: QueryOptions;
};

function appReadQuery<T>(
  args: AppQueryArgs,
  queryKey: ReturnType<typeof taruviQueryKeys.app.roles>,
  read: (app: App) => Promise<unknown>,
) {
  return {
    ...args.queryOptions,
    queryKey,
    queryFn: () => read(args.config.getApp()) as Promise<T>,
  };
}

export function appRolesQuery<T = unknown>(args: AppQueryArgs) {
  return appReadQuery<T>(args, taruviQueryKeys.app.roles(), (app) => app.roles().execute());
}

export function appSettingsQuery<T = unknown>(args: AppQueryArgs) {
  return appReadQuery<T>(args, taruviQueryKeys.app.settings(), (app) => app.settings().execute());
}
