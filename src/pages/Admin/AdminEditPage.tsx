import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ExternalLink } from 'lucide-react';

const pageSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  slug: z.string().min(3, "A URL é obrigatória.").regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens."),
  content: z.string().optional(),
  status: z.enum(['draft', 'published']),
});

type PageFormValues = z.infer<typeof pageSchema>;

const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const AdminEditPage = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!pageId;

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['admin-page', pageId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-get-page-details', { body: { pageId } });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: isEditing,
  });

  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: { title: '', slug: '', content: '', status: 'draft' },
  });
  
  const slugValue = form.watch('slug');

  useEffect(() => {
    if (pageData) {
      form.reset(pageData);
    }
  }, [pageData, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: PageFormValues) => {
      const functionName = isEditing ? 'admin-update-page' : 'admin-create-page';
      const body = isEditing ? { pageId, ...values } : values;
      const { error } = await supabase.functions.invoke(functionName, { body });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Sucesso!', description: `Página ${isEditing ? 'atualizada' : 'criada'} com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      navigate('/admin/pages');
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('title', e.target.value);
    if (!form.formState.dirtyFields.slug) {
      form.setValue('slug', slugify(e.target.value));
    }
  };

  if (isLoading && isEditing) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => mutate(d))} className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{isEditing ? 'Editar Página' : 'Criar Nova Página'}</h1>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/admin/pages')}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Informações Principais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl><Input {...field} onChange={handleTitleChange} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL (Slug)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  {slugValue && (
                    <div className="text-sm text-muted-foreground mt-2">
                      <span>URL Final: </span>
                      <a href={`/p/${slugValue}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {`${window.location.origin}/p/${slugValue}`}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  {/* === A CORREÇÃO ESTÁ AQUI === */}
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Conteúdo</CardTitle></CardHeader>
            <CardContent>
               <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="bg-white">
                      <ReactQuill theme="snow" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};

export default AdminEditPage;
