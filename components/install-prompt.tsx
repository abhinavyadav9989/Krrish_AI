"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  if (!showPrompt || !deferredPrompt) return null

  return (
    <Card className="fixed bottom-20 left-4 right-4 p-4 bg-card text-card-foreground neon-glow z-40 max-w-sm mx-auto">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install Hey Krrish</h3>
          <p className="text-xs opacity-80 mb-3">Add to your home screen for quick access and offline use</p>
          <div className="flex gap-2">
            <Button onClick={handleInstall} size="sm" className="neon-glow-hover">
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
            <Button onClick={handleDismiss} variant="ghost" size="sm">
              Later
            </Button>
          </div>
        </div>
        <Button onClick={handleDismiss} variant="ghost" size="icon" className="h-6 w-6 p-1">
          <X className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  )
}
