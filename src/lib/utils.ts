import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"
import { logger } from "@/lib/logger"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Log + toast a failed async operation. Use in every service catch block. */
export function handleAsyncError(label: string, error: unknown): void {
  logger.error("app", `Failed to ${label}`, error instanceof Error ? error : undefined)
  toast.error(`Failed to ${label}`)
}
