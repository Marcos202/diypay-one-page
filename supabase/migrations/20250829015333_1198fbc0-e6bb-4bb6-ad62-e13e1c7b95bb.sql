-- Corrigindo políticas RLS para resolver problemas de segurança

-- 1. CORRIGIR TABELA PROFILES - Customer Personal Information Could Be Harvested
-- Remover todas as políticas atuais e criar novas mais restritivas
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles; 
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Política mais restritiva: usuários só podem ver o próprio perfil
CREATE POLICY "Users can view only their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Usuários só podem atualizar o próprio perfil
CREATE POLICY "Users can update only their own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Usuários só podem inserir o próprio perfil
CREATE POLICY "Users can insert only their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins podem ver todos os perfis para verificação
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (get_current_user_role() = 'admin');

-- 2. CORRIGIR TABELA PRODUCER_FINANCIALS - Producer Banking Information Could Be Stolen
-- Remover políticas existentes e criar mais restritivas
DROP POLICY IF EXISTS "Producers can view their own financial data" ON producer_financials;
DROP POLICY IF EXISTS "Producers can update their own financial data" ON producer_financials;
DROP POLICY IF EXISTS "Producers can insert their own financial data" ON producer_financials;

-- Apenas o próprio produtor pode ver suas informações financeiras
CREATE POLICY "Producer can view only own financial data" ON producer_financials
  FOR SELECT USING (
    auth.uid() = producer_id AND 
    get_current_user_role() = 'producer'
  );

-- Apenas o próprio produtor pode atualizar suas informações financeiras  
CREATE POLICY "Producer can update only own financial data" ON producer_financials
  FOR UPDATE USING (
    auth.uid() = producer_id AND 
    get_current_user_role() = 'producer'
  );

-- Apenas o próprio produtor pode inserir suas informações financeiras
CREATE POLICY "Producer can insert only own financial data" ON producer_financials
  FOR INSERT WITH CHECK (
    auth.uid() = producer_id AND 
    get_current_user_role() = 'producer'
  );

-- 3. CORRIGIR TABELA SALES - Customer Purchase History Could Be Exposed to Competitors  
-- Remover política existente e criar mais restritiva
DROP POLICY IF EXISTS "Permitir leitura apenas para produtores e compradores" ON sales;
DROP POLICY IF EXISTS "Producers can update own product sales" ON sales;
DROP POLICY IF EXISTS "Service role can insert sales" ON sales;
DROP POLICY IF EXISTS "Service role can update sales" ON sales;

-- Apenas comprador ou produtor do produto pode ver a venda
CREATE POLICY "Buyer and producer can view sales" ON sales
  FOR SELECT USING (
    buyer_profile_id = auth.uid() OR 
    product_id IN (
      SELECT id FROM products WHERE producer_id = auth.uid()
    )
  );

-- Apenas produtor pode atualizar vendas de seus produtos
CREATE POLICY "Producer can update own product sales" ON sales
  FOR UPDATE USING (
    product_id IN (
      SELECT id FROM products WHERE producer_id = auth.uid()
    )
  ) WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE producer_id = auth.uid()
    )
  );

-- Service role pode inserir vendas (para webhooks de pagamento)
CREATE POLICY "Service role can insert sales" ON sales
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Service role pode atualizar vendas (para webhooks de pagamento)
CREATE POLICY "Service role can update sales" ON sales
  FOR UPDATE USING (auth.role() = 'service_role');

-- 4. CORRIGIR TABELA PAYMENT_GATEWAYS - Payment Gateway Credentials Could Be Stolen by Hackers
-- Remover políticas existentes e criar mais restritivas  
DROP POLICY IF EXISTS "Allow admins to read gateways" ON payment_gateways;
DROP POLICY IF EXISTS "Allow admins to update gateways" ON payment_gateways;
DROP POLICY IF EXISTS "Allow full access for service role" ON payment_gateways;

-- Apenas admins podem ver gateways (sem credenciais)
CREATE POLICY "Admins can view gateway info" ON payment_gateways
  FOR SELECT USING (get_current_user_role() = 'admin');

-- Apenas admins podem atualizar gateways
CREATE POLICY "Admins can update gateways" ON payment_gateways  
  FOR UPDATE USING (get_current_user_role() = 'admin');

-- Apenas service role pode ter acesso completo (para edge functions)
CREATE POLICY "Service role full access to gateways" ON payment_gateways
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. CORRIGIR TABELA FINANCIAL_TRANSACTIONS - Financial Transaction Data Could Be Exposed
-- Política mais restritiva para transações financeiras
DROP POLICY IF EXISTS "Producers can view their own transactions" ON financial_transactions;

-- Apenas o produtor dono das transações pode vê-las
CREATE POLICY "Producer can view only own transactions" ON financial_transactions
  FOR SELECT USING (
    producer_id = auth.uid() AND 
    get_current_user_role() = 'producer'
  );