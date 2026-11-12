import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { NodeRow } from "@/components/Outliner/NodeRow"
import { OutlinerBreadcrumbs } from "@/components/Outliner/OutlinerBreadcrumbs"
import {
  buildTree,
  computeMidpointPosition,
  flattenVisibleTree,
  getBreadcrumbs,
} from "@/components/Outliner/treeUtils"
import type { OutlinerNode } from "@/components/Outliner/types"
import {
  getListQueryOptions,
  useOutlinerMutations,
} from "@/components/Outliner/useOutlinerMutations"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_layout/lists_/$listId")({
  component: ListDetail,
})

function ListDetail() {
  const { listId } = Route.useParams()
  return (
    <Suspense
      fallback={
        <div className="p-2 md:p-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-4 w-full mb-8" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <ListDetailContent listId={listId} />
    </Suspense>
  )
}

function ListDetailContent({ listId }: { listId: string }) {
  const { resolvedTheme } = useTheme()
  const { data: list } = useSuspenseQuery(getListQueryOptions(listId))
  const navigate = useNavigate()

  const { createMutation, updateMutation, reorderMutation, deleteMutation } =
    useOutlinerMutations(listId)

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [zoomRootId, setZoomRootId] = useState<string | null>(null)
  const [lastDeletedNode, setLastDeletedNode] = useState<OutlinerNode | null>(
    null,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const { roots, nodeMap, childrenMap } = useMemo(
    () => buildTree((list.nodes ?? []) as OutlinerNode[], zoomRootId),
    [list.nodes, zoomRootId],
  )

  const visibleNodes = useMemo(
    () => flattenVisibleTree(roots, collapsedIds),
    [roots, collapsedIds],
  )

  const visibleIds = useMemo(
    () => visibleNodes.map((item) => item.node.id),
    [visibleNodes],
  )

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(nodeMap, zoomRootId),
    [nodeMap, zoomRootId],
  )

  const handleUndoDelete = useCallback(() => {
    if (!lastDeletedNode) return
    createMutation.mutate({
      id: lastDeletedNode.id,
      content: lastDeletedNode.content,
      parent_id: lastDeletedNode.parent_id ?? null,
      position: lastDeletedNode.position,
      level: lastDeletedNode.level,
    })
    setLastDeletedNode(null)
  }, [lastDeletedNode, createMutation])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !editingId) {
        e.preventDefault()
        handleUndoDelete()
        return
      }
      if (e.key === "Escape" && !editingId && zoomRootId) {
        e.preventDefault()
        setZoomRootId(null)
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [handleUndoDelete, editingId, zoomRootId])

  const handleStartEdit = useCallback((node: OutlinerNode) => {
    setEditingId(node.id)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  const handleCommitContent = useCallback(
    (node: OutlinerNode, content: string) => {
      if (content !== node.content) {
        updateMutation.mutate({ id: node.id, content })
      }
    },
    [updateMutation],
  )

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleIndent = useCallback(
    (node: OutlinerNode, currentDraft: string) => {
      handleCommitContent(node, currentDraft)
      const siblings = childrenMap.get(node.parent_id ?? null) ?? []
      const idx = siblings.findIndex((s) => s.id === node.id)
      if (idx <= 0) return

      const prevSibling = siblings[idx - 1]
      setCollapsedIds((prev) => {
        if (!prev.has(prevSibling.id)) return prev
        const next = new Set(prev)
        next.delete(prevSibling.id)
        return next
      })

      updateMutation.mutate({
        id: node.id,
        parent_id: prevSibling.id,
        level: prevSibling.level + 1,
      })
    },
    [childrenMap, handleCommitContent, updateMutation],
  )

  const handleOutdent = useCallback(
    (node: OutlinerNode, currentDraft: string) => {
      handleCommitContent(node, currentDraft)
      if (!node.parent_id) return
      if (zoomRootId && node.parent_id === zoomRootId) return

      const parent = nodeMap.get(node.parent_id)
      const newParentId = parent?.parent_id ?? null
      const newLevel = Math.max(0, (node.level || 0) - 1)

      updateMutation.mutate({
        id: node.id,
        parent_id: newParentId,
        level: newLevel,
      })
    },
    [nodeMap, zoomRootId, handleCommitContent, updateMutation],
  )

  const handleAddSibling = useCallback(
    (node: OutlinerNode, currentDraft: string) => {
      handleCommitContent(node, currentDraft)
      const siblings = childrenMap.get(node.parent_id ?? null) ?? []
      const idx = siblings.findIndex((s) => s.id === node.id)
      const nextSibling =
        idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : undefined
      const position = computeMidpointPosition(
        node.position,
        nextSibling?.position,
      )
      const newId = crypto.randomUUID()

      createMutation.mutate({
        id: newId,
        content: "",
        parent_id: node.parent_id ?? null,
        position,
        level: node.level,
      })
      setEditingId(newId)
    },
    [childrenMap, handleCommitContent, createMutation],
  )

  const handleAddChild = useCallback(
    (node: OutlinerNode, currentDraft?: string) => {
      if (currentDraft !== undefined) {
        handleCommitContent(node, currentDraft)
      }
      setCollapsedIds((prev) => {
        if (!prev.has(node.id)) return prev
        const next = new Set(prev)
        next.delete(node.id)
        return next
      })
      const children = childrenMap.get(node.id) ?? []
      const lastChild = children[children.length - 1]
      const position = computeMidpointPosition(lastChild?.position, undefined)
      const newId = crypto.randomUUID()

      createMutation.mutate({
        id: newId,
        content: "",
        parent_id: node.id,
        position,
        level: node.level + 1,
      })
      setEditingId(newId)
    },
    [childrenMap, handleCommitContent, createMutation],
  )

  const handleAddRootNode = useCallback(() => {
    const parentId = zoomRootId ?? null
    const siblings = childrenMap.get(parentId) ?? []
    const lastSibling = siblings[siblings.length - 1]
    const parentNode = parentId ? nodeMap.get(parentId) : undefined
    const position = computeMidpointPosition(lastSibling?.position, undefined)
    const newId = crypto.randomUUID()

    createMutation.mutate({
      id: newId,
      content: "",
      parent_id: parentId,
      position,
      level: parentNode ? parentNode.level + 1 : 0,
    })
    setEditingId(newId)
  }, [zoomRootId, childrenMap, nodeMap, createMutation])

  const handleMoveFocus = useCallback(
    (nodeId: string, direction: "up" | "down", currentDraft: string) => {
      const idx = visibleNodes.findIndex((item) => item.node.id === nodeId)
      if (idx === -1) return
      const targetIdx = direction === "up" ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= visibleNodes.length) return

      handleCommitContent(visibleNodes[idx].node, currentDraft)
      setEditingId(visibleNodes[targetIdx].node.id)
    },
    [visibleNodes, handleCommitContent],
  )

  const handleReorderSibling = useCallback(
    (node: OutlinerNode, direction: "up" | "down") => {
      const siblings = childrenMap.get(node.parent_id ?? null) ?? []
      const idx = siblings.findIndex((s) => s.id === node.id)
      if (idx === -1) return

      if (direction === "up" && idx > 0) {
        reorderMutation.mutate({
          id: node.id,
          before_id: siblings[idx - 1].id,
          after_id: idx > 1 ? siblings[idx - 2].id : undefined,
        })
      } else if (direction === "down" && idx < siblings.length - 1) {
        reorderMutation.mutate({
          id: node.id,
          after_id: siblings[idx + 1].id,
          before_id:
            idx < siblings.length - 2 ? siblings[idx + 2].id : undefined,
        })
      }
    },
    [childrenMap, reorderMutation],
  )

  const handleDeleteEmpty = useCallback(
    (node: OutlinerNode) => {
      const idx = visibleNodes.findIndex((item) => item.node.id === node.id)
      const prevNode = idx > 0 ? visibleNodes[idx - 1].node : null
      setLastDeletedNode(node)
      deleteMutation.mutate(node.id)
      setEditingId(prevNode ? prevNode.id : null)
    },
    [visibleNodes, deleteMutation],
  )

  const handleZoom = useCallback((nodeId: string) => {
    setZoomRootId((prev) => (prev === nodeId ? null : nodeId))
    setEditingId(null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const draggedNode = nodeMap.get(String(active.id))
      const targetNode = nodeMap.get(String(over.id))
      if (
        !draggedNode ||
        !targetNode ||
        (draggedNode.parent_id ?? null) !== (targetNode.parent_id ?? null)
      ) {
        return
      }

      const siblings = childrenMap.get(draggedNode.parent_id ?? null) ?? []
      const oldIndex = siblings.findIndex((n) => n.id === draggedNode.id)
      const newIndex = siblings.findIndex((n) => n.id === targetNode.id)
      if (oldIndex === -1 || newIndex === -1) return

      let before_id: string | undefined
      let after_id: string | undefined

      if (newIndex > oldIndex) {
        after_id = targetNode.id
        before_id = siblings[newIndex + 1]?.id
      } else {
        before_id = targetNode.id
        after_id = siblings[newIndex - 1]?.id
      }

      reorderMutation.mutate({ id: draggedNode.id, before_id, after_id })
    },
    [nodeMap, childrenMap, reorderMutation],
  )

  const dateStr = list.updated_at || list.created_at
  const formattedDate = dateStr ? new Date(dateStr).toLocaleString() : ""
  const headerPortal =
    typeof document !== "undefined"
      ? document.getElementById("header-portal")
      : null

  return (
    <div className="p-2 md:p-6 max-w-4xl mx-auto">
      {headerPortal &&
        createPortal(
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/lists" })}
              className="shrink-0 gap-2"
            >
              Back
            </Button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm font-semibold truncate">{list.title}</h1>
              <div className="flex items-center gap-2">
                {list.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {list.description}
                  </p>
                )}
                {formattedDate && (
                  <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap">
                    • Updated {formattedDate}
                  </span>
                )}
              </div>
            </div>
          </div>,
          headerPortal,
        )}

      <OutlinerBreadcrumbs
        listTitle={list.title}
        breadcrumbs={breadcrumbs}
        onSelectZoom={setZoomRootId}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleIds}
              strategy={verticalListSortingStrategy}
            >
              {visibleNodes.map(({ node, depth, hasChildren }) => (
                <NodeRow
                  key={node.id}
                  node={node}
                  depth={depth}
                  hasChildren={hasChildren}
                  isCollapsed={collapsedIds.has(node.id)}
                  isEditing={editingId === node.id}
                  resolvedTheme={resolvedTheme}
                  onStartEdit={handleStartEdit}
                  onCommitContent={handleCommitContent}
                  onCancelEdit={handleCancelEdit}
                  onToggleCollapse={handleToggleCollapse}
                  onAddChild={handleAddChild}
                  onAddSibling={handleAddSibling}
                  onIndent={handleIndent}
                  onOutdent={handleOutdent}
                  onMoveFocus={handleMoveFocus}
                  onReorderSibling={handleReorderSibling}
                  onZoom={handleZoom}
                  onDeleteEmpty={handleDeleteEmpty}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex items-center gap-1 min-h-[24px] mt-1">
          <div className="w-10 flex items-center justify-end shrink-0 pr-1">
            <button
              onClick={handleAddRootNode}
              className="p-0.5 hover:bg-accent rounded transition-colors"
              title="Add item"
              type="button"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleAddRootNode}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Add item...
          </button>
        </div>
      </div>
    </div>
  )
}
