import type { GetAllowedActionsOptions, Resource, Resources } from "@taruvi/sdk";
import {
  withEnabledOptions,
  serializeParams,
  type QueryOptions,
  type TaruviServicesConfig,
} from "../query.js";

export type TaruviResourceRef = { kind: string; id: string; attr?: Record<string, unknown> };

export function allowedActionsQuery(args: {
  config: TaruviServicesConfig;
  resource: TaruviResourceRef;
  options?: GetAllowedActionsOptions;
  queryOptions?: QueryOptions;
}) {
  const { config, resource, options, queryOptions } = args;
  const subject: Resource = { kind: resource.kind, id: resource.id, attr: resource.attr ?? {} };
  return {
    ...withEnabledOptions(resource.kind.length > 0 && resource.id.length > 0, queryOptions),
    queryKey: config.keys.policy.allowed(serializeParams({ resource: subject, options })),
    queryFn: () => config.getPolicy().getAllowedActions(subject, options),
  };
}

export function checkResourcesQuery(args: {
  config: TaruviServicesConfig;
  resources: Resources;
  queryOptions?: QueryOptions;
}) {
  const { config, resources, queryOptions } = args;
  return {
    ...withEnabledOptions(resources.length > 0, queryOptions),
    queryKey: config.keys.policy.check(serializeParams(resources)),
    queryFn: () => config.getPolicy().checkResource(resources),
  };
}
