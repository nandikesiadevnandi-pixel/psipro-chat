import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Users, MessageSquare, BarChart3, Settings } from 'lucide-react';
import { useWhatsAppContacts } from '@/hooks/whatsapp/useWhatsAppContacts';
import { useWhatsAppInstances } from '@/hooks/whatsapp';
import { ContactItem } from './ContactItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ContactsSidebarProps {
  selectedContactId: string | null;
  onSelectContact: (contactId: string) => void;
}

export function ContactsSidebar({ selectedContactId, onSelectContact }: ContactsSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('all');
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const { instances } = useWhatsAppInstances();
  const { data: contacts, isLoading } = useWhatsAppContacts(
    selectedInstanceId === 'all' ? undefined : selectedInstanceId,
    debouncedSearch
  );

  return (
    <div className="w-[350px] border-r border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Contatos</h1>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/whatsapp">
              <Button variant="ghost" size="icon" title="Conversas">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/whatsapp/relatorio">
              <Button variant="ghost" size="icon" title="Relatórios">
                <BarChart3 className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/whatsapp/settings">
              <Button variant="ghost" size="icon" title="Configurações">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Instance Filter */}
        <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as instâncias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as instâncias</SelectItem>
            {instances?.map((instance) => (
              <SelectItem key={instance.id} value={instance.id}>
                {instance.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 mb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))
          ) : contacts && contacts.length > 0 ? (
            contacts.map((contact) => (
              <ContactItem
                key={contact.id}
                contact={contact}
                isSelected={selectedContactId === contact.id}
                onClick={() => onSelectContact(contact.id)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum contato encontrado</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
