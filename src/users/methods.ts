import { invalidateTaruviUsers, refreshOnSuccess, type TaruviQueryClient } from "../cache.js";
import type { TaruviServicesConfig, WithoutConfig } from "../query.js";
import {
  assignRolesMutation,
  createUserMutation,
  currentUserQuery,
  deleteUserMutation,
  revokeRolesMutation,
  updatePreferencesMutation,
  updateUserMutation,
  userAppsQuery,
  userPreferencesQuery,
  userQuery,
  usersListQuery,
} from "./helpers.js";

export function userMethods(config: TaruviServicesConfig, queryClient: TaruviQueryClient) {
  const refreshUsers = <T extends { mutationFn: (...args: any[]) => Promise<any> }>(mutation: T) =>
    refreshOnSuccess(mutation, () => invalidateTaruviUsers(config.keys, queryClient));

  return {
    current(args: WithoutConfig<Parameters<typeof currentUserQuery>[0]>) {
      return currentUserQuery({ config, ...args });
    },
    list(args?: WithoutConfig<Parameters<typeof usersListQuery>[0]>) {
      return usersListQuery({ config, ...args });
    },
    one(args: WithoutConfig<Parameters<typeof userQuery>[0]>) {
      return userQuery({ config, ...args });
    },
    preferences(args?: WithoutConfig<Parameters<typeof userPreferencesQuery>[0]>) {
      return userPreferencesQuery({ config, ...args });
    },
    apps(args: WithoutConfig<Parameters<typeof userAppsQuery>[0]>) {
      return userAppsQuery({ config, ...args });
    },
    update() {
      return refreshUsers(updateUserMutation({ config }));
    },
    updatePreferences() {
      return refreshUsers(updatePreferencesMutation({ config }));
    },
    create() {
      return refreshUsers(createUserMutation({ config }));
    },
    delete() {
      return refreshUsers(deleteUserMutation({ config }));
    },
    assignRoles() {
      return refreshUsers(assignRolesMutation({ config }));
    },
    revokeRoles() {
      return refreshUsers(revokeRolesMutation({ config }));
    },
  };
}
