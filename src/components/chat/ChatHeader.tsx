import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings, UserPlus, Repeat } from "lucide-react";
import { SentimentCard } from "./SentimentCard";
import { Tables } from "@/integrations/supabase/types";
import { Link } from "react-router-dom";
import { useConversationTopics } from "@/hooks/whatsapp/useConversationTopics";
import { TopicBadges } from "./topics/TopicBadges";
import { ChatHeaderMenu } from "./ChatHeaderMenu";
import { QueueIndicator } from "@/components/conversations/QueueIndicator";
import { AssignAgentDialog } from "@/components/conversations/AssignAgentDialog";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversationAssignment } from "@/hooks/whatsapp/useConversationAssignment";

type Contact = Tables<'whatsapp_contacts'>;
type Sentiment = Tables<'whatsapp_sentiment_analysis'>;

interface ChatHeaderProps {
  contact?: Contact;
  sentiment?: Sentiment | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  conversationId?: string;
  conversation?: any;
  onRefresh?: () => void;
}

export const ChatHeader = ({ contact, sentiment, isAnalyzing, onAnalyze, conversationId, conversation, onRefresh }: ChatHeaderProps) => {
  const { data: topicsData } = useConversationTopics(conversationId || null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const { user, isAdmin, isSupervisor } = useAuth();
  const { assignConversation } = useConversationAssignment();
  
  if (!contact) return null;

  const isInQueue = !conversation?.assigned_to;
  const canAssign = isAdmin || isSupervisor;
  const isAssignedToMe = conversation?.assigned_to === user?.id;
  const canTransfer = canAssign || isAssignedToMe;

  const handleAssumeFromQueue = () => {
    if (conversationId && user?.id) {
      assignConversation({ conversationId, assignedTo: user.id });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-4 border-b border-border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={contact.profile_picture_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h2 className="text-base font-semibold text-foreground">
              {contact.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {contact.phone_number}
            </p>
            {topicsData?.topics && topicsData.topics.length > 0 && (
              <div className="mt-1">
                <TopicBadges topics={topicsData.topics} size="sm" showIcon={true} maxTopics={3} />
              </div>
            )}
            {conversation && (
              <div className="mt-1">
                <QueueIndicator
                  assignedTo={conversation.assigned_to}
                  assignedToName={conversation.assigned_profile?.full_name}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Assignment buttons */}
          {conversation && isInQueue && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAssumeFromQueue}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assumir
            </Button>
          )}

          {conversation && !isInQueue && canTransfer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssignDialogOpen(true)}
            >
              <Repeat className="w-4 h-4 mr-2" />
              Transferir
            </Button>
          )}

          <SentimentCard sentiment={sentiment} />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onAnalyze}
            disabled={isAnalyzing}
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span className="ml-2">Analisar</span>
          </Button>

          {conversation && (
            <ChatHeaderMenu conversation={conversation} onRefresh={onRefresh} />
          )}

          <Link to="/whatsapp/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Assignment Dialog */}
      {conversation && conversationId && (
        <AssignAgentDialog
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          conversationId={conversationId}
          currentAssignee={conversation.assigned_to}
          isTransfer={!isInQueue}
        />
      )}
    </div>
  );
};
