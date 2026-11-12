export interface OutlinerNode {
  id: string
  nodelist_id?: string
  content: string
  parent_id?: string | null
  level: number
  path: string
  position: string
}

export interface TreeNode {
  node: OutlinerNode
  depth: number
  children: TreeNode[]
}

export interface FlatVisibleNode {
  node: OutlinerNode
  depth: number
  hasChildren: boolean
}
