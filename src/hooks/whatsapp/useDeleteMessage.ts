import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteMessageParams {
  messageId: string;
  conversationId: string;
}

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: DeleteMessageParams) => {
      const { data, error } = await supabase.functions.invoke(
        'delete-whatsapp-message',
        {
          body: { messageId, conversationId },
        }
      );

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Falha ao excluir mensagem');

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-messages', variables.conversationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-conversations'] 
      });
      toast.success('Mensagem apagada com sucesso');
    },
    onError: (error: Error) => {
      console.error('[useDeleteMessage] Error:', error);
      toast.error(error.message || 'Erro ao apagar mensagem');
    },
  });
};
