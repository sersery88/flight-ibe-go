import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-md",
        "after:absolute after:inset-0 after:animate-shimmer",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
