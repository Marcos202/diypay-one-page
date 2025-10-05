import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateCPFOrCNPJ } from '@/lib/utils';
import { Upload, User, ShieldCheck, AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ProducerLayout } from '@/components/ProducerLayout';

// Schemas de validação
const basicFormSchema = z.object({
  full_name: z.string().min(1, 'Nome completo é obrigatório'),
});

const verificationFormSchema = z.object({
  person_type: z.enum(['PF', 'PJ'], { required_error: 'Selecione o tipo de pessoa' }),
  // Campos PF
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  // Campos PJ
  cnpj: z.string().optional(),
  company_name: z.string().optional(),
  trading_name: z.string().optional(),
  opening_date: z.string().optional(),
  company_phone: z.string().optional(),
  responsible_name: z.string().optional(),
  responsible_cpf: z.string().optional(),
  responsible_birth_date: z.string().optional(),
}).refine((data) => {
  if (data.person_type === 'PF') {
    return data.cpf && data.birth_date;
  }
  if (data.person_type === 'PJ') {
    return data.cnpj && data.company_name && data.opening_date && data.responsible_name && data.responsible_cpf && data.responsible_birth_date;
  }
  return true;
}, {
  message: 'Preencha todos os campos obrigatórios para o tipo selecionado',
});

type BasicFormData = z.infer<typeof basicFormSchema>;
type VerificationFormData = z.infer<typeof verificationFormSchema>;

