import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { OutlinerNode } from "./types"

export interface NodeKeyDownContext {
  node: OutlinerNode
  draftContent: string
}

interface NodeRowProps {
  node: OutlinerNode
  depth: number
  hasChildren: boolean
  isCollapsed: boolean
  isEditing: boolean
  resolvedTheme?: string
  onStartEdit: (node: OutlinerNode) => void
  onCommitContent: (node: OutlinerNode, content: string) => void
  onCancelEdit: () => void
  onToggleCollapse: (id: string) => void
  onAddChild: (node: OutlinerNode, currentDraft?: string) => void
  onAddSibling: (node: OutlinerNode, currentDraft: string) => void
  onIndent: (node: OutlinerNode, currentDraft: string) => void
  onOutdent: (node: OutlinerNode, currentDraft: string) => void
  onMoveFocus: (
    nodeId: string,
    direction: "up" | "down",
    currentDraft: string,
  ) => void
  onReorderSibling: (node: OutlinerNode, direction: "up" | "down") => void
  onZoom: (nodeId: string) => void
  onDeleteEmpty: (node: OutlinerNode) => void
}

export const NodeRow = memo(function NodeRow({
  node,
  depth,
  hasChildren,
  isCollapsed,
  isEditing,
  resolvedTheme,
  onStartEdit,
  onCommitContent,
  onCancelEdit,
  onToggleCollapse,
  onAddChild,
  onAddSibling,
  onIndent,
  onOutdent,
  onMoveFocus,
  onReorderSibling,
  onZoom,
  onDeleteEmpty,
}: NodeRowProps) {
  const [draftContent, setDraftContent] = useState(node.content)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipBlurCommitRef = useRef(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  useEffect(() => {
    if (isEditing) {
      setDraftContent(node.content)
      skipBlurCommitRef.current = false
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isEditing, node.content])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
    position: "relative" as const,
  }

  const handleBlur = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false
      return
    }
    onCommitContent(node, draftContent)
    onCancelEdit()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isMod = e.ctrlKey || e.metaKey

    if (isMod && e.key === ".") {
      e.preventDefault()
      skipBlurCommitRef.current = true
      onCommitContent(node, draftContent)
      onZoom(node.id)
      return
    }

    if (isMod && e.key === "ArrowUp") {
      e.preventDefault()
      onReorderSibling(node, "up")
      return
    }

    if (isMod && e.key === "ArrowDown") {
      e.preventDefault()
      onReorderSibling(node, "down")
      return
    }

    if (e.key === "Tab") {
      e.preventDefault()
      e.stopPropagation()
      if (e.shiftKey) {
        onOutdent(node, draftContent)
      } else {
        onIndent(node, draftContent)
      }
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      skipBlurCommitRef.current = true
      onMoveFocus(node.id, "up", draftContent)
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      skipBlurCommitRef.current = true
      onMoveFocus(node.id, "down", draftContent)
      return
    }

    if (e.key === "Enter") {
      e.preventDefault()
      skipBlurCommitRef.current = true
      if (e.shiftKey) {
        onAddChild(node, draftContent)
      } else {
        onAddSibling(node, draftContent)
      }
      return
    }

    if (e.key === "Backspace" && draftContent === "") {
      e.preventDefault()
      skipBlurCommitRef.current = true
      onDeleteEmpty(node)
      return
    }

    if (e.key === "Escape") {
      e.preventDefault()
      skipBlurCommitRef.current = true
      setDraftContent(node.content)
      onCancelEdit()
    }
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{ paddingLeft: `${depth * 20}px` }}
        className="flex items-center gap-1 group min-h-[24px] py-0.5 rounded-sm hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-0.5 w-10 justify-end shrink-0">
          <button
            onClick={() => onAddChild(node)}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 hover:bg-accent rounded transition-opacity"
            type="button"
            title="Add child node (Shift+Enter)"
            tabIndex={-1}
          >
            <Plus className="h-3 w-3 text-muted-foreground" />
          </button>
          <div className="w-4 flex items-center justify-center">
            {hasChildren && (
              <button
                onClick={() => onToggleCollapse(node.id)}
                className={cn(
                  "hover:bg-accent rounded p-0.5 transition-opacity",
                  isCollapsed
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                )}
                type="button"
                title={isCollapsed ? "Expand" : "Collapse"}
                tabIndex={-1}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          {...attributes}
          {...listeners}
          onDoubleClick={() => onZoom(node.id)}
          title="Drag to reorder • Double-click or Ctrl+. to zoom"
          tabIndex={-1}
          className={cn(
            "p-1.5 -m-1.5 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0",
            isEditing && "z-10",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-foreground/80 transition-all duration-150 block",
              hasChildren && isCollapsed && "ring-2 ring-muted-foreground/40",
            )}
            style={
              isEditing
                ? {
                    boxShadow: `0 0 0 1px ${resolvedTheme === "dark" ? "#427AB5" : "#F7DD7D"}, 0 0 0 2px ${resolvedTheme === "dark" ? "#427AB599" : "#F7DD7D99"}, 0 0 0 3px ${resolvedTheme === "dark" ? "#427AB533" : "#427AB533"}`,
                  }
                : undefined
            }
          />
        </button>

        <div className="flex items-center gap-2 w-full pr-2 min-w-0">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="h-7 py-0.5 text-sm border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 -ml-1"
            />
          ) : (
            <button
              type="button"
              className="text-sm text-left leading-tight whitespace-pre-wrap cursor-text px-1 -ml-1 transition-colors w-full min-h-[1.35rem] flex items-center text-foreground/95"
              onClick={() => onStartEdit(node)}
            >
              {node.content || (
                <span className="text-muted-foreground/50 italic">Empty</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
