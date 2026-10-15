import { invalidateTaruviTable, refreshOnSuccess, type TaruviQueryClient } from "../cache.js";
import type { TaruviServicesConfig, WithoutConfig } from "../query.js";
import {
  countQuery,
  createEdgesMutation,
  createManyMutation,
  createMutation,
  deleteEdgesMutation,
  deleteFilteredMutation,
  deleteManyMutation,
  deleteMutation,
  edgesQuery,
  firstQuery,
  graphQuery,
  infiniteListQuery,
  listQuery,
  oneQuery,
  updateManyMutation,
  updateMutation,
  upsertMutation,
} from "./helpers.js";

export function databaseMethods(config: TaruviServicesConfig, queryClient: TaruviQueryClient) {
  const refreshTable = <T extends { mutationFn: (...args: any[]) => Promise<any> }>(
    mutation: T,
    tableName: string,
  ) =>
    refreshOnSuccess(mutation, () => invalidateTaruviTable(queryClient, tableName));

  return {
    list<T>(args: WithoutConfig<Parameters<typeof listQuery<T>>[0]>) {
      return listQuery<T>({ config, ...args });
    },
    many<T>(args: {
      tableName: string;
      ids: Array<string | number>;
      idColumn?: string;
      populate?: string[];
      populateAll?: boolean;
    }) {
      const idColumn = args.idColumn ?? "id";
      return listQuery<T>({
        config,
        tableName: args.tableName,
        filters: [{ field: idColumn, operator: "in", value: args.ids }],
        populate: args.populate,
        populateAll: args.populateAll,
        queryOptions: { enabled: args.tableName.length > 0 && args.ids.length > 0 },
      });
    },
    one<T>(args: WithoutConfig<Parameters<typeof oneQuery<T>>[0]>) {
      return oneQuery<T>({ config, ...args });
    },
    first<T>(args: WithoutConfig<Parameters<typeof firstQuery<T>>[0]>) {
      return firstQuery<T>({ config, ...args });
    },
    count(args: WithoutConfig<Parameters<typeof countQuery>[0]>) {
      return countQuery({ config, ...args });
    },
    infinite<T>(args: WithoutConfig<Parameters<typeof infiniteListQuery<T>>[0]>) {
      return infiniteListQuery<T>({ config, ...args });
    },
    graph<T>(args: WithoutConfig<Parameters<typeof graphQuery<T>>[0]>) {
      return graphQuery<T>({ config, ...args });
    },
    edges<T>(args: WithoutConfig<Parameters<typeof edgesQuery<T>>[0]>) {
      return edgesQuery<T>({ config, ...args });
    },
    create<T>(args: WithoutConfig<Parameters<typeof createMutation<T>>[0]>) {
      return refreshTable(createMutation<T>({ config, ...args }), args.tableName);
    },
    update<T>(args: WithoutConfig<Parameters<typeof updateMutation<T>>[0]>) {
      return refreshTable(updateMutation<T>({ config, ...args }), args.tableName);
    },
    delete(args: WithoutConfig<Parameters<typeof deleteMutation>[0]>) {
      return refreshTable(deleteMutation({ config, ...args }), args.tableName);
    },
    upsert<T>(args: WithoutConfig<Parameters<typeof upsertMutation<T>>[0]>) {
      return refreshTable(upsertMutation<T>({ config, ...args }), args.tableName);
    },
    createMany<T>(args: WithoutConfig<Parameters<typeof createManyMutation<T>>[0]>) {
      return refreshTable(createManyMutation<T>({ config, ...args }), args.tableName);
    },
    updateMany<T>(args: WithoutConfig<Parameters<typeof updateManyMutation<T>>[0]>) {
      return refreshTable(updateManyMutation<T>({ config, ...args }), args.tableName);
    },
    deleteMany(args: WithoutConfig<Parameters<typeof deleteManyMutation>[0]>) {
      return refreshTable(deleteManyMutation({ config, ...args }), args.tableName);
    },
    deleteFiltered(args: WithoutConfig<Parameters<typeof deleteFilteredMutation>[0]>) {
      return refreshTable(deleteFilteredMutation({ config, ...args }), args.tableName);
    },
    createEdges(args: WithoutConfig<Parameters<typeof createEdgesMutation>[0]>) {
      return refreshTable(createEdgesMutation({ config, ...args }), args.tableName);
    },
    deleteEdges(args: WithoutConfig<Parameters<typeof deleteEdgesMutation>[0]>) {
      return refreshTable(deleteEdgesMutation({ config, ...args }), args.tableName);
    },
  };
}
