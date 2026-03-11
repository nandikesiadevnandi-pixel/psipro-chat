import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchRegistrationSetting = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('registration_enabled')
        .limit(1)
        .single();
      if (data) setRegistrationEnabled(data.registration_enabled);
      else setRegistrationEnabled(true); // default to enabled if no settings
    };
    fetchRegistrationSetting();
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <MessageSquare className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">WhatsApp CRM</h1>
          <p className="text-muted-foreground">Gerencie suas conversas com inteligência</p>
        </div>

        {/* Auth Card */}
        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {activeTab === 'login' ? 'Entrar' : 'Criar conta'}
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === 'login' 
                ? 'Entre com suas credenciais para acessar o sistema' 
                : 'Crie sua conta para começar a usar o sistema'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
              <TabsList className={`grid w-full mb-6 ${registrationEnabled === false ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <TabsTrigger value="login">Entrar</TabsTrigger>
                {registrationEnabled !== false && (
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>
              
              {registrationEnabled !== false && (
                <TabsContent value="signup">
                  <SignupForm />
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Sistema de gestão de conversas WhatsApp com IA
        </p>
      </div>
    </div>
  );
}
