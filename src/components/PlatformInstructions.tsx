import { PlatformOS, BrowserType } from '@/hooks/usePlatformDetection';

interface InstructionStep {
  text: string;
  note?: string;
}

export const getPlatformInstructions = (
  platform: PlatformOS,
  browser: BrowserType
): InstructionStep[] => {
  const instructions: Record<string, Record<string, InstructionStep[]>> = {
    ios: {
      safari: [
        { text: 'Toque no botão de compartilhar', note: '(ícone de quadrado com seta para cima)' },
        { text: 'No menu que abrir, role para baixo' },
        { text: 'Toque em "Adicionar à Tela de Início"' },
        { text: 'Personalize o nome se desejar' },
        { text: 'Toque em "Adicionar" no canto superior direito' },
        { text: 'O ícone do DiyPay aparecerá na sua tela inicial' }
      ],
      chrome: [
        { text: 'Toque no menu', note: '(três pontos no canto superior)' },
        { text: 'Selecione "Adicionar à tela inicial"' },
        { text: 'Toque em "Adicionar"' }
      ],
      firefox: [
        { text: 'Toque no ícone de compartilhar na barra inferior' },
        { text: 'Selecione "Adicionar à Tela de Início"' },
        { text: 'Confirme tocando em "Adicionar"' }
      ],
      unknown: [
        { text: 'Abra o menu do navegador' },
        { text: 'Procure por "Adicionar à tela inicial" ou "Compartilhar"' },
        { text: 'Siga as instruções para adicionar o app' }
      ]
    },
    android: {
      chrome: [
        { text: 'Toque no menu', note: '(três pontos no canto superior)' },
        { text: 'Selecione "Instalar app" ou "Adicionar à tela inicial"' },
        { text: 'Confirme a instalação' },
        { text: 'O app será instalado como um aplicativo nativo' }
      ],
      firefox: [
        { text: 'Toque no menu', note: '(três pontos)' },
        { text: 'Selecione "Instalar"' },
        { text: 'Confirme a instalação' }
      ],
      samsung: [
        { text: 'Toque no menu', note: '(três linhas)' },
        { text: 'Selecione "Adicionar página a"' },
        { text: 'Escolha "Tela inicial"' },
        { text: 'Toque em "Adicionar"' }
      ],
      edge: [
        { text: 'Toque no menu', note: '(três pontos)' },
        { text: 'Selecione "Adicionar à tela inicial"' },
        { text: 'Confirme a instalação' }
      ],
      unknown: [
        { text: 'Abra o menu do navegador' },
        { text: 'Procure por "Instalar app" ou "Adicionar à tela inicial"' },
        { text: 'Siga as instruções para instalar' }
      ]
    },
    windows: {
      chrome: [
        { text: 'Clique no ícone de instalação', note: '(na barra de endereço)' },
        { text: 'Ou vá em Menu → Instalar DiyPay' },
        { text: 'Confirme clicando em "Instalar"' },
        { text: 'O app será instalado no Windows' }
      ],
      edge: [
        { text: 'Clique no ícone de instalação na barra de endereço' },
        { text: 'Ou vá em Menu (•••) → Aplicativos → Instalar este site como um app' },
        { text: 'Confirme a instalação' }
      ],
      firefox: [
        { text: 'Firefox não suporta instalação de PWA no Windows' },
        { text: 'Recomendamos usar Chrome ou Edge para instalar o app' },
        { text: 'Você pode continuar usando no navegador normalmente' }
      ],
      opera: [
        { text: 'Clique no menu Opera (O no canto superior)' },
        { text: 'Vá em Página → Instalar DiyPay' },
        { text: 'Confirme a instalação' }
      ],
      unknown: [
        { text: 'Procure pelo ícone de instalação na barra de endereço' },
        { text: 'Ou abra o menu do navegador' },
        { text: 'Procure por "Instalar app" ou "Instalar site"' }
      ]
    },
    macos: {
      safari: [
        { text: 'Clique em "Arquivo" no menu superior' },
        { text: 'Selecione "Adicionar à Dock"' },
        { text: 'O app aparecerá no Dock como um aplicativo' }
      ],
      chrome: [
        { text: 'Clique no ícone de instalação na barra de endereço' },
        { text: 'Ou vá em Menu (⋮) → Instalar DiyPay' },
        { text: 'Confirme a instalação' }
      ],
      edge: [
        { text: 'Clique no ícone de instalação na barra de endereço' },
        { text: 'Ou vá em Menu (•••) → Aplicativos → Instalar este site' },
        { text: 'Confirme a instalação' }
      ],
      firefox: [
        { text: 'Firefox não suporta instalação de PWA no macOS' },
        { text: 'Recomendamos usar Safari, Chrome ou Edge' },
        { text: 'Você pode continuar usando no navegador' }
      ],
      unknown: [
        { text: 'Procure pelo ícone de instalação na barra de endereço' },
        { text: 'Ou abra o menu do navegador' },
        { text: 'Procure por "Instalar app"' }
      ]
    },
    linux: {
      chrome: [
        { text: 'Clique no ícone de instalação na barra de endereço' },
        { text: 'Ou vá em Menu (⋮) → Instalar DiyPay' },
        { text: 'Confirme a instalação' },
        { text: 'O app será adicionado ao menu de aplicativos' }
      ],
      firefox: [
        { text: 'Firefox não suporta instalação de PWA no Linux' },
        { text: 'Recomendamos usar Chrome ou Chromium' },
        { text: 'Você pode continuar usando no navegador' }
      ],
      edge: [
        { text: 'Clique no ícone de instalação na barra de endereço' },
        { text: 'Ou vá em Menu (•••) → Aplicativos → Instalar este site' },
        { text: 'Confirme a instalação' }
      ],
      unknown: [
        { text: 'Procure pelo ícone de instalação na barra de endereço' },
        { text: 'Ou abra o menu do navegador' },
        { text: 'Procure por "Instalar app"' }
      ]
    },
    unknown: {
      unknown: [
        { text: 'Para instalar este app:' },
        { text: 'Procure pelo ícone de instalação na barra de endereço do navegador' },
        { text: 'Ou abra o menu do navegador e procure por "Instalar app"' },
        { text: 'Siga as instruções do seu navegador' }
      ]
    }
  };

  const platformInstructions = instructions[platform] || instructions.unknown;
  const browserInstructions = platformInstructions[browser] || platformInstructions.unknown || instructions.unknown.unknown;

  return browserInstructions;
};

export const getPlatformName = (platform: PlatformOS): string => {
  const names: Record<PlatformOS, string> = {
    windows: 'Windows',
    android: 'Android',
    ios: 'iPhone/iPad',
    macos: 'macOS',
    linux: 'Linux',
    unknown: 'seu dispositivo'
  };
  return names[platform];
};
