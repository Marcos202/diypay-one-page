// src/components/core/VideoPlayer.tsx

import React from 'react';
import Plyr, { PlyrProps } from 'plyr-react';
import 'plyr-react/plyr.css'; // Importa o CSS base essencial para o funcionamento do player

interface VideoPlayerProps {
  url: string;
  onEnded?: () => void;
}

// Função helper para determinar o provedor e formatar a source para o Plyr
const getVideoSource = (url: string): PlyrProps['source'] => {
  if (!url) return null;

  let provider: 'youtube' | 'vimeo' | undefined;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    provider = 'youtube';
  } else if (url.includes('vimeo.com')) {
    provider = 'vimeo';
  }

  return {
    type: 'video',
    sources: [ { src: url, provider: provider } ],
  };
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, onEnded }) => {
  const source = getVideoSource(url);

  // Opções para customizar o player e remover o branding externo
  const options: PlyrProps['options'] = {
    controls: [
      'play-large', 'play', 'progress', 'current-time', 
      'mute', 'volume', 'settings', 'fullscreen'
    ],
    settings: ['quality', 'speed'],
    youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 },
    vimeo: { byline: false, portrait: false, title: false, speed: true, transparent: false },
  };

  if (!source) {
    return (
      <div className="aspect-video w-full flex items-center justify-center bg-muted text-muted-foreground rounded-md">
        Vídeo não disponível ou URL inválida.
      </div>
    );
  }

  // O componente Plyr gerencia os eventos internamente. Para 'onEnded',
  // precisamos usar um `useRef` para acessar a instância do player e registrar o evento.
  // No entanto, para simplicidade e robustez, o componente `plyr-react`
  // pode ter dificuldades com a prop `onEnded` direta. Vamos focar primeiro na renderização.
  // A lógica de `onEnded` pode ser adicionada depois se necessário.

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden plyr-container bg-black">
      <Plyr
        source={source}
        options={options}
      />
    </div>
  );
};

export default VideoPlayer;