import * as React from "react"
import { AlertTriangle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog"
import { Button } from "./button"
import { cn } from "@/lib/utils"

export interface ConfirmOptions {
  title?: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  /** "destructive" shows a red confirm button + warning icon (default). */
  variant?: "destructive" | "default"
}

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>

const ConfirmContext = React.createContext<ConfirmFn | null>(null)

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

const DEFAULTS: Required<Omit<ConfirmOptions, "description" | "title">> = {
  confirmText: "Confirm",
  cancelText: "Cancel",
  variant: "destructive",
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState>({ open: false })
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null)

  const confirm = React.useCallback<ConfirmFn>((options = {}) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setState({ ...options, open: true })
    })
  }, [])

  const settle = React.useCallback((value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setState((s) => ({ ...s, open: false }))
  }, [])

  const variant = state.variant ?? DEFAULTS.variant
  const isDestructive = variant === "destructive"

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state.open} onOpenChange={(open) => { if (!open) settle(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-start gap-3">
              {isDestructive && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </span>
              )}
              <div className="space-y-1.5">
                <DialogTitle>{state.title ?? "Are you sure?"}</DialogTitle>
                {state.description && (
                  <DialogDescription>{state.description}</DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => settle(false)}>
              {state.cancelText ?? DEFAULTS.cancelText}
            </Button>
            <Button
              variant={isDestructive ? "destructive" : "default"}
              className={cn(!isDestructive && "")}
              onClick={() => settle(true)}
              autoFocus
            >
              {state.confirmText ?? DEFAULTS.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) {
    throw new Error("useConfirm must be used within a <ConfirmDialogProvider>")
  }
  return ctx
}