const AccountPage = () => {
  const { profile, isGoogleUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [documentFrontFile, setDocumentFrontFile] = useState<File | null>(null);
  const [documentBackFile, setDocumentBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [socialContractFile, setSocialContractFile] = useState<File | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Formulário básico
  const basicForm = useForm<BasicFormData>({
    resolver: zodResolver(basicFormSchema),
    defaultValues: {
      full_name: '',
    }
  });

  // Formulário de verificação
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset: resetVerificationForm
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationFormSchema)
  });

  const watchPersonType = watch('person_type');

  // Pré-preencher formulários quando profile carrega
  useEffect(() => {
    if (profile) {
      basicForm.reset({
        full_name: profile.full_name || '',
      });

      // Pré-preencher formulário de verificação se dados existirem
      if (profile.person_type) {
        setValue('person_type', profile.person_type);
        
        if (profile.person_type === 'PF') {
          setValue('cpf', profile.cpf || '');
          setValue('birth_date', profile.birth_date || '');
        } else if (profile.person_type === 'PJ') {
          setValue('cnpj', profile.cnpj || '');
          setValue('company_name', profile.company_name || '');
          setValue('trading_name', profile.trading_name || '');
          setValue('opening_date', profile.opening_date || '');
          setValue('company_phone', profile.company_phone || '');
          setValue('responsible_name', profile.responsible_name || '');
          setValue('responsible_cpf', profile.responsible_cpf || '');
          setValue('responsible_birth_date', profile.responsible_birth_date || '');
        }
      }
    }
  }, [profile, basicForm, setValue]);

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .upload(path, file, { upsert: true });
    
    if (error) throw error;
    return data.path;
  };

  const onBasicSubmit = async (data: BasicFormData) => {
    setIsLoading(true);
    try {
      const updateData: any = {
        full_name: data.full_name,
      };

      // Handle password change for non-Google users
      if (!isGoogleUser && currentPassword && newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('As senhas não coincidem');
        }

        const { error } = await supabase.functions.invoke('update-user-profile', {
          body: {
            ...updateData,
            current_password: currentPassword,
            new_password: newPassword,
          }
        });

        if (error) throw error;
        
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const { error } = await supabase.functions.invoke('update-user-profile', {
          body: updateData
        });

        if (error) throw error;
      }

      toast.success('Dados atualizados com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar dados:', error);
      toast.error(error.message || 'Erro ao atualizar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: VerificationFormData) => {
    setIsLoading(true);
    try {
      const updateData: any = {
        person_type: data.person_type,
        verification_status: 'pending_approval',
      };

      // Upload de arquivos
      if (data.person_type === 'PF') {
        updateData.cpf = data.cpf;
        updateData.birth_date = data.birth_date;

        if (documentFrontFile) {
          const frontPath = await uploadFile(documentFrontFile, `${profile?.id}/document_front_${Date.now()}`);
          updateData.document_front_url = frontPath;
        }
        if (documentBackFile) {
          const backPath = await uploadFile(documentBackFile, `${profile?.id}/document_back_${Date.now()}`);
          updateData.document_back_url = backPath;
        }
        if (selfieFile) {
          const selfiePath = await uploadFile(selfieFile, `${profile?.id}/selfie_${Date.now()}`);
          updateData.selfie_url = selfiePath;
        }
      } else if (data.person_type === 'PJ') {
        updateData.cnpj = data.cnpj;
        updateData.company_name = data.company_name;
        updateData.trading_name = data.trading_name;
        updateData.opening_date = data.opening_date;
        updateData.company_phone = data.company_phone;
        updateData.responsible_name = data.responsible_name;
        updateData.responsible_cpf = data.responsible_cpf;
        updateData.responsible_birth_date = data.responsible_birth_date;

        if (socialContractFile) {
          const contractPath = await uploadFile(socialContractFile, `${profile?.id}/social_contract_${Date.now()}`);
          updateData.social_contract_url = contractPath;
        }
        if (documentFrontFile) {
          const frontPath = await uploadFile(documentFrontFile, `${profile?.id}/document_front_${Date.now()}`);
          updateData.document_front_url = frontPath;
        }
        if (documentBackFile) {
          const backPath = await uploadFile(documentBackFile, `${profile?.id}/document_back_${Date.now()}`);
          updateData.document_back_url = backPath;
        }
        if (selfieFile) {
          const selfiePath = await uploadFile(selfieFile, `${profile?.id}/selfie_${Date.now()}`);
          updateData.selfie_url = selfiePath;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile?.id);

      if (error) throw error;

      toast.success('Documentos enviados para verificação!');
      
      // Reset files
      setDocumentFrontFile(null);
      setDocumentBackFile(null);
      setSelfieFile(null);
      setSocialContractFile(null);
      
    } catch (error: any) {
      console.error('Erro ao enviar documentos:', error);
      toast.error(error.message || 'Erro ao enviar documentos');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = (fileType: 'documentFront' | 'documentBack' | 'selfie' | 'socialContract') => {
    switch(fileType) {
      case 'documentFront':
        setDocumentFrontFile(null);
        break;
      case 'documentBack':
        setDocumentBackFile(null);
        break;
      case 'selfie':
        setSelfieFile(null);
        break;
      case 'socialContract':
        setSocialContractFile(null);
        break;
    }
  };

  const FileUploadComponent = ({ 
    file, 
    onFileSelect, 
    onFileRemove, 
    accept, 
    placeholder 
  }: { 
    file: File | null; 
    onFileSelect: (file: File) => void; 
    onFileRemove: () => void;
    accept: string; 
    placeholder: string;
  }) => (
    <div className="space-y-2">
      {!file ? (
        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors">
          <input
            type="file"
            accept={accept}
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) onFileSelect(selectedFile);
            }}
            className="hidden"
            id={`file-${placeholder}`}
          />
          <label htmlFor={`file-${placeholder}`} className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{placeholder}</p>
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onFileRemove}
            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <ProducerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Minha Conta</h1>
      </div>

      {/* Layout de duas colunas para desktop, empilhado no mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Coluna Esquerda: Informações da Conta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                {...basicForm.register("full_name")}
                placeholder="Seu nome completo"
              />
              {basicForm.formState.errors.full_name && (
                <p className="text-sm text-destructive mt-1">
                  {basicForm.formState.errors.full_name.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Seção de Alteração de Senha - apenas para usuários não-Google */}
            {!isGoogleUser && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">Alterar Senha</h3>
                <div>
                  <Label htmlFor="current_password">Senha Atual</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                  />
                </div>
                <div>
                  <Label htmlFor="new_password">Nova Senha</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                  />
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              onClick={basicForm.handleSubmit(onBasicSubmit)}
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardContent>
        </Card>

        {/* Coluna Direita: Verificação de Identidade (condicional) */}
        {(profile?.verification_status === 'pending_submission' || profile?.verification_status === 'rejected') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Complete seu Cadastro
              </CardTitle>
              <CardDescription>
                Para utilizar todas as funcionalidades da plataforma, complete a verificação da sua identidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Seleção de Tipo de Pessoa */}
                <div>
                  <Label>Tipo de Pessoa</Label>
                  <RadioGroup
                    value={watchPersonType || ''}
                    onValueChange={(value) => setValue('person_type', value as 'PF' | 'PJ')}
                    className="flex flex-col space-y-2 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PF" id="pf" />
                      <Label htmlFor="pf">Pessoa Física (CPF)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PJ" id="pj" />
                      <Label htmlFor="pj">Pessoa Jurídica (CNPJ)</Label>
                    </div>
                  </RadioGroup>
                  {errors.person_type && (
                    <p className="text-sm text-destructive mt-1">{errors.person_type.message}</p>
                  )}
                </div>

                {/* Formulário PF */}
                {watchPersonType === 'PF' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        {...register('cpf')}
                        placeholder="000.000.000-00"
                      />
                      {errors.cpf && (
                        <p className="text-sm text-destructive mt-1">{errors.cpf.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="birth_date">Data de Nascimento</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        {...register('birth_date')}
                      />
                      {errors.birth_date && (
                        <p className="text-sm text-destructive mt-1">{errors.birth_date.message}</p>
                      )}
                    </div>

                    <div>
                      <Label>Documento de Identidade (Frente)</Label>
                      <FileUploadComponent
                        file={documentFrontFile}
                        onFileSelect={setDocumentFrontFile}
                        onFileRemove={() => removeFile('documentFront')}
                        accept="image/*,application/pdf"
                        placeholder="Clique para selecionar arquivo"
                      />
                    </div>

                    <div>
                      <Label>Documento de Identidade (Verso)</Label>
                      <FileUploadComponent
                        file={documentBackFile}
                        onFileSelect={setDocumentBackFile}
                        onFileRemove={() => removeFile('documentBack')}
                        accept="image/*,application/pdf"
                        placeholder="Clique para selecionar arquivo"
                      />
                    </div>

                    <div>
                      <Label>Selfie com Documento</Label>
                      <FileUploadComponent
                        file={selfieFile}
                        onFileSelect={setSelfieFile}
                        onFileRemove={() => removeFile('selfie')}
                        accept="image/*"
                        placeholder="Clique para selecionar arquivo"
                      />
                    </div>
                  </div>
                )}

                {/* Formulário PJ */}
                {watchPersonType === 'PJ' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        {...register('cnpj')}
                        placeholder="00.000.000/0001-00"
                      />
                      {errors.cnpj && (
                        <p className="text-sm text-destructive mt-1">{errors.cnpj.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="company_name">Razão Social</Label>
                      <Input
                        id="company_name"
                        {...register('company_name')}
                        placeholder="Razão social da empresa"
                      />
                      {errors.company_name && (
                        <p className="text-sm text-destructive mt-1">{errors.company_name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="trading_name">Nome Fantasia</Label>
                      <Input
                        id="trading_name"
                        {...register('trading_name')}
                        placeholder="Nome fantasia da empresa"
                      />
                    </div>

                    <div>
                      <Label htmlFor="opening_date">Data de Abertura</Label>
                      <Input
                        id="opening_date"
                        type="date"
                        {...register('opening_date')}
                      />
                      {errors.opening_date && (
                        <p className="text-sm text-destructive mt-1">{errors.opening_date.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="company_phone">Telefone da Empresa</Label>
                      <Input
                        id="company_phone"
                        {...register('company_phone')}
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div>
                      <Label htmlFor="responsible_name">Nome do Responsável</Label>
                      <Input
                        id="responsible_name"
                        {...register('responsible_name')}
                        placeholder="Nome do responsável legal"
                      />
                      {errors.responsible_name && (
                        <p className="text-sm text-destructive mt-1">{errors.responsible_name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="responsible_cpf">CPF do Responsável</Label>
                      <Input
                        id="responsible_cpf"
                        {...register('responsible_cpf')}
                        placeholder="000.000.000-00"
                      />
                      {errors.responsible_cpf && (
                        <p className="text-sm text-destructive mt-1">{errors.responsible_cpf.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="responsible_birth_date">Data de Nascimento do Responsável</Label>
                      <Input
                        id="responsible_birth_date"
                        type="date"
                        {...register('responsible_birth_date')}
                      />
                      {errors.responsible_birth_date && (
                        <p className="text-sm text-destructive mt-1">{errors.responsible_birth_date.message}</p>
                      )}
                    </div>

                    <div>
                      <Label>Contrato Social</Label>
                      <FileUploadComponent
                        file={socialContractFile}
                        onFileSelect={setSocialContractFile}
                        onFileRemove={() => removeFile('socialContract')}
                        accept="application/pdf"
                        placeholder="Clique para selecionar arquivo PDF"
                      />
                    </div>

                    <div>
                      <Label>Documento de Identidade do Responsável (Frente)</Label>
                      <FileUploadComponent
                        file={documentFrontFile}
                        onFileSelect={setDocumentFrontFile}
                        onFileRemove={() => removeFile('documentFront')}
                        accept="image/*,application/pdf"
                        placeholder="Clique para selecionar arquivo"
                      />
                    </div>

                    <div>
                      <Label>Documento de Identidade do Responsável (Verso)</Label>
                      <FileUploadComponent
                        file={documentBackFile}
                        onFileSelect={setDocumentBackFile}
                        onFileRemove={() => removeFile('documentBack')}
                        accept="image/*,application/pdf"
                        placeholder="Clique para selecionar arquivo"
                      />
                    </div>

                    <div>
                      <Label>Selfie do Responsável com Documento</Label>
                      <FileUploadComponent
                        file={selfieFile}
                        onFileSelect={setSelfieFile}
                        onFileRemove={() => removeFile('selfie')}
                        accept="image/*"
                        placeholder="Clique para selecionar arquivo"
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Enviando...' : 'Enviar para Verificação'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Seção de Status de Verificação - Centralizada abaixo da grade */}
      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              {profile?.verification_status === 'approved' && (
                <>
                  <ShieldCheck className="h-12 w-12 text-green-600 mx-auto" />
                  <p className="text-xl font-semibold text-green-600">✅ Identidade Verificada</p>
                  <p className="text-sm text-muted-foreground">
                    Sua conta foi verificada com sucesso!
                  </p>
                </>
              )}
              
              {profile?.verification_status === 'pending_approval' && (
                <>
                  <Clock className="h-12 w-12 text-yellow-600 mx-auto" />
                  <p className="text-xl font-semibold text-yellow-600">🕐 Aguardando Verificação</p>
                  <p className="text-sm text-muted-foreground">
                    Seus documentos estão sendo analisados. Em breve você receberá uma resposta.
                  </p>
                </>
              )}
              
              {profile?.verification_status === 'rejected' && (
                <>
                  <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
                  <p className="text-xl font-semibold text-red-600">❌ Verificação Recusada</p>
                  <p className="text-sm text-muted-foreground">
                    Por favor, revise e reenvie seus documentos utilizando o formulário acima.
                  </p>
                </>
              )}
              
              {profile?.verification_status === 'pending_submission' && (
                <>
                  <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto" />
                  <p className="text-xl font-semibold text-orange-600">⚠️ Verificação Pendente</p>
                  <p className="text-sm text-muted-foreground">
                    Complete o envio dos seus documentos utilizando o formulário acima para verificar sua identidade.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProducerLayout>
  );
};

export default AccountPage;