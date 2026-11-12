import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ListsService, type NodeListPublic, NodesService } from "@/client"
import { computeMidpointPosition } from "./treeUtils"
import type { OutlinerNode } from "./types"

export function getListQueryOptions(listId: string) {
  return {
    queryFn: () => ListsService.readList({ id: listId }),
    queryKey: ["lists", listId],
  }
}

export interface CreateNodeInput {
  id: string
  content: string
  parent_id?: string | null
  position?: string
  level?: number
}

export interface UpdateNodeInput {
  id: string
  content?: string
  parent_id?: string | null
  level?: number
}

export interface ReorderNodeInput {
  id: string
  before_id?: string
  after_id?: string
}

export function useOutlinerMutations(listId: string) {
  const queryClient = useQueryClient()
  const queryKey = ["lists", listId]

  const createMutation = useMutation({
    mutationFn: (data: CreateNodeInput) =>
      NodesService.createNode({
        nodelistId: listId,
        requestBody: {
          id: data.id,
          content: data.content,
          parent_id: data.parent_id ?? null,
          position: data.position,
        },
      }),
    onMutate: async (newNode) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NodeListPublic>(queryKey)

      queryClient.setQueryData<NodeListPublic>(queryKey, (old) => {
        if (!old) return old
        const existing = (old.nodes ?? []).filter(
          (n): n is NonNullable<typeof n> => Boolean(n),
        )
        const optimisticNode: OutlinerNode = {
          id: newNode.id,
          nodelist_id: listId,
          content: newNode.content,
          parent_id: newNode.parent_id ?? null,
          level: newNode.level ?? 0,
          path: newNode.id.replace(/-/g, ""),
          position: newNode.position ?? "1000",
        }
        return {
          ...old,
          nodes: [...existing, optimisticNode] as NodeListPublic["nodes"],
        }
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateNodeInput) =>
      NodesService.patchNode({
        id: data.id,
        requestBody: {
          content: data.content,
          parent_id: data.parent_id,
          level: data.level,
        },
      }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NodeListPublic>(queryKey)

      queryClient.setQueryData<NodeListPublic>(queryKey, (old) => {
        if (!old?.nodes) return old
        const nodes = old.nodes.filter((n): n is NonNullable<typeof n> =>
          Boolean(n),
        )
        const target = nodes.find((n) => n.id === patch.id)
        if (!target) return old

        const levelDiff =
          patch.level !== undefined ? patch.level - target.level : 0
        const targetPrefix = `${target.path}.`

        const updatedNodes = nodes.map((n) => {
          if (n.id === patch.id) {
            return {
              ...n,
              content: patch.content ?? n.content,
              parent_id:
                patch.parent_id !== undefined ? patch.parent_id : n.parent_id,
              level: patch.level ?? n.level,
            }
          }
          if (levelDiff !== 0 && String(n.path).startsWith(targetPrefix)) {
            return {
              ...n,
              level: Math.max(0, n.level + levelDiff),
            }
          }
          return n
        })

        return {
          ...old,
          nodes: updatedNodes as NodeListPublic["nodes"],
        }
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (data: ReorderNodeInput) =>
      NodesService.reorderNode({
        id: data.id,
        beforeId: data.before_id,
        afterId: data.after_id,
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NodeListPublic>(queryKey)

      queryClient.setQueryData<NodeListPublic>(queryKey, (old) => {
        if (!old?.nodes) return old
        const nodes = old.nodes.filter((n): n is NonNullable<typeof n> =>
          Boolean(n),
        )
        const beforeNode = vars.before_id
          ? nodes.find((n) => n.id === vars.before_id)
          : undefined
        const afterNode = vars.after_id
          ? nodes.find((n) => n.id === vars.after_id)
          : undefined

        const nextPos = computeMidpointPosition(
          afterNode ? String(afterNode.position) : undefined,
          beforeNode ? String(beforeNode.position) : undefined,
        )

        return {
          ...old,
          nodes: nodes.map((n) =>
            n.id === vars.id ? { ...n, position: nextPos } : n,
          ) as NodeListPublic["nodes"],
        }
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => NodesService.deleteNode({ id }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<NodeListPublic>(queryKey)

      queryClient.setQueryData<NodeListPublic>(queryKey, (old) => {
        if (!old?.nodes) return old
        const nodes = old.nodes.filter((n): n is NonNullable<typeof n> =>
          Boolean(n),
        )
        const target = nodes.find((n) => n.id === id)
        if (!target) return old
        const prefix = `${target.path}.`

        return {
          ...old,
          nodes: nodes.filter(
            (n) => n.id !== id && !String(n.path).startsWith(prefix),
          ) as NodeListPublic["nodes"],
        }
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    createMutation,
    updateMutation,
    reorderMutation,
    deleteMutation,
  }
}
