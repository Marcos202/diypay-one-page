/**
 * Traduz mensagens de erro de autenticação do Supabase para português
 */
export const translateAuthError = (error: string): string => {
  const translations: Record<string, string> = {
    // Login errors
    "Invalid login credentials": "Credenciais inválidas. Verifique seu e-mail e senha e tente novamente.",
    "Email not confirmed": "E-mail não confirmado. Verifique sua caixa de entrada.",
    "User not found": "Usuário não encontrado.",
    "Too many requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "Invalid email or password": "Credenciais inválidas. Verifique seu e-mail e senha e tente novamente.",
    
    // Signup errors
    "User already registered": "Este e-mail já está cadastrado.",
    "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
    "Signup requires a valid password": "A senha é obrigatória.",
    "Unable to validate email address: invalid format": "Formato de e-mail inválido.",
    
    // Password strength errors (Supabase returns long messages)
    "Password should contain at least one character of each": "A senha deve conter letras maiúsculas, letras minúsculas, números e símbolos.",
  };

  // Check for exact match
  if (translations[error]) {
    return translations[error];
  }

  // Check for partial match (for long error messages)
  for (const [key, translation] of Object.entries(translations)) {
    if (error.includes(key)) {
      return translation;
    }
  }

  // Return original if no translation found
  return error;
};
