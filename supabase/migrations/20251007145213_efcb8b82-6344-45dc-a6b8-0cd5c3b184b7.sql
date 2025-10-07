-- Atualizar a função handle_new_user para usar role do user_metadata quando disponível
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
    role
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    -- Usa a role do user_metadata se disponível, senão usa 'producer' como padrão
    COALESCE(new.raw_user_meta_data->>'role', 'producer')
  );
  RETURN new;
END;
$$;