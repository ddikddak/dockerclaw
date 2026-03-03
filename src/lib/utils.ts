import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"
import { logger } from "@/lib/logger"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Centralised async error handler. Logs to the structured logger and shows a
 * user-visible toast. Use in every catch block that calls a remote service.
 *
 * @example
 *   try { await SharedBlockService.update(...) }
 *   catch (err) { handleAsyncError('update block', err) }
 */
export function handleAsyncError(label: string, error: unknown): void {
  logger.error("app", `Failed to ${label}`, error instanceof Error ? error : undefined)
  toast.error(`Failed to ${label}`)
}
