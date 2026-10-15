import type {
  StorageDeleteBatchResponse,
  StorageFilters,
  StorageListResponse,
  StorageResponse,
  StorageUploadBatchResponse,
} from "@taruvi/sdk";
import {
  withEnabledOptions,
  serializeParams,
  taruviQueryKeys,
  type QueryOptions,
  type TaruviServicesConfig,
} from "../query.js";

export type TaruviRnFile = { uri: string; name: string; type: string };
export type TaruviUploadFile = File | TaruviRnFile;

export function storageListQuery(args: {
  config: TaruviServicesConfig;
  bucket: string;
  filters?: StorageFilters;
  queryOptions?: QueryOptions;
}) {
  const { config, bucket, filters, queryOptions } = args;
  return {
    ...withEnabledOptions(bucket.length > 0, queryOptions),
    queryKey: taruviQueryKeys.storage.list(bucket, serializeParams(filters ?? {})),
    queryFn: async () => {
      const storage = config.getStorage();
      let q = storage.from(bucket);
      if (filters) q = q.filter(filters);
      return q.execute<StorageListResponse>();
    },
  };
}

export function storageMetadataQuery(args: {
  config: TaruviServicesConfig;
  bucket: string;
  path: string | null | undefined;
  queryOptions?: QueryOptions;
}) {
  const { config, bucket, path, queryOptions } = args;
  return {
    ...withEnabledOptions(bucket.length > 0 && !!path, queryOptions),
    queryKey: taruviQueryKeys.storage.metadata(bucket, path ?? ""),
    queryFn: () =>
      config.getStorage().from(bucket).metadata(String(path)).execute<StorageResponse>(),
  };
}

export type StorageUploadVariables = {
  files: TaruviUploadFile[];
  paths: string[];
  metadatas?: object[];
};

export function storageUploadMutation(args: {
  config: TaruviServicesConfig;
  bucket: string;
}) {
  const { config, bucket } = args;
  return {
    mutationFn: async (input: StorageUploadVariables) => {
      const storage = config.getStorage();
      const res = await storage
        .from(bucket)
        .upload({
          files: input.files as File[],
          paths: input.paths,
          metadatas: input.metadatas ?? input.files.map(() => ({})),
        })
        .execute<StorageUploadBatchResponse>();
      const failed = res.data?.failed_count;
      if (typeof failed === "number" && failed > 0) {
        const reason = res.data.failed[0]?.error ?? "upload failed";
        throw new Error(`Upload failed (${failed}/${res.data.total ?? input.files.length}): ${reason}`);
      }
      return res;
    },
  };
}

export function storageDeleteMutation(args: {
  config: TaruviServicesConfig;
  bucket: string;
}) {
  const { config, bucket } = args;
  return {
    mutationFn: (paths: string[]) =>
      config.getStorage().from(bucket).delete(paths).execute<StorageDeleteBatchResponse>(),
  };
}

export type StorageUpdateVariables = { path: string; body: object };

export function storageUpdateMutation(args: {
  config: TaruviServicesConfig;
  bucket: string;
}) {
  const { config, bucket } = args;
  return {
    mutationFn: ({ path, body }: StorageUpdateVariables) =>
      config.getStorage().from(bucket).update(path, body).execute<StorageResponse>(),
  };
}
