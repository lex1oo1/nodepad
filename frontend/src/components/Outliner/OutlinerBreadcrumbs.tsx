import { ChevronRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OutlinerNode } from "./types"

interface OutlinerBreadcrumbsProps {
  listTitle: string
  breadcrumbs: OutlinerNode[]
  onSelectZoom: (nodeId: string | null) => void
}

export function OutlinerBreadcrumbs({
  listTitle,
  breadcrumbs,
  onSelectZoom,
}: OutlinerBreadcrumbsProps) {
  if (breadcrumbs.length === 0) return null

  const activeZoomNode = breadcrumbs[breadcrumbs.length - 1]

  return (
    <div className="mb-4 flex flex-col gap-1 border-b pb-3">
      <nav
        aria-label="Zoom breadcrumbs"
        className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
      >
        <button
          type="button"
          onClick={() => onSelectZoom(null)}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground transition-colors"
        >
          <Home className="h-3 w-3" />
          <span className="max-w-[160px] truncate">{listTitle}</span>
        </button>

        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1
          return (
            <span key={crumb.id} className="inline-flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              <button
                type="button"
                onClick={() => onSelectZoom(crumb.id)}
                disabled={isLast}
                className={
                  isLast
                    ? "rounded px-1.5 py-0.5 font-medium text-foreground truncate max-w-[220px]"
                    : "rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground transition-colors truncate max-w-[180px]"
                }
              >
                {crumb.content || "Untitled"}
              </button>
            </span>
          )
        })}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSelectZoom(null)}
          className="ml-auto h-6 px-2 text-xs text-muted-foreground"
        >
          Exit Focus
        </Button>
      </nav>

      <h2 className="text-lg font-semibold tracking-tight px-1">
        {activeZoomNode.content || "Untitled"}
      </h2>
    </div>
  )
}
