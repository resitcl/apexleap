import type { HTMLAttributes, ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type DashboardTone = "default" | "success" | "warning" | "danger" | "info"

const toneStyles: Record<DashboardTone, { value: string; icon: string; chip: string }> = {
  default: {
    value: "text-primary",
    icon: "text-primary",
    chip: "bg-primary/10 border-primary/20 text-primary",
  },
  success: {
    value: "text-emerald-400",
    icon: "text-emerald-400",
    chip: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
  },
  warning: {
    value: "text-amber-400",
    icon: "text-amber-400",
    chip: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  },
  danger: {
    value: "text-destructive",
    icon: "text-destructive",
    chip: "bg-destructive/10 border-destructive/20 text-destructive",
  },
  info: {
    value: "text-sky-400",
    icon: "text-sky-400",
    chip: "bg-sky-500/10 border-sky-500/20 text-sky-300",
  },
}

export function DashboardPage({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-8 pb-12 pt-1", className)} {...props} />
}

interface DashboardPageHeaderProps {
  actions?: ReactNode
  className?: string
  eyebrow?: ReactNode
  icon?: ReactNode
  meta?: ReactNode
  subtitle?: ReactNode
  title: ReactNode
}

export function DashboardPageHeader({
  actions,
  className,
  eyebrow,
  icon,
  meta,
  subtitle,
  title,
}: DashboardPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/45">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-foreground">
            {title}
          </h1>
        </div>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-sm md:text-base text-muted-foreground/80 font-medium">
            {subtitle}
          </p>
        ) : null}
      </div>
      {meta || actions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {meta}
          {actions}
        </div>
      ) : null}
    </div>
  )
}

interface DashboardMetricCardProps {
  className?: string
  description?: ReactNode
  icon?: ReactNode
  label: ReactNode
  tone?: DashboardTone
  value: ReactNode
  valueClassName?: string
}

export function DashboardMetricCard({
  className,
  description,
  icon,
  label,
  tone = "default",
  value,
  valueClassName,
}: DashboardMetricCardProps) {
  const styles = toneStyles[tone]

  return (
    <Card className={cn("rounded-2xl border border-white/[0.04] bg-card shadow-sm hover:border-primary/20 transition-colors", className)}>
      <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
        {(icon || label) && (
          <div className="mb-4 flex items-center gap-2.5">
            {icon ? <span className={cn("shrink-0", styles.icon)}>{icon}</span> : null}
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{label}</p>
          </div>
        )}
        <div className={cn("text-4xl font-black tracking-tighter leading-none", styles.value, valueClassName)}>
          {value}
        </div>
        {description ? (
          <p className="mt-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
            {description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface DashboardSectionCardProps {
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  description?: ReactNode
  headerClassName?: string
  icon?: ReactNode
  title: ReactNode
}

export function DashboardSectionCard({
  action,
  children,
  className,
  contentClassName,
  description,
  headerClassName,
  icon,
  title,
}: DashboardSectionCardProps) {
  return (
    <Card className={cn("rounded-2xl border border-white/[0.04] bg-card shadow-sm overflow-hidden", className)}>
      <CardHeader className={cn("border-b border-border/30 bg-muted/10 px-6 pt-6 pb-4", headerClassName)}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
              {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
              {title}
            </CardTitle>
            {description ? <p className="text-sm text-muted-foreground/75 font-medium">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn("px-6 py-6", contentClassName)}>{children}</CardContent>
    </Card>
  )
}

interface DashboardEmptyStateProps {
  action?: ReactNode
  className?: string
  description: ReactNode
  icon?: ReactNode
  title: ReactNode
}

export function DashboardEmptyState({ action, className, description, icon, title }: DashboardEmptyStateProps) {
  return (
    <Card className={cn("rounded-2xl border-dashed border-white/[0.05] bg-muted/5 shadow-sm", className)}>
      <CardContent className="py-16 flex flex-col items-center text-center">
        {icon ? (
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.05] bg-card/70 text-muted-foreground/40">
            {icon}
          </div>
        ) : null}
        <h3 className="text-xl font-black tracking-tight uppercase text-foreground">{title}</h3>
        <p className="mt-2 max-w-md text-sm font-medium text-muted-foreground/75">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </CardContent>
    </Card>
  )
}

interface DashboardMetaPillProps {
  children: ReactNode
  className?: string
  icon?: ReactNode
  tone?: DashboardTone
}

export function DashboardMetaPill({ children, className, icon, tone = "default" }: DashboardMetaPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[11px] font-bold uppercase tracking-[0.15em]",
        toneStyles[tone].chip,
        className
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </div>
  )
}
