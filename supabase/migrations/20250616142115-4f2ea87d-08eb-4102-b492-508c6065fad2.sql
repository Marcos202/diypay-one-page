
-- Habilitar Realtime para a tabela sales
ALTER TABLE public.sales REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação do Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;

-- Criar política RLS para permitir leitura das vendas por ID (para usuários não autenticados)
-- Isso permite que qualquer pessoa com o sale_id possa monitorar aquela venda específica
CREATE POLICY "Anyone can view sales by id" ON public.sales
FOR SELECT USING (true);

-- Política para permitir atualizações apenas pelo sistema (webhooks)
CREATE POLICY "System can update sales" ON public.sales
FOR UPDATE USING (true);

-- Habilitar RLS na tabela sales se ainda não estiver habilitado
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
