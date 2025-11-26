import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
}

export function MetricCard({ title, value, icon: Icon, className, children }: MetricCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {children}
      </CardContent>
    </Card>
  );
}
