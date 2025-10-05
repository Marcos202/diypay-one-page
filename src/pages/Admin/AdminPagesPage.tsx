import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Loader2, Copy, Eye } from 'lucide-react'; // Adicionar ícones Copy e Eye
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { ConfirmationModal } from '@/components/core/ConfirmationModal';

const AdminPagesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<any>(null);

  const { data: pages, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-get-pages');
      if (error) throw new Error(error.message);
      return data.pages;
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.functions.invoke('admin-delete-page', { body: { pageId } });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Página excluída com sucesso." });
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      setDeleteModalOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });
  
  const getPageUrl = (slug: string) => `${window.location.origin}/p/${slug}`;
  
  const copyToClipboard = (slug: string) => {
    navigator.clipboard.writeText(getPageUrl(slug));
    toast({ title: 'Link Copiado!', description: 'A URL da página foi copiada para a área de transferência.' });
  };

  const handleDeleteClick = (page: any) => {
    setSelectedPage(page);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPage) {
      deletePageMutation.mutate(selectedPage.id);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gerenciamento de Páginas</h1>
          <Button asChild>
            <Link to="/admin/pages/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Nova Página
            </Link>
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages?.map((page: any) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">
                      {page.title}
                      <p className="text-xs text-muted-foreground">/p/{page.slug}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                        {page.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="ghost" size="icon" onClick={() => copyToClipboard(page.slug)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={getPageUrl(page.slug)} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/pages/edit/${page.id}`}>
                          <Edit className="mr-2 h-3 w-3" /> Editar
                        </Link>
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(page)}>
                        <Trash2 className="mr-2 h-3 w-3" /> Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir a página "${selectedPage?.title}"? Esta ação não pode ser desfeita.`}
      />
    </>
  );
};

export default AdminPagesPage;