// Caminho do arquivo: src/components/spaces/CohortsTab.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Users, PlusCircle, MoreHorizontal, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/core/ConfirmationModal';

export function CohortsTab({ spaceId }: { spaceId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCohortName, setNewCohortName] = useState('');
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<any>(null);

  // FETCH
  const { data: cohorts, isLoading } = useQuery({
    queryKey: ['space-cohorts', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase.from('cohorts').select('*, enrollments(count)').eq('space_id', spaceId).order('created_at');
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!spaceId,
    // ======================= A CORREÇÃO DEFINITIVA ESTÁ AQUI =======================
    // Esta opção força a busca por dados novos sempre que a janela/aba
    // do navegador recebe foco, resolvendo o problema de cache de forma simples.
    refetchOnWindowFocus: true,
    // ===============================================================================
  });

  // MUTATIONS
  const createCohortMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.functions.invoke('create-cohort', { body: { spaceId, name } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Turma criada." });
      setNewCohortName('');
      queryClient.invalidateQueries({ queryKey: ['space-cohorts', spaceId] });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" })
  });

  const setActiveMutation = useMutation({
    mutationFn: async (cohortId: string) => {
      const { error } = await supabase.functions.invoke('set-active-cohort', { body: { space_id: spaceId, cohort_id: cohortId }});
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Turma ativa foi alterada." });
      queryClient.invalidateQueries({ queryKey: ['space-cohorts', spaceId] });
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" })
  });
  
  const deleteCohortMutation = useMutation({
    mutationFn: async (cohortId: string) => {
      const { error } = await supabase.functions.invoke('delete-cohort', { body: { cohort_id: cohortId }});
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Turma excluída." });
      queryClient.invalidateQueries({ queryKey: ['space-cohorts', spaceId] });
      setDeleteModalOpen(false);
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" })
  });

  // HANDLERS
  const handleAddCohort = () => {
    if (newCohortName.trim()) {
      createCohortMutation.mutate(newCohortName.trim());
    }
  };
  
  const handleDeleteClick = (cohort: any) => {
    setSelectedCohort(cohort);
    setDeleteModalOpen(true);
  };
  
  const confirmDelete = () => {
    if (selectedCohort) {
      deleteCohortMutation.mutate(selectedCohort.id);
    }
  };

  // Correção na renderização da contagem para ser mais robusta
  const getEnrollmentCount = (cohort: any) => {
    if (cohort.enrollments && cohort.enrollments.length > 0) {
      return cohort.enrollments[0].count;
    }
    return 0;
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5"/> Criar Nova Turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="Nome da nova turma (Ex: Turma de Setembro)" value={newCohortName} onChange={(e) => setNewCohortName(e.target.value)} />
              <Button onClick={handleAddCohort} disabled={!newCohortName.trim() || createCohortMutation.isPending}>
                {createCohortMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Criar Turma
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Turmas Existentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p>Carregando turmas...</p>}
            <div className="space-y-2">
              {cohorts?.map((cohort: any) => (
                <div key={cohort.id} className="flex justify-between items-center p-3 rounded-md border">
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{cohort.name}</p>
                    {cohort.is_active && <Badge variant="default" className="bg-green-600">Ativa</Badge>}
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Users className="h-4 w-4" /> {getEnrollmentCount(cohort)} alunos</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setActiveMutation.mutate(cohort.id)} disabled={cohort.is_active || setActiveMutation.isPending}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Definir como Ativa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(cohort)} disabled={cohort.is_active}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir a turma "${selectedCohort?.name}"? Esta ação não pode ser desfeita.`}
      />
    </>
  );
}
