import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useProjectSetup = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if cron jobs exist
  const { data: cronJobsExist, isLoading: isCheckingCronJobs } = useQuery({
    queryKey: ['project-setup', 'cron-jobs'],
    queryFn: async () => {
      try {
        // Check if cron jobs are configured by querying the cron.job table
        const { data, error } = await supabase
          .rpc('exec_sql', {
            sql: `
              SELECT COUNT(*) as count 
              FROM cron.job 
              WHERE jobname IN ('check-instances-status', 'sync-contact-profiles-daily');
            `
          });

        if (error) throw error;

        // If we have 2 jobs, configuration is complete
        return data?.[0]?.count === 2;
      } catch (error: any) {
        console.error('[useProjectSetup] Error checking cron jobs:', error);
        // If we can't check (permissions issue), assume they don't exist
        return false;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });

  // Run setup configuration
  const setupProject = useMutation({
    mutationFn: async () => {
      console.log('[useProjectSetup] Calling setup-project-config edge function...');

      const { data, error } = await supabase.functions.invoke('setup-project-config', {
        body: {},
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Setup failed');
      }

      return data;
    },
    onSuccess: () => {
      console.log('[useProjectSetup] Setup completed successfully');
      queryClient.invalidateQueries({ queryKey: ['project-setup', 'cron-jobs'] });
      
      toast({
        title: "Configuração automática concluída",
        description: "Sistema configurado com sucesso para este projeto.",
      });
    },
    onError: (error: any) => {
      console.error('[useProjectSetup] Setup failed:', error);
      
      toast({
        title: "Erro na configuração automática",
        description: error.message || "Não foi possível configurar o sistema automaticamente.",
        variant: "destructive",
      });
    },
  });

  return {
    cronJobsExist,
    isCheckingCronJobs,
    setupProject: setupProject.mutate,
    isSettingUp: setupProject.isPending,
    setupComplete: cronJobsExist === true,
  };
};
