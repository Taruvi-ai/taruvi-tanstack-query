import { Analytics, Client, type AnalyticsResponse } from "@taruvi/sdk";

export function analyticsExecute<T = unknown>(
  client: Client,
  args: { querySlug: string; params?: Record<string, unknown> },
): Promise<AnalyticsResponse<T>> {
  return new Analytics(client).execute<T>(args.querySlug, { params: args.params });
}
