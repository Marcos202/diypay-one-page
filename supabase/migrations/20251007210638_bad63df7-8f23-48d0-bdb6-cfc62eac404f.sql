-- FASE 1: Corrigir a trigger handle_new_user() para incluir phone e cpf_cnpj do user_metadata
-- Isso garante que esses dados sejam salvos na criação inicial do perfil

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    phone,
    cpf_cnpj,
    role
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'cpf_cnpj',
    COALESCE(new.raw_user_meta_data->>'role', 'producer')
  );
  RETURN new;
END;
$$;