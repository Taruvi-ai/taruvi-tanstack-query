import { invalidateTaruviRecord, invalidateTaruviTable, refreshOnSuccess, type TaruviQueryClient } from "../cache.js";
import type { QueryOptions, TaruviServicesConfig, WithoutConfig } from "../query.js";
import { patchCachedRecord, rowsFromResult, withRowEdit, writeCachedRows } from "./optimistic.js";
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
  type UpdateVariables,
} from "./helpers.js";

export function databaseMethods(config: TaruviServicesConfig, queryClient: TaruviQueryClient) {
  const refreshRow = <T extends { mutationFn: (...args: any[]) => Promise<any> }, V>(
    mutation: T,
    tableName: string,
    edit: (variables: V) => { id: string | number; patch: Record<string, unknown> | null },
  ) =>
    withRowEdit(
      refreshOnSuccess(
        mutation,
        (active, variables, result) => {
          const { id, patch } = edit(variables as V);
          const server = rowsFromResult(result).find((row) => String(row.id) === String(id));
          if (server) patchCachedRecord(active, config.keys, tableName, id, server);
          else if (patch === null) {
            void active.invalidateQueries({ queryKey: [...config.keys.table.all(tableName), "count"] });
          }
          return invalidateTaruviRecord(config.keys, active, tableName, id);
        },
        queryClient,
      ),
      { config, queryClient, tableName, edit },
    );
  const writeRows = <T extends { mutationFn: (...args: any[]) => Promise<any> }>(mutation: T, tableName: string) =>
    refreshOnSuccess(
      mutation,
      (active, _variables, result) => {
        writeCachedRows(active, config.keys, tableName, rowsFromResult(result));
        return Promise.resolve();
      },
      queryClient,
    );

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
      queryOptions?: QueryOptions;
    }) {
      const idColumn = args.idColumn ?? "id";
      return listQuery<T>({
        config,
        tableName: args.tableName,
        filters: [{ field: idColumn, operator: "in", value: args.ids }],
        populate: args.populate,
        populateAll: args.populateAll,
        queryOptions: {
          ...args.queryOptions,
          enabled: args.ids.length > 0 && (args.queryOptions?.enabled ?? true),
        },
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
      return writeRows(createMutation<T>({ config, ...args }), args.tableName);
    },
    update<T>(args: WithoutConfig<Parameters<typeof updateMutation<T>>[0]>) {
      return refreshRow(updateMutation<T>({ config, ...args }), args.tableName, (variables: UpdateVariables<T>) => ({
        id: variables.id,
        patch: variables.data as Record<string, unknown>,
      }));
    },
    delete(args: WithoutConfig<Parameters<typeof deleteMutation>[0]>) {
      return refreshRow(deleteMutation({ config, ...args }), args.tableName, (id: string | number) => ({
        id,
        patch: null,
      }));
    },
    upsert<T>(args: WithoutConfig<Parameters<typeof upsertMutation<T>>[0]>) {
      return writeRows(upsertMutation<T>({ config, ...args }), args.tableName);
    },
    createMany<T>(args: WithoutConfig<Parameters<typeof createManyMutation<T>>[0]>) {
      return writeRows(createManyMutation<T>({ config, ...args }), args.tableName);
    },
    updateMany<T>(args: WithoutConfig<Parameters<typeof updateManyMutation<T>>[0]>) {
      return refreshOnSuccess(
        updateManyMutation<T>({ config, ...args }),
        (active, variables) => {
          for (const item of variables as Array<{ id: string | number } & Record<string, unknown>>) {
            patchCachedRecord(active, config.keys, args.tableName, item.id, item);
          }
          return Promise.resolve();
        },
        queryClient,
      );
    },
    deleteMany(args: WithoutConfig<Parameters<typeof deleteManyMutation>[0]>) {
      return refreshOnSuccess(
        deleteManyMutation({ config, ...args }),
        (active, variables) => {
          for (const id of variables as Array<string | number>) {
            patchCachedRecord(active, config.keys, args.tableName, id, null);
          }
          return Promise.resolve();
        },
        queryClient,
      );
    },
    deleteFiltered(args: WithoutConfig<Parameters<typeof deleteFilteredMutation>[0]>) {
      return refreshOnSuccess(
        deleteFilteredMutation({ config, ...args }),
        (active) => invalidateTaruviTable(config.keys, active, args.tableName),
        queryClient,
      );
    },
    createEdges(args: WithoutConfig<Parameters<typeof createEdgesMutation>[0]>) {
      return refreshOnSuccess(
        createEdgesMutation({ config, ...args }),
        async (active) => {
          await active.invalidateQueries({ queryKey: config.keys.table.edges(args.tableName) });
          await active.invalidateQueries({ queryKey: [...config.keys.table.all(args.tableName), "graph"] });
        },
        queryClient,
      );
    },
    deleteEdges(args: WithoutConfig<Parameters<typeof deleteEdgesMutation>[0]>) {
      return refreshOnSuccess(
        deleteEdgesMutation({ config, ...args }),
        async (active) => {
          await active.invalidateQueries({ queryKey: config.keys.table.edges(args.tableName) });
          await active.invalidateQueries({ queryKey: [...config.keys.table.all(args.tableName), "graph"] });
        },
        queryClient,
      );
    },
  };
}
