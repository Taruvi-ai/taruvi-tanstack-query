import {
  taruviQueryKeys,
  type QueryOptions,
  type TaruviServicesConfig,
} from "../query.js";

export function siteSettingsQuery<T = unknown>(args: {
  config: TaruviServicesConfig;
  queryOptions?: QueryOptions;
}) {
  return {
    ...args.queryOptions,
    queryKey: taruviQueryKeys.settings.site(),
    queryFn: () => args.config.getSettings().get<T>(),
  };
}

export function userAttributesQuery<T = unknown>(args: {
  config: TaruviServicesConfig;
  queryOptions?: QueryOptions;
}) {
  return {
    ...args.queryOptions,
    queryKey: taruviQueryKeys.settings.userAttributes(),
    queryFn: () => args.config.getSettings().getUserAttributes<T>(),
  };
}
