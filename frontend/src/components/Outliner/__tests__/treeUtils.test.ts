import { describe, expect, it } from "bun:test"
import {
  buildTree,
  comparePositions,
  computeMidpointPosition,
  flattenVisibleTree,
  getBreadcrumbs,
} from "../treeUtils"
import type { OutlinerNode } from "../types"

describe("Outliner treeUtils", () => {
  it("comparePositions correctly orders decimal strings without precision loss", () => {
    expect(comparePositions("1000", "2000")).toBeLessThan(0)
    expect(comparePositions("2000", "1000")).toBeGreaterThan(0)
    expect(comparePositions("1000.5", "1000.5")).toBe(0)
    expect(
      comparePositions("1000.123456789012345", "1000.123456789012346"),
    ).toBeLessThan(0)
  })

  it("computeMidpointPosition calculates correct positions", () => {
    expect(computeMidpointPosition("1000", "2000")).toBe("1500")
    expect(computeMidpointPosition("1000", undefined)).toBe("2000")
    expect(computeMidpointPosition(undefined, "2000")).toBe("1000")
    expect(computeMidpointPosition(undefined, undefined)).toBe("1000")
  })

  it("buildTree builds hierarchical tree with depth", () => {
    const rawNodes: OutlinerNode[] = [
      { id: "1", content: "Root 1", position: "1000", level: 0, path: "1" },
      {
        id: "2",
        content: "Child 1.1",
        parent_id: "1",
        position: "1000",
        level: 1,
        path: "1.2",
      },
      { id: "3", content: "Root 2", position: "2000", level: 0, path: "3" },
    ]

    const { roots, nodeMap, childrenMap } = buildTree(rawNodes)

    expect(roots.length).toBe(2)
    expect(roots[0].node.id).toBe("1")
    expect(roots[0].depth).toBe(0)
    expect(roots[0].children.length).toBe(1)
    expect(roots[0].children[0].node.id).toBe("2")
    expect(roots[0].children[0].depth).toBe(1)
    expect(roots[1].node.id).toBe("3")

    expect(nodeMap.get("1")?.content).toBe("Root 1")
    expect(childrenMap.get("1")?.length).toBe(1)
  })

  it("flattenVisibleTree respects collapsed nodes", () => {
    const rawNodes: OutlinerNode[] = [
      { id: "1", content: "Root 1", position: "1000", level: 0, path: "1" },
      {
        id: "2",
        content: "Child 1.1",
        parent_id: "1",
        position: "1000",
        level: 1,
        path: "1.2",
      },
      { id: "3", content: "Root 2", position: "2000", level: 0, path: "3" },
    ]

    const { roots } = buildTree(rawNodes)

    // Uncollapsed: all 3 visible
    const allVisible = flattenVisibleTree(roots, new Set())
    expect(allVisible.length).toBe(3)
    expect(allVisible.map((v) => v.node.id)).toEqual(["1", "2", "3"])

    // Collapsed node 1: child 2 hidden
    const collapsed = flattenVisibleTree(roots, new Set(["1"]))
    expect(collapsed.length).toBe(2)
    expect(collapsed.map((v) => v.node.id)).toEqual(["1", "3"])
  })

  it("getBreadcrumbs constructs ancestor path for zoomed subtree", () => {
    const rawNodes: OutlinerNode[] = [
      { id: "1", content: "Root", position: "1000", level: 0, path: "1" },
      {
        id: "2",
        content: "Parent",
        parent_id: "1",
        position: "1000",
        level: 1,
        path: "1.2",
      },
      {
        id: "3",
        content: "Child",
        parent_id: "2",
        position: "1000",
        level: 2,
        path: "1.2.3",
      },
    ]

    const { nodeMap } = buildTree(rawNodes)
    const crumbs = getBreadcrumbs(nodeMap, "3")

    expect(crumbs.map((c) => c.id)).toEqual(["1", "2", "3"])
  })
})
