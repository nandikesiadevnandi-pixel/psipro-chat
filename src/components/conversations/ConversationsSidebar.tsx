import { useState } from "react";
import { Search, Plus, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWhatsAppConversations } from "@/hooks/whatsapp";
import ConversationItem from "./ConversationItem";
import QuickFilterPills from "./QuickFilterPills";
import NewConversationModal from "./NewConversationModal";
import { Link } from "react-router-dom";

interface ConversationsSidebarProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  instanceId: string;
}

type FilterType = "all" | "unread";

const ConversationsSidebar = ({ selectedId, onSelect, instanceId }: ConversationsSidebarProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);

  const { conversations, isLoading } = useWhatsAppConversations({
    instanceId,
    search,
    status: "active",
  });

  // Apply unread filter client-side
  const filteredConversations = filter === "unread" 
    ? conversations.filter((conv) => (conv.unread_count || 0) > 0)
    : conversations;

  return (
    <div className="flex flex-col h-full w-80 border-r border-sidebar-border bg-sidebar">
      {/* Title Header */}
      <div className="p-3 border-b border-sidebar-border flex items-center justify-between">
        <h1 className="text-lg font-semibold">Conversas</h1>
        <Link to="/whatsapp/settings">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Search and new conversation */}
      <div className="p-3 space-y-2 border-b border-sidebar-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-sidebar-accent border-sidebar-border"
            />
          </div>
          <Button
            size="icon"
            onClick={() => setIsNewConversationOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <QuickFilterPills activeFilter={filter} onFilterChange={setFilter} />
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
          </div>
        ) : (
          <div className="divide-y divide-sidebar-border">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedId}
                onClick={() => onSelect(conversation.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <NewConversationModal
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        instanceId={instanceId}
        onSuccess={(conversationId) => {
          onSelect(conversationId);
          setIsNewConversationOpen(false);
        }}
      />
    </div>
  );
};

export default ConversationsSidebar;
