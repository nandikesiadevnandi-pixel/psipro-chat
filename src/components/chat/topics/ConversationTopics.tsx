import { Button } from '@/components/ui/button';
import { RefreshCw, Tag } from 'lucide-react';
import { useConversationTopics } from '@/hooks/whatsapp/useConversationTopics';
import { useCategorizeConversation } from '@/hooks/whatsapp/useCategorizeConversation';
import { TopicBadges } from './TopicBadges';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationTopicsProps {
  conversationId: string;
}

export function ConversationTopics({ conversationId }: ConversationTopicsProps) {
  const { data: topicsData, isLoading } = useConversationTopics(conversationId);
  const { mutate: categorize, isPending } = useCategorizeConversation();

  const handleRecategorize = () => {
    categorize(conversationId);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm">Tópicos</h4>
        </div>
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const hasTopic = topicsData?.topics && topicsData.topics.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm">Tópicos</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRecategorize}
          disabled={isPending}
        >
          <RefreshCw className={`h-3 w-3 ${isPending ? 'animate-spin' : ''}`} />
          <span className="ml-1.5 text-xs">
            {hasTopic ? 'Recategorizar' : 'Categorizar'}
          </span>
        </Button>
      </div>

      {hasTopic ? (
        <div className="space-y-3">
          <TopicBadges topics={topicsData.topics} showIcon={false} maxTopics={10} />
          
          {topicsData.ai_confidence !== undefined && (
            <div className="text-xs text-muted-foreground">
              Confiança: {(topicsData.ai_confidence * 100).toFixed(0)}%
            </div>
          )}
          
          {topicsData.categorized_at && (
            <div className="text-xs text-muted-foreground">
              Categorizado em{' '}
              {format(new Date(topicsData.categorized_at), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </div>
          )}

          {topicsData.ai_reasoning && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <span className="font-medium">Análise:</span> {topicsData.ai_reasoning}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhum tópico identificado. Clique em "Categorizar" para analisar a conversa.
        </p>
      )}
    </div>
  );
}
