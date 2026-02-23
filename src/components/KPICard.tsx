import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
}

export default function KPICard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
}: KPICardProps) {
  return (
    <div className="liquid-glass group p-4 md:p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 md:mb-3">{title}</p>
          <div className="flex flex-wrap items-baseline gap-1.5 md:gap-2">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              {value}
            </h3>
            {change && (
              <span
                className={cn(
                  "text-xs md:text-sm font-medium",
                  changeType === "positive" && "text-success",
                  changeType === "negative" && "text-destructive",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1.5 md:mt-2 text-xs md:text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="shrink-0 liquid-glass-subtle rounded-xl p-2.5 md:p-3 transition-all duration-300 group-hover:scale-105">
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-accent" />
        </div>
      </div>
    </div>
  );
}
