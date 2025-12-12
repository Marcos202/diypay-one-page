import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { StudentLayout } from '@/components/StudentLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarUploadModal } from '@/components/AvatarUploadModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, User, UserCircle, KeyRound, Camera } from 'lucide-react';

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
  const navigate = useNavigate();
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Sync avatar URL with profile
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

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

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        full_name: profile.full_name || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, user]);

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

  const handleAvatarSave = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
    refreshProfile?.();
  };

  const userInitial = profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';

  return (
    <StudentLayout>
      <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Back Button */}
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/members')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 md:h-8 md:w-8 text-foreground" />
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Meu Perfil</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie suas informações pessoais e configurações de conta
            </p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Card de Informações do Perfil */}
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4 pb-6 border-b">
                <div className="relative">
                  <Avatar className="w-24 h-24 ring-4 ring-background shadow-lg">
                    {avatarUrl && (
                      <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" />
                    )}
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-md border-2 border-background"
                    onClick={() => setAvatarModalOpen(true)}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Clique na câmera para alterar sua foto
                </p>
              </div>

              {/* Profile Form */}
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} />
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
                          <Input {...field} disabled className="bg-muted" />
                        </FormControl>
                        <FormDescription>
                          O email não pode ser alterado por segurança
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
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isUpdating}>
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
                <KeyRound className="h-4 w-4 text-foreground" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Atualize sua senha para manter sua conta segura
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
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
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
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isChangingPassword}>
                    {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Avatar Upload Modal */}
        <AvatarUploadModal
          open={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          onSave={handleAvatarSave}
          userId={user?.id || ''}
          currentAvatarUrl={avatarUrl}
        />
      </div>
    </StudentLayout>
  );
}
