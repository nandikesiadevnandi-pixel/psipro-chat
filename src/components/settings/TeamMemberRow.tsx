import { useState } from "react";
import { MoreVertical, ShieldCheck, UserCog, Users, Ban, CheckCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { TeamMember } from "@/hooks/useTeamManagement";
import { ChangeRoleDialog } from "./ChangeRoleDialog";
import { DeactivateMemberDialog } from "./DeactivateMemberDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TeamMemberRowProps {
  member: TeamMember;
}

const roleConfig = {
  admin: { label: 'Admin', icon: ShieldCheck, variant: 'destructive' as const },
  supervisor: { label: 'Supervisor', icon: UserCog, variant: 'default' as const },
  agent: { label: 'Agent', icon: Users, variant: 'secondary' as const },
};

const statusConfig = {
  online: { label: 'Online', color: 'text-green-500' },
  offline: { label: 'Offline', color: 'text-gray-400' },
  away: { label: 'Ausente', color: 'text-yellow-500' },
  busy: { label: 'Ocupado', color: 'text-red-500' },
};

export const TeamMemberRow = ({ member }: TeamMemberRowProps) => {
  const [showChangeRoleDialog, setShowChangeRoleDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  const roleInfo = roleConfig[member.role];
  const statusInfo = statusConfig[member.status];
  const RoleIcon = roleInfo.icon;

  const initials = member.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <TableRow className={!member.is_active ? 'opacity-50' : ''}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{member.full_name}</div>
              <div className="text-sm text-muted-foreground">{member.email}</div>
            </div>
          </div>
        </TableCell>

        <TableCell>
          <Badge variant={roleInfo.variant} className="gap-1">
            <RoleIcon className="h-3 w-3" />
            {roleInfo.label}
          </Badge>
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusInfo.color.replace('text-', 'bg-')}`} />
            <span className="text-sm">{statusInfo.label}</span>
          </div>
        </TableCell>

        <TableCell>
          <span className="text-sm">{member.activeConversations}</span>
        </TableCell>

        <TableCell>
          <span className="text-sm text-muted-foreground">
            {format(new Date(member.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
          </span>
        </TableCell>

        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowChangeRoleDialog(true)}>
                <UserCog className="mr-2 h-4 w-4" />
                Alterar Role
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeactivateDialog(true)}>
                {member.is_active ? (
                  <>
                    <Ban className="mr-2 h-4 w-4" />
                    Desativar
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <ChangeRoleDialog
        member={member}
        open={showChangeRoleDialog}
        onOpenChange={setShowChangeRoleDialog}
      />

      <DeactivateMemberDialog
        member={member}
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      />
    </>
  );
};
