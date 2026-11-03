import type {
  AssignRolesRequest,
  RevokeRolesRequest,
  User,
  UserCreateRequest,
  UserPreferencesUpdate,
  UserUpdateRequest,
} from "@taruvi/sdk";
import {
  withEnabledOptions,
  withQuerySignal,
  serializeParams,
  type QueryOptions,
  type TaruviServicesConfig,
} from "../query.js";

export function currentUserQuery(args: {
  config: TaruviServicesConfig;
  queryOptions?: QueryOptions;
}) {
  return {
    ...withEnabledOptions(true, args.queryOptions),
    queryKey: args.config.keys.users.current(),
    queryFn: withQuerySignal(() => args.config.getAuth().getCurrentUser()),
  };
}

export function usersListQuery(args: {
  config: TaruviServicesConfig;
  params?: Parameters<User["list"]>;
  queryOptions?: QueryOptions;
}) {
  const params = args.params ?? ([] as Parameters<User["list"]>);
  return {
    ...withEnabledOptions(true, args.queryOptions),
    queryKey: args.config.keys.users.list(serializeParams(params)),
    queryFn: withQuerySignal(() => args.config.getUsers().list(...params)),
  };
}

export function userQuery(args: {
  config: TaruviServicesConfig;
  params?: Parameters<User["getUser"]>;
  queryOptions?: QueryOptions;
}) {
  return {
    ...withEnabledOptions(args.params != null, args.queryOptions),
    queryKey: args.config.keys.users.one(serializeParams(args.params ?? [])),
    queryFn: withQuerySignal(() => args.config.getUsers().getUser(...args.params!)),
  };
}

export function userPreferencesQuery(args: {
  config: TaruviServicesConfig;
  queryOptions?: QueryOptions;
}) {
  return {
    ...withEnabledOptions(true, args.queryOptions),
    queryKey: args.config.keys.users.preferences(),
    queryFn: withQuerySignal(() => args.config.getUsers().getPreferences()),
  };
}

export function userAppsQuery(args: {
  config: TaruviServicesConfig;
  params?: Parameters<User["getUserApps"]>;
  queryOptions?: QueryOptions;
}) {
  return {
    ...withEnabledOptions(args.params != null, args.queryOptions),
    queryKey: args.config.keys.users.apps(serializeParams(args.params ?? [])),
    queryFn: withQuerySignal(() => args.config.getUsers().getUserApps(...args.params!)),
  };
}

export function updateUserMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: ({ username, data }: { username: string; data: UserUpdateRequest }) =>
      args.config.getUsers().updateUser(username, data),
  };
}

export function updatePreferencesMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (data: UserPreferencesUpdate) =>
      args.config.getUsers().updatePreferences(data),
  };
}

export function createUserMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (data: UserCreateRequest) => args.config.getUsers().createUser(data),
  };
}

export function deleteUserMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (username: string) => args.config.getUsers().deleteUser(username),
  };
}

export function assignRolesMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (request: AssignRolesRequest) => args.config.getUsers().assignRoles(request),
  };
}

export function revokeRolesMutation(args: {
  config: TaruviServicesConfig;
}) {
  return {
    mutationFn: (request: RevokeRolesRequest) => args.config.getUsers().revokeRoles(request),
  };
}
