
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Users, Search, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Producer {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  total_revenue: number;
  total_sales_count: number;
}

const AdminProducersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: producersData, isLoading, error } = useQuery({
    queryKey: ['admin-producers-list'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producers-list');
      
      if (error) {
        throw new Error(error.message || 'Erro ao buscar produtores');
      }
      
      return data as { producers: Producer[] };
    },
  });

  const producers = producersData?.producers || [];

  // Filter producers based on search term
  const filteredProducers = producers.filter(producer => 
    producer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-destructive">Erro ao carregar produtores: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gestão de Produtores</h1>
        <p className="text-muted-foreground mt-2">
          Visualize e gerencie todos os produtores da plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Produtores
          </CardTitle>
          <CardDescription>
            {producers.length} produtores cadastrados na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Producers Table */}
          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Carregando produtores...</p>
            </div>
          ) : filteredProducers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum produtor encontrado com os critérios de busca.' : 'Nenhum produtor cadastrado.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produtor</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead>Total de Vendas</TableHead>
                  <TableHead>Receita Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducers.map((producer) => (
                  <TableRow key={producer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {producer.full_name || 'Nome não informado'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {producer.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(producer.created_at)}
                    </TableCell>
                    <TableCell>
                      {producer.total_sales_count}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(producer.total_revenue)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Ativo</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            Gerenciar Conta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProducersPage;
