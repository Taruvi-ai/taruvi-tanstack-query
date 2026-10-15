import type { User } from "@taruvi/sdk";
import {
  withEnabledOptions,
  serializeParams,
  taruviQueryKeys,
  type QueryOptions,
  type TaruviServicesConfig,
} from "../query.js";

export function currentUserQuery(args: {
  config: TaruviServicesConfig;
  params?: Parameters<User["getUser"]>;
  queryOptions?: QueryOptions;
}) {
  return {
    ...withEnabledOptions(args.params != null, args.queryOptions),
    queryKey: taruviQueryKeys.users.current(serializeParams(args.params ?? [])),
    queryFn: () => args.config.getUsers().getUser(...args.params!),
  };
}

export function usersListQuery(args: {
  config: TaruviServicesConfig;
  params?: Parameters<User["list"]>;
  queryOptions?: QueryOptions;
}) {
  const params = args.params ?? ([] as Parameters<User["list"]>);
  return {
    ...args.queryOptions,
    queryKey: taruviQueryKeys.users.list(serializeParams(params)),
    queryFn: () => args.config.getUsers().list(...params),
  };
}

export function userQuery(args: {
  config: TaruviServicesConfig;
  params?: Parameters<User["getUser"]>;
  queryOptions?: QueryOptions;
}) {
  return {
    ...withEnabledOptions(args.params != null, args.queryOptions),
    queryKey: taruviQueryKeys.users.one(serializeParams(args.params ?? [])),
    queryFn: () => args.config.getUsers().getUser(...args.params!),
  };
}

export function userPreferencesQuery(args: {
  config: TaruviServicesConfig;
  queryOptions?: QueryOptions;
}) {
  return {
    ...args.queryOptions,
    queryKey: taruviQueryKeys.users.preferences(),
    queryFn: () => args.config.getUsers().getPreferences(),
  };
}

export function userAppsQuery(args: {
  config: TaruviServicesConfig;
  params?: Parameters<User["getUserApps"]>;
  queryOptions?: QueryOptions;
}) {
  return {
    ...withEnabledOptions(args.params != null, args.queryOptions),
    queryKey: taruviQueryKeys.users.apps(serializeParams(args.params ?? [])),
    queryFn: () => args.config.getUsers().getUserApps(...args.params!),
  };
}

export function updateUserMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (params: Parameters<User["updateUser"]>) =>
      args.config.getUsers().updateUser(...params),
  };
}

export function updatePreferencesMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (params: Parameters<User["updatePreferences"]>) =>
      args.config.getUsers().updatePreferences(...params),
  };
}

export function createUserMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (params: Parameters<User["createUser"]>) => args.config.getUsers().createUser(...params),
  };
}

export function deleteUserMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (params: Parameters<User["deleteUser"]>) => args.config.getUsers().deleteUser(...params),
  };
}

export function assignRolesMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (params: Parameters<User["assignRoles"]>) => args.config.getUsers().assignRoles(...params),
  };
}

export function revokeRolesMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (params: Parameters<User["revokeRoles"]>) => args.config.getUsers().revokeRoles(...params),
  };
}
