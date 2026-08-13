import { getCategory } from "@/lib/data/categories";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { CategoryId } from "@/lib/types";

export function CategoryBadge({
  category,
  className,
  withIcon = true,
}: {
  category: CategoryId;
  className?: string;
  withIcon?: boolean;
}) {
  const cat = getCategory(category);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground/80 backdrop-blur",
        className,
      )}
    >
      {withIcon && (
        <Icon name={cat.icon} className="size-3.5" style={{ color: `var(--chart-${cat.accent})` }} />
      )}
      {cat.label}
    </span>
  );
}
