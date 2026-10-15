import type { TaruviServicesConfig, WithoutConfig } from "../query.js";
import { allowedActionsQuery, checkResourcesQuery } from "./helpers.js";

export function policyMethods(config: TaruviServicesConfig) {
  return {
    allowed(args: WithoutConfig<Parameters<typeof allowedActionsQuery>[0]>) {
      return allowedActionsQuery({ config, ...args });
    },
    check(args: WithoutConfig<Parameters<typeof checkResourcesQuery>[0]>) {
      return checkResourcesQuery({ config, ...args });
    },
  };
}
