-- Passo 1: Remover as políticas perigosas que tornam a tabela pública.
-- Estas são as regras "USING (true)" que anulam toda a segurança.
DROP POLICY "Anyone can view sales by exact ID for payment confirmation" ON public.sales;
DROP POLICY "Anyone can view sales by id" ON public.sales;

-- Passo 2: Remover políticas antigas que agora são redundantes.
-- A nossa nova política "Permitir leitura apenas para produtores e compradores" já cobre estes casos.
DROP POLICY "Buyers can view their own purchases" ON public.sales;
DROP POLICY "Producers can view sales of their products" ON public.sales;