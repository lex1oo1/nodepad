import { Keyboard } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function Shortcuts() {
  const shortcuts = [
    { key: "Enter", description: "Create sibling node below" },
    { key: "Shift + Enter", description: "Create child node" },
    { key: "Tab", description: "Indent node (move right)" },
    { key: "Shift + Tab", description: "Outdent node (move left)" },
    {
      key: "↑ / ↓ Arrows",
      description: "Navigate nodes (or enter list if unfocused)",
    },
    { key: "Ctrl + ↑ / ↓", description: "Move node up/down among siblings" },
    { key: "Ctrl + .", description: "Zoom into / out of node subtree" },
    { key: "Backspace", description: "Delete empty node" },
    { key: "Ctrl + Z", description: "Undo node delete" },
    { key: "Escape", description: "Cancel editing / exit zoom" },
  ]

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center gap-2">
        <Keyboard className="h-3.5 w-3.5" />
        <span>Keyboard Shortcuts</span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="px-2 py-1">
          {shortcuts.map((s) => (
            <SidebarMenuItem
              key={s.key}
              className="flex flex-col mb-2 last:mb-0"
            >
              <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded border border-muted-foreground/20 w-fit text-muted-foreground uppercase">
                {s.key}
              </span>
              <span className="text-[11px] text-muted-foreground/80 mt-1 leading-tight">
                {s.description}
              </span>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
