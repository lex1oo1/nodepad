import type { FlatVisibleNode, OutlinerNode, TreeNode } from "./types"

/**
 * Compare two decimal position strings without losing precision in JS Number.
 */
export function comparePositions(a: string, b: string): number {
  const numA = Number(a)
  const numB = Number(b)
  if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) {
    return numA - numB
  }
  return a.localeCompare(b, undefined, { numeric: true })
}

/**
 * Compute a fractional position string between two sibling positions.
 */
export function computeMidpointPosition(
  prevPos?: string,
  nextPos?: string,
): string {
  if (prevPos !== undefined && nextPos !== undefined) {
    const mid = (Number(prevPos) + Number(nextPos)) / 2
    if (Number.isFinite(mid)) {
      return String(mid)
    }
  }
  if (prevPos !== undefined) {
    return String(Number(prevPos) + 1000)
  }
  if (nextPos !== undefined) {
    return String(Number(nextPos) - 1000)
  }
  return "1000"
}

export interface BuiltTree {
  roots: TreeNode[]
  nodeMap: Map<string, OutlinerNode>
  childrenMap: Map<string | null, OutlinerNode[]>
}

/**
 * Build a recursive tree structure from a flat list of nodes in a single pass.
 * When `zoomRootId` is provided, only its subtree is returned as `roots` with depth starting at 0.
 */
export function buildTree(
  rawNodes: Array<OutlinerNode | null | undefined>,
  zoomRootId: string | null = null,
): BuiltTree {
  const nodeMap = new Map<string, OutlinerNode>()
  const childrenMap = new Map<string | null, OutlinerNode[]>()

  for (const raw of rawNodes) {
    if (!raw) continue
    nodeMap.set(raw.id, raw)
    const pid = raw.parent_id ?? null
    const list = childrenMap.get(pid)
    if (list) {
      list.push(raw)
    } else {
      childrenMap.set(pid, [raw])
    }
  }

  for (const siblings of childrenMap.values()) {
    siblings.sort((a, b) => comparePositions(a.position, b.position))
  }

  const buildBranch = (node: OutlinerNode, depth: number): TreeNode => {
    const children = childrenMap.get(node.id) ?? []
    return {
      node,
      depth,
      children: children.map((child) => buildBranch(child, depth + 1)),
    }
  }

  let roots: TreeNode[]
  if (zoomRootId && nodeMap.has(zoomRootId)) {
    const zoomedChildren = childrenMap.get(zoomRootId) ?? []
    roots = zoomedChildren.map((child) => buildBranch(child, 0))
  } else {
    const topNodes = childrenMap.get(null) ?? []
    roots = topNodes.map((node) => buildBranch(node, 0))
  }

  return { roots, nodeMap, childrenMap }
}

/**
 * Flatten visible tree nodes (respecting collapsedIds) for keyboard navigation and SortableContext.
 */
export function flattenVisibleTree(
  roots: TreeNode[],
  collapsedIds: Set<string>,
): FlatVisibleNode[] {
  const result: FlatVisibleNode[] = []

  const visit = (items: TreeNode[]) => {
    for (const item of items) {
      const hasChildren = item.children.length > 0
      result.push({
        node: item.node,
        depth: item.depth,
        hasChildren,
      })
      if (hasChildren && !collapsedIds.has(item.node.id)) {
        visit(item.children)
      }
    }
  }

  visit(roots)
  return result
}

/**
 * Return ancestor chain from root down to `zoomRootId` for breadcrumb navigation.
 */
export function getBreadcrumbs(
  nodeMap: Map<string, OutlinerNode>,
  zoomRootId: string | null,
): OutlinerNode[] {
  if (!zoomRootId) return []
  const trail: OutlinerNode[] = []
  let currentId: string | null | undefined = zoomRootId
  const seen = new Set<string>()

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId)
    const node = nodeMap.get(currentId)
    if (!node) break
    trail.unshift(node)
    currentId = node.parent_id
  }

  return trail
}
