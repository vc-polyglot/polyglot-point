import * as React from "react"

export const ResizablePanelGroup: React.FC<React.PropsWithChildren<{ className?: string }>> =
  ({ children, className }) => (
    <div className={className}>{children}</div>
  )

export const ResizablePanel: React.FC<React.PropsWithChildren<{ className?: string }>> =
  ({ children, className }) => (
    <div className={className}>{children}</div>
  )

export const ResizableHandle: React.FC<{ className?: string }> =
  ({ className }) => <div className={className} />
