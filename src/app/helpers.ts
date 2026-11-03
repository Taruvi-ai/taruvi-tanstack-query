import type { App } from "@taruvi/sdk";
import {
  taruviQueryKeys,
  withEnabledOptions,
  withQuerySignal,
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
    ...withEnabledOptions(true, args.queryOptions),
    queryKey,
    queryFn: withQuerySignal(() => read(args.config.getApp()) as Promise<T>),
  };
}

export function appRolesQuery<T = unknown>(args: AppQueryArgs) {
  return appReadQuery<T>(args, args.config.keys.app.roles(), (app) => app.roles().execute());
}

export function appSettingsQuery<T = unknown>(args: AppQueryArgs) {
  return appReadQuery<T>(args, args.config.keys.app.settings(), (app) => app.settings().execute());
}
