import {
  withEnabledOptions,
  withQuerySignal,
  type QueryOptions,
  type TaruviServicesConfig,
} from "../query.js";

export function siteSettingsQuery<T = unknown>(args: {
  config: TaruviServicesConfig;
  queryOptions?: QueryOptions;
}) {
  return {
    ...withEnabledOptions(true, args.queryOptions),
    queryKey: args.config.keys.settings.site(),
    queryFn: withQuerySignal(() => args.config.getSettings().get<T>()),
  };
}

export function userAttributesQuery<T = unknown>(args: {
  config: TaruviServicesConfig;
  queryOptions?: QueryOptions;
}) {
  return {
    ...withEnabledOptions(true, args.queryOptions),
    queryKey: args.config.keys.settings.userAttributes(),
    queryFn: withQuerySignal(() => args.config.getSettings().getUserAttributes<T>()),
  };
}
