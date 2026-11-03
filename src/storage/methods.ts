import { invalidateTaruviStorage, refreshOnSuccess, type TaruviQueryClient } from "../cache.js";
import type { TaruviServicesConfig, WithoutConfig } from "../query.js";
import {
  storageBrowseQuery,
  storageDeleteMutation,
  storageEditAccessQuery,
  storageListQuery,
  storageMetadataQuery,
  storageUpdateMutation,
  storageUploadMutation,
  storageViewAccessQuery,
} from "./helpers.js";

export function storageMethods(config: TaruviServicesConfig, queryClient: TaruviQueryClient) {
  const refreshBucket = <T extends { mutationFn: (...args: any[]) => Promise<any> }>(
    mutation: T,
    bucket: string,
  ) =>
    refreshOnSuccess(
      mutation,
      (active) => invalidateTaruviStorage(config.keys, active, bucket),
      queryClient,
    );

  return {
    list(args: WithoutConfig<Parameters<typeof storageListQuery>[0]>) {
      return storageListQuery({ config, ...args });
    },
    metadata(args: WithoutConfig<Parameters<typeof storageMetadataQuery>[0]>) {
      return storageMetadataQuery({ config, ...args });
    },
    browse(args: WithoutConfig<Parameters<typeof storageBrowseQuery>[0]>) {
      return storageBrowseQuery({ config, ...args });
    },
    viewAccess(args: WithoutConfig<Parameters<typeof storageViewAccessQuery>[0]>) {
      return storageViewAccessQuery({ config, ...args });
    },
    editAccess(args: WithoutConfig<Parameters<typeof storageEditAccessQuery>[0]>) {
      return storageEditAccessQuery({ config, ...args });
    },
    upload(args: WithoutConfig<Parameters<typeof storageUploadMutation>[0]>) {
      return refreshBucket(
        storageUploadMutation({ config, ...args }, queryClient),
        args.bucket,
      );
    },
    delete(args: WithoutConfig<Parameters<typeof storageDeleteMutation>[0]>) {
      return refreshBucket(
        storageDeleteMutation({ config, ...args }, queryClient),
        args.bucket,
      );
    },
    update(args: WithoutConfig<Parameters<typeof storageUpdateMutation>[0]>) {
      return refreshBucket(storageUpdateMutation({ config, ...args }), args.bucket);
    },
  };
}
