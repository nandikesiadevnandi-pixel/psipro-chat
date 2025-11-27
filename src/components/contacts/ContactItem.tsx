import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContactWithMetrics } from '@/hooks/whatsapp/useWhatsAppContacts';
import { cn } from '@/lib/utils';

interface ContactItemProps {
  contact: ContactWithMetrics;
  isSelected: boolean;
  onClick: () => void;
}

export function ContactItem({ contact, isSelected, onClick }: ContactItemProps) {
  const initials = contact.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer transition-colors",
        "hover:bg-sidebar-accent",
        isSelected && "bg-sidebar-accent"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={contact.profile_picture_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium truncate text-sidebar-foreground">{contact.name}</h3>
            <Badge variant="secondary" className="ml-2 text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              {contact.total_conversations}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">{contact.phone_number}</span>
            {contact.last_interaction && (
              <span className="ml-2 whitespace-nowrap">
                {formatDistanceToNow(new Date(contact.last_interaction), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
