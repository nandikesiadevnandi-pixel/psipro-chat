import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import psiproLogo from '@/assets/psipro-logo.png';

export default function Auth() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const getTitle = () => {
    if (showForgotPassword) return 'Recuperar senha';
    return activeTab === 'login' ? 'Entrar' : 'Criar conta';
  };

  const getDescription = () => {
    if (showForgotPassword) return 'Informe seu email para receber o link de redefinição';
    return activeTab === 'login'
      ? 'Entre com suas credenciais para acessar o sistema'
      : 'Crie sua conta para começar a usar o sistema';
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={psiproLogo} alt="PsiPro" className="h-36 mx-auto mb-4" />
          <p className="text-muted-foreground">Gerencie suas conversas com inteligência</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{getTitle()}</CardTitle>
            <CardDescription className="text-center">{getDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            {showForgotPassword ? (
              <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <LoginForm onForgotPassword={() => setShowForgotPassword(true)} />
                </TabsContent>

                <TabsContent value="signup">
                  <SignupForm />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Sistema de gestão de conversas WhatsApp com IA
        </p>
      </div>
    </div>
  );
}
