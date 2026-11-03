import type {
  StorageAccessLinkResponse,
  StorageBrowseFilters,
  StorageBrowseResponse,
  StorageDeleteBatchResponse,
  StorageFilters,
  StorageListResponse,
  StorageResponse,
  StorageUploadBatchResponse,
  TaruviResponse,
} from "@taruvi/sdk";
import { invalidateOn, invalidateTaruviStorage, type TaruviMutationContext, type TaruviQueryClient } from "../cache.js";
import {
  withEnabledOptions,
  withQuerySignal,
  serializeParams,
  type QueryOptions,
  type TaruviServicesConfig,
} from "../query.js";

export type TaruviRnFile = { uri: string; name: string; type: string };
export type TaruviUploadFile = File | TaruviRnFile;

function toSdkUploadFile(file: TaruviUploadFile): File {
  if (typeof File !== "function") return file as File;
  if (file instanceof File) return file;
  const part = new File([], file.name, { type: file.type });
  Object.defineProperty(part, "uri", { value: file.uri, enumerable: true });
  return part;
}

export function storageListQuery(args: {
  config: TaruviServicesConfig;
  bucket: string;
  filters?: StorageFilters;
  queryOptions?: QueryOptions;
}) {
  const { config, bucket, filters, queryOptions } = args;
  return {
    ...withEnabledOptions(bucket.length > 0, queryOptions),
    queryKey: config.keys.storage.list(bucket, serializeParams(filters ?? {})),
    queryFn: withQuerySignal(async () => {
      const storage = config.getStorage();
      let q = storage.from(bucket);
      if (filters) q = q.filter(filters);
      return q.execute<StorageListResponse>();
    }),
  };
}

export function storageBrowseQuery(args: {
  config: TaruviServicesConfig;
  bucket: string;
  filters?: StorageBrowseFilters;
  queryOptions?: QueryOptions;
}) {
  const { config, bucket, filters, queryOptions } = args;
  return {
    ...withEnabledOptions(bucket.length > 0, queryOptions),
    queryKey: config.keys.storage.browse(bucket, serializeParams(filters ?? {})),
    queryFn: withQuerySignal(() => config.getStorage().from(bucket).browse(filters).execute<StorageBrowseResponse>()),
  };
}

type StorageAccessArgs = {
  config: TaruviServicesConfig;
  bucket: string;
  path: string | null | undefined;
  queryOptions?: QueryOptions;
};

function storageAccessQuery(
  args: StorageAccessArgs,
  key: (bucket: string, path: string) => readonly unknown[],
  load: (bucket: string, path: string) => Promise<TaruviResponse<StorageAccessLinkResponse>>,
) {
  const { bucket, path, queryOptions } = args;
  return {
    ...withEnabledOptions(bucket.length > 0 && !!path, queryOptions),
    queryKey: key(bucket, path ?? ""),
    queryFn: withQuerySignal(() => load(bucket, String(path))),
  };
}

export function storageViewAccessQuery(args: StorageAccessArgs) {
  return storageAccessQuery(args, args.config.keys.storage.viewAccess, (bucket, path) =>
    args.config.getStorage().from(bucket).viewAccess(path).execute<TaruviResponse<StorageAccessLinkResponse>>(),
  );
}

export function storageEditAccessQuery(args: StorageAccessArgs) {
  return storageAccessQuery(args, args.config.keys.storage.editAccess, (bucket, path) =>
    args.config.getStorage().from(bucket).editAccess(path).execute<TaruviResponse<StorageAccessLinkResponse>>(),
  );
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
    queryKey: config.keys.storage.metadata(bucket, path ?? ""),
    queryFn: withQuerySignal(() =>
      config.getStorage().from(bucket).metadata(String(path)).execute<StorageResponse>()),
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
}, queryClient: TaruviQueryClient) {
  const { config, bucket } = args;
  return {
    mutationFn: async (input: StorageUploadVariables, context?: TaruviMutationContext) => {
      const storage = config.getStorage();
      const res = await storage
        .from(bucket)
        .upload({
          files: input.files.map(toSdkUploadFile),
          paths: input.paths,
          metadatas: input.metadatas ?? input.files.map(() => ({})),
        })
        .execute<StorageUploadBatchResponse>();
      const failed = res.data?.failed_count;
      if (typeof failed === "number" && failed > 0) {
        if (res.data.uploaded_count > 0) {
          await invalidateOn(queryClient, context?.client, (active) =>
            invalidateTaruviStorage(config.keys, active, bucket));
        }
        const reason = res.data.failed[0]?.error ?? "upload failed";
        throw new Error(`Upload failed (${failed}/${res.data.total ?? input.files.length}): ${reason}`, { cause: res });
      }
      return res;
    },
  };
}

export function storageDeleteMutation(args: {
  config: TaruviServicesConfig;
  bucket: string;
}, queryClient: TaruviQueryClient) {
  const { config, bucket } = args;
  return {
    mutationFn: async (paths: string[], context?: TaruviMutationContext) => {
      const res = await config.getStorage().from(bucket).delete(paths).execute<StorageDeleteBatchResponse>();
      if (res.status === "error" || res.data?.failed?.length) {
        if ((res.data?.deleted_count ?? 0) > 0) {
          await invalidateOn(queryClient, context?.client, (active) =>
            invalidateTaruviStorage(config.keys, active, bucket));
        }
        throw new Error(`Delete failed: ${res.data?.failed?.[0]?.error || res.message || "Unknown error"}`, { cause: res });
      }
      return res;
    },
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
