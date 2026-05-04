import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/LoginForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import psiproLogo from '@/assets/psipro-logo.png';

export default function Auth() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={psiproLogo} alt="PsiPro" className="h-36 mx-auto mb-4" />
          <p className="text-muted-foreground">Gerencie suas conversas com inteligência</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {showForgotPassword ? 'Recuperar senha' : 'Entrar'}
            </CardTitle>
            <CardDescription className="text-center">
              {showForgotPassword
                ? 'Informe seu email para receber o link de redefinição'
                : 'Entre com suas credenciais para acessar o sistema'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showForgotPassword ? (
              <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
            ) : (
              <LoginForm onForgotPassword={() => setShowForgotPassword(true)} />
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Acesso somente para usuários autorizados. Entre em contato com o administrador.
        </p>
      </div>
    </div>
  );
}
