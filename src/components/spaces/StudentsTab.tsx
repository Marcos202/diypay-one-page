import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Mail, RefreshCcw, UserX, Users } from 'lucide-react';

const fetchStudents = async (productId: string) => {
  const { data, error } = await supabase.functions.invoke('get-space-enrollments', {
    body: { productId },
  });
  if (error) throw new Error(error.message);
  return data;
};

export function StudentsTab({ productId }: { productId: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  const { data: students, isLoading, isError, error } = useQuery({
    queryKey: ['space-students', productId],
    queryFn: () => fetchStudents(productId),
    enabled: !!productId,
  });

  const resendAccessMutation = useMutation({
    mutationFn: async (studentUserId: string) => {
      const { error } = await supabase.functions.invoke('resend-access-email', {
        body: { studentUserId },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "O e-mail de acesso foi reenviado para o aluno." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const filteredStudents = students?.filter((student: any) =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="flex items-center justify-center gap-2">
          <Users className="h-5 w-5 animate-pulse" />
          <span>Carregando alunos...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-destructive">
        <p>Erro ao carregar alunos: {error?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">
            Alunos Matriculados ({filteredStudents.length})
          </h3>
        </div>
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Data de Inscrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student: any) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-muted-foreground">{student.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={student.progress} className="w-24" />
                      <span className="text-sm text-muted-foreground">
                        {student.progress}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({student.completed_lessons}/{student.total_lessons})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(student.enrolled_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem 
                          onClick={() => resendAccessMutation.mutate(student.id)} 
                          disabled={resendAccessMutation.isPending}
                        >
                          <Mail className="mr-2 h-4 w-4"/>
                          Reenviar Acesso
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <RefreshCcw className="mr-2 h-4 w-4"/>
                          Resetar Progresso
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" disabled>
                          <UserX className="mr-2 h-4 w-4"/>
                          Revogar Acesso
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  {searchTerm ? 'Nenhum aluno encontrado com esses critérios.' : 'Nenhum aluno matriculado ainda.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}