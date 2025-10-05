import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { z, ZodErrorMap } from 'zod'; // 1. Importar o Zod

// 2. Definir o mapa de erros customizado para tradução
const customErrorMap: ZodErrorMap = (issue, ctx) => {
  // Verifica se o erro é de um campo obrigatório que não foi preenchido
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.received === 'undefined') {
      return { message: 'Obrigatório' };
    }
  }

  // Para todos os outros erros, mantém a mensagem padrão do Zod
  return { message: ctx.defaultError };
};

// 3. Aplicar o mapa de erros globalmente para toda a aplicação
z.setErrorMap(customErrorMap);

// 4. Renderizar a aplicação normalmente
createRoot(document.getElementById("root")!).render(<App />);
