import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VerificationRequest {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  person_type: 'pf' | 'pj';
  verification_status: string;
  created_at: string;
}

interface VerificationDetails {
  id: string;
  full_name: string;
  email: string;
  person_type: 'pf' | 'pj';
  verification_status: string;
  cpf?: string;
  phone?: string;
  birth_date?: string;
  cnpj?: string;
  company_name?: string;
  trading_name?: string;
  opening_date?: string;
  company_phone?: string;
  responsible_name?: string;
  responsible_cpf?: string;
  responsible_birth_date?: string;
  document_front_url?: string;
  document_back_url?: string;
  selfie_url?: string;
  social_contract_url?: string;
}

const VerificationPage = () => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['verification-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-verification-requests');
      if (error) throw error;
      return data as VerificationRequest[];
    }
  });

  const { data: userDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['user-verification-details', selectedUser],
    queryFn: async () => {
      if (!selectedUser) return null;
      const { data, error } = await supabase.functions.invoke('get-user-verification-details', {
        body: { user_id: selectedUser }
      });
      if (error) throw error;
      return data as VerificationDetails;
    },
    enabled: !!selectedUser
  });

  const processVerification = async (action: 'approve' | 'reject') => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase.functions.invoke('process-verification-request', {
        body: { user_id: selectedUser, action }
      });

      if (error) throw error;

      toast({
        title: action === 'approve' ? 'Cadastro aprovado!' : 'Cadastro reprovado!',
        description: `O cadastro foi ${action === 'approve' ? 'aprovado' : 'reprovado'} com sucesso.`
      });

      setSelectedUser(null);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao processar verificação',
        variant: 'destructive'
      });
    }
  };

  const getSignedUrl = async (filePath: string) => {
    try {
      const { data } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao gerar link do documento',
        variant: 'destructive'
      });
    }
  };

  const filteredRequests = requests?.filter(request => {
    const matchesSearch = request.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.verification_status === statusFilter;
    const matchesType = typeFilter === 'all' || request.person_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Reprovado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Verificação de Cadastro</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending_approval">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Reprovado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="pf">Pessoa Física (CPF)</SelectItem>
                <SelectItem value="pj">Pessoa Jurídica (CNPJ)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredRequests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Nenhuma solicitação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.person_type === 'pj' ? request.company_name : request.full_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {request.person_type === 'pf' ? 'CPF' : 'CNPJ'}
                      </Badge>
                    </TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell>{getStatusBadge(request.verification_status)}</TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(request.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Verificar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Verification Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Verificação</DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="text-center py-8">Carregando detalhes...</div>
          ) : userDetails ? (
            <div className="space-y-6">
              {/* Personal/Company Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Informações Básicas</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Email:</span> {userDetails.email}</p>
                    <p><span className="font-medium">Tipo:</span> {userDetails.person_type === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
                    <p><span className="font-medium">Status:</span> {getStatusBadge(userDetails.verification_status)}</p>
                  </div>
                </div>
              </div>

              {userDetails.person_type === 'pf' ? (
                /* Pessoa Física */
                <div className="space-y-4">
                  <h3 className="font-semibold">Dados da Pessoa Física</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><span className="font-medium">Nome Completo:</span> {userDetails.full_name}</p>
                    <p><span className="font-medium">CPF:</span> {userDetails.cpf}</p>
                    <p><span className="font-medium">Telefone:</span> {userDetails.phone}</p>
                    <p><span className="font-medium">Data de Nascimento:</span> {userDetails.birth_date ? new Date(userDetails.birth_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Documentos</h4>
                    <div className="flex flex-wrap gap-2">
                      {userDetails.document_front_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => getSignedUrl(userDetails.document_front_url!)}
                        >
                          Ver Documento (Frente)
                        </Button>
                      )}
                      {userDetails.document_back_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => getSignedUrl(userDetails.document_back_url!)}
                        >
                          Ver Documento (Verso)
                        </Button>
                      )}
                      {userDetails.selfie_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => getSignedUrl(userDetails.selfie_url!)}
                        >
                          Ver Selfie
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Pessoa Jurídica */
                <div className="space-y-4">
                  <h3 className="font-semibold">Dados da Empresa</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><span className="font-medium">CNPJ:</span> {userDetails.cnpj}</p>
                    <p><span className="font-medium">Razão Social:</span> {userDetails.company_name}</p>
                    <p><span className="font-medium">Nome Fantasia:</span> {userDetails.trading_name}</p>
                    <p><span className="font-medium">Data de Abertura:</span> {userDetails.opening_date ? new Date(userDetails.opening_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    <p><span className="font-medium">Telefone:</span> {userDetails.company_phone}</p>
                  </div>

                  <h4 className="font-semibold">Dados do Responsável</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><span className="font-medium">Nome:</span> {userDetails.responsible_name}</p>
                    <p><span className="font-medium">CPF:</span> {userDetails.responsible_cpf}</p>
                    <p><span className="font-medium">Data de Nascimento:</span> {userDetails.responsible_birth_date ? new Date(userDetails.responsible_birth_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Documentos</h4>
                    <div className="flex flex-wrap gap-2">
                      {userDetails.social_contract_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => getSignedUrl(userDetails.social_contract_url!)}
                        >
                          Ver Contrato Social
                        </Button>
                      )}
                      {userDetails.document_front_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => getSignedUrl(userDetails.document_front_url!)}
                        >
                          Ver Documento do Responsável
                        </Button>
                      )}
                      {userDetails.selfie_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => getSignedUrl(userDetails.selfie_url!)}
                        >
                          Ver Selfie do Responsável
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {userDetails.verification_status === 'pending_approval' && (
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => processVerification('reject')}
                  >
                    Reprovar Cadastro
                  </Button>
                  <Button
                    onClick={() => processVerification('approve')}
                  >
                    Aprovar Cadastro
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerificationPage;