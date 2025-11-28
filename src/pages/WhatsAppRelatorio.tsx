import { useState, useMemo } from 'react';
import { MessageSquare, Clock, CheckCircle2, Archive, Timer, ArrowLeft, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  MetricCard, 
  DateRangeFilter, 
  StatusDistributionChart, 
  SentimentDistributionChart,
  LongestConversationsTable, 
  ReportToolbar,
  MetricsGridSkeleton,
  ChartsGridSkeleton,
  AgentFilter,
  AgentPerformanceChart
} from '@/components/reports';
import { TopicsDistributionChart } from '@/components/chat/topics/TopicsDistributionChart';
import { InstanceFilter } from '@/components/conversations/InstanceFilter';
import { useWhatsAppMetrics } from '@/hooks/whatsapp/useWhatsAppMetrics';
import { formatDuration } from '@/utils/timeFormatters';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

type FilterPeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';

export default function WhatsAppRelatorio() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('last30days');
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    const now = new Date();

    switch (selectedPeriod) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      case 'last7days':
        return { from: subDays(now, 7), to: now };
      case 'last30days':
        return { from: subDays(now, 30), to: now };
      case 'custom':
        return customRange || { from: subDays(now, 30), to: now };
      default:
        return { from: subDays(now, 30), to: now };
    }
  }, [selectedPeriod, customRange]);

  const periodLabel = useMemo(() => {
    switch (selectedPeriod) {
      case 'today': return 'Hoje';
      case 'yesterday': return 'Ontem';
      case 'last7days': return 'Últimos 7 dias';
      case 'last30days': return 'Últimos 30 dias';
      case 'custom':
        if (customRange) {
          return `${format(customRange.from, 'dd/MM')} - ${format(customRange.to, 'dd/MM')}`;
        }
        return 'Período personalizado';
      default:
        return 'Últimos 30 dias';
    }
  }, [selectedPeriod, customRange]);

  const { data: metrics, isLoading } = useWhatsAppMetrics({ 
    dateRange,
    instanceId: selectedInstance,
    agentId: selectedAgent
  });

  // Prepare data for export
  const exportRows = useMemo(() => {
    if (!metrics) return [];
    return [
      { metrica: 'Total de Conversas', valor: metrics.total },
      { metrica: 'Conversas Abertas', valor: metrics.active },
      { metrica: 'Conversas Fechadas', valor: metrics.closed },
      { metrica: 'Conversas Arquivadas', valor: metrics.archived },
      { metrica: 'Tempo Médio de Resposta (min)', valor: metrics.avgResponseTimeMinutes.toFixed(2) },
      ...metrics.dailyTrend.map(d => ({ metrica: `Volume ${d.date}`, valor: d.count })),
    ];
  }, [metrics]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/whatsapp')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Relatório WhatsApp</h1>
        </div>
      </div>

      {/* Filters Bar */}
      <ReportToolbar
        filename={`relatorio-whatsapp-${periodLabel.replace(/\s+/g, '-')}`}
        rowsForExport={exportRows}
        extra={
          <div className="flex gap-4 flex-wrap">
            <DateRangeFilter
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              periodLabel={periodLabel}
              customRange={customRange}
              setCustomRange={setCustomRange}
            />
            <InstanceFilter
              selectedInstance={selectedInstance}
              onInstanceChange={setSelectedInstance}
            />
            <AgentFilter
              selectedAgent={selectedAgent}
              onAgentChange={setSelectedAgent}
            />
          </div>
        }
      />

      {/* Content */}
      <div className="space-y-6">
        {isLoading ? (
          <>
            <MetricsGridSkeleton />
            <ChartsGridSkeleton />
          </>
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                title="Total de Conversas"
                value={metrics?.total || 0}
                icon={MessageSquare}
                trend={{
                  value: metrics?.previousPeriod 
                    ? ((metrics.total - metrics.previousPeriod.total) / (metrics.previousPeriod.total || 1)) * 100
                    : 0,
                  isPercentage: true
                }}
              />
              <MetricCard
                title="Conversas Abertas"
                value={metrics?.active || 0}
                icon={Clock}
                trend={{
                  value: metrics?.previousPeriod 
                    ? ((metrics.active - metrics.previousPeriod.active) / (metrics.previousPeriod.active || 1)) * 100
                    : 0,
                  isPercentage: true
                }}
              />
              <MetricCard
                title="Conversas Fechadas"
                value={metrics?.closed || 0}
                icon={CheckCircle2}
                trend={{
                  value: metrics?.previousPeriod 
                    ? ((metrics.closed - metrics.previousPeriod.closed) / (metrics.previousPeriod.closed || 1)) * 100
                    : 0,
                  isPercentage: true
                }}
              />
              <MetricCard
                title="Conversas Arquivadas"
                value={metrics?.archived || 0}
                icon={Archive}
                trend={{
                  value: metrics?.previousPeriod 
                    ? ((metrics.archived - metrics.previousPeriod.archived) / (metrics.previousPeriod.archived || 1)) * 100
                    : 0,
                  isPercentage: true
                }}
              />
              <MetricCard
                title="Tempo Médio de Resposta"
                value={formatDuration(metrics?.avgResponseTimeMinutes || 0)}
                icon={Timer}
                trend={{
                  value: metrics?.previousPeriod 
                    ? ((metrics.avgResponseTimeMinutes - metrics.previousPeriod.avgResponseTimeMinutes) / (metrics.previousPeriod.avgResponseTimeMinutes || 1)) * 100
                    : 0,
                  isPercentage: true
                }}
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard
                title="Taxa de Resolução"
                value={`${(metrics?.resolutionRate || 0).toFixed(1)}%`}
                icon={TrendingUp}
                trend={{
                  value: metrics?.previousPeriod 
                    ? (metrics.resolutionRate - metrics.previousPeriod.resolutionRate)
                    : 0,
                  isPercentage: false
                }}
              />
              <MetricCard
                title="Tempo de 1ª Resposta"
                value={formatDuration(metrics?.avgFirstResponseTimeMinutes || 0)}
                icon={Zap}
                trend={{
                  value: metrics?.previousPeriod && metrics.previousPeriod.avgFirstResponseTimeMinutes > 0
                    ? ((metrics.avgFirstResponseTimeMinutes - metrics.previousPeriod.avgFirstResponseTimeMinutes) / metrics.previousPeriod.avgFirstResponseTimeMinutes) * 100
                    : 0,
                  isPercentage: true
                }}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Evolution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolução no Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics?.dailyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Conversas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Distribution Chart */}
              <StatusDistributionChart data={metrics?.statusDistribution || []} />

              {/* Sentiment Distribution Chart */}
              <SentimentDistributionChart data={metrics?.sentimentDistribution || []} />

              {/* Topics Distribution Chart */}
              <TopicsDistributionChart data={metrics?.topicsDistribution || []} />
            </div>

            {/* Agent Performance Chart */}
            <AgentPerformanceChart data={metrics?.agentPerformance || []} />

            {/* Longest Conversations Table */}
            <LongestConversationsTable conversations={metrics?.longestConversations || []} />
          </>
        )}
      </div>
    </div>
  );
}
