import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useTranscribeAudio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { messageId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, messageId) => {
      // Invalidate messages queries to refetch with new transcription
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] });
      toast.success('Transcrição iniciada');
    },
    onError: (error: Error) => {
      console.error('Error transcribing audio:', error);
      toast.error('Erro ao transcrever áudio: ' + error.message);
    },
  });
};
