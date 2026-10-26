import { invalidateTaruviStorage, refreshOnSuccess, type TaruviQueryClient } from "../cache.js";
import type { TaruviServicesConfig, WithoutConfig } from "../query.js";
import {
  storageDeleteMutation,
  storageListQuery,
  storageMetadataQuery,
  storageUpdateMutation,
  storageUploadMutation,
} from "./helpers.js";

export function storageMethods(config: TaruviServicesConfig, queryClient: TaruviQueryClient) {
  const refreshBucket = <T extends { mutationFn: (...args: any[]) => Promise<any> }>(
    mutation: T,
    bucket: string,
  ) => refreshOnSuccess(mutation, () => invalidateTaruviStorage(config.keys, queryClient, bucket));

  return {
    list(args: WithoutConfig<Parameters<typeof storageListQuery>[0]>) {
      return storageListQuery({ config, ...args });
    },
    metadata(args: WithoutConfig<Parameters<typeof storageMetadataQuery>[0]>) {
      return storageMetadataQuery({ config, ...args });
    },
    upload(args: WithoutConfig<Parameters<typeof storageUploadMutation>[0]>) {
      return refreshBucket(storageUploadMutation({ config, ...args }), args.bucket);
    },
    delete(args: WithoutConfig<Parameters<typeof storageDeleteMutation>[0]>) {
      return refreshBucket(storageDeleteMutation({ config, ...args }), args.bucket);
    },
    update(args: WithoutConfig<Parameters<typeof storageUpdateMutation>[0]>) {
      return refreshBucket(storageUpdateMutation({ config, ...args }), args.bucket);
    },
  };
}
