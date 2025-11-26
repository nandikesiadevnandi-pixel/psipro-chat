import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SmartReplySuggestion } from "@/hooks/whatsapp/useSmartReply";

interface SmartReplySuggestionsProps {
  suggestions: SmartReplySuggestion[];
  isLoading: boolean;
  isRefreshing: boolean;
  onSelectSuggestion: (text: string) => void;
  onRefresh: () => void;
}

const toneConfig = {
  formal: {
    label: 'Formal',
    borderColor: 'border-blue-500/50',
    badgeVariant: 'default' as const,
  },
  friendly: {
    label: 'Amigável',
    borderColor: 'border-green-500/50',
    badgeVariant: 'default' as const,
  },
  direct: {
    label: 'Direto',
    borderColor: 'border-orange-500/50',
    badgeVariant: 'default' as const,
  }
};

export const SmartReplySuggestions = ({
  suggestions,
  isLoading,
  isRefreshing,
  onSelectSuggestion,
  onRefresh,
}: SmartReplySuggestionsProps) => {
  // Não renderizar se não houver sugestões e não estiver carregando
  if (!isLoading && suggestions.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border bg-card/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Sugestões IA</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
          className="ml-auto h-7 w-7 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Sparkles className="h-4 w-4" />
          <span>Gerando sugestões...</span>
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {suggestions.map((suggestion, index) => {
              const config = toneConfig[suggestion.tone];
              return (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => onSelectSuggestion(suggestion.text)}
                        className={`min-w-[180px] max-w-[250px] h-auto py-2 px-3 text-left flex-col items-start gap-1 border-2 ${config.borderColor} hover:bg-accent/50 transition-colors`}
                      >
                        <Badge variant={config.badgeVariant} className="text-xs mb-1">
                          {config.label}
                        </Badge>
                        <span className="text-sm line-clamp-2 text-foreground">
                          {suggestion.text}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">{suggestion.text}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
};
