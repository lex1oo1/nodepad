import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { LogOut, RotateCcw, Sparkles } from "lucide-react"
import { useEffect } from "react"

import { OpenAPI } from "@/client"
import { Footer } from "@/components/Common/Footer"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  const { isDemo, resetDemoMutation, exitDemoMutation } = useAuth()

  useEffect(() => {
    if (!isDemo) return

    const handleUnload = () => {
      const token = sessionStorage.getItem("access_token")
      if (!token) return
      const url = `${OpenAPI.BASE || ""}/api/v1/login/demo/cleanup`
      try {
        fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          keepalive: true,
        })
      } catch {
        // ignore
      }
    }

    window.addEventListener("pagehide", handleUnload)
    window.addEventListener("beforeunload", handleUnload)
    return () => {
      window.removeEventListener("pagehide", handleUnload)
      window.removeEventListener("beforeunload", handleUnload)
    }
  }, [isDemo])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <div
            id="header-portal"
            className="flex items-center gap-4 flex-1 min-w-0"
          />
          {isDemo && (
            <div className="flex items-center gap-2 shrink-0 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-medium hidden sm:inline">Demo Session</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetDemoMutation.mutate()}
                disabled={resetDemoMutation.isPending}
                className="h-6 px-2 text-[11px] hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 gap-1 rounded-full"
                title="Reset outline back to default state"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden md:inline">Reset</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exitDemoMutation.mutate()}
                disabled={exitDemoMutation.isPending}
                className="h-6 px-2 text-[11px] hover:bg-destructive/20 text-destructive gap-1 rounded-full"
                title="Exit demo session"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden md:inline">Exit</span>
              </Button>
            </div>
          )}
        </header>
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
