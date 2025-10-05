import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { StudentLayout } from '@/components/StudentLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, Lock, Mail, Phone } from 'lucide-react';

// Schema de validação para informações do perfil
const profileFormSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
});

// Schema de validação para alterar senha
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function UserProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Form para informações do perfil
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
    },
  });

  // Form para alteração de senha
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Função para atualizar informações do perfil
  const handleProfileUpdate = async (values: ProfileFormValues) => {
    setIsUpdating(true);
    try {
      const { error } = await updateProfile({
        full_name: values.full_name,
        phone: values.phone,
      });
      
      if (error) {
        toast.error('Erro ao atualizar perfil: ' + error);
      } else {
        toast.success('Perfil atualizado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro inesperado ao atualizar perfil');
    } finally {
      setIsUpdating(false);
    }
  };

  // Função para alterar senha
  const handlePasswordChange = async (values: PasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      // Primeiro, verificar a senha atual fazendo login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: values.currentPassword,
      });

      if (signInError) {
        toast.error('Senha atual incorreta');
        setIsChangingPassword(false);
        return;
      }

      // Se a senha atual estiver correta, atualizar para a nova senha
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword
      });

      if (error) {
        toast.error('Erro ao alterar senha: ' + error.message);
      } else {
        toast.success('Senha alterada com sucesso!');
        passwordForm.reset();
      }
    } catch (error) {
      toast.error('Erro inesperado ao alterar senha');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <StudentLayout>
      <div className="p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Meu Perfil</h1>
              <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card de Informações do Perfil */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Atualize suas informações de perfil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} disabled className="pl-10" />
                            </div>
                          </FormControl>
                          <FormDescription>
                            O email não pode ser alterado por questões de segurança
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone (Opcional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} placeholder="(11) 99999-9999" className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? 'Atualizando...' : 'Atualizar Perfil'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Card de Alteração de Senha */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>
                  Mantenha sua conta segura com uma senha forte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha Atual</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nova Senha</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormDescription>
                            Mínimo de 6 caracteres
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Nova Senha</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isChangingPassword} variant="secondary">
                      {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}