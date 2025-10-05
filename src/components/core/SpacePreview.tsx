// src/components/core/SpacePreview.tsx

interface SpacePreviewProps {
  name: string;
  slug: string;
}

export function SpacePreview({ name, slug }: SpacePreviewProps) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-4 h-full flex flex-col">
      {/* Barra do Navegador Falsa */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      </div>
      <div className="bg-gray-700 rounded-md p-2 text-xs text-gray-400 mb-4 truncate">
        diypay.com.br/members/{slug || "..."}
      </div>

      {/* Conteúdo da Vitrine Falsa */}
      <div className="flex-grow bg-gray-900 rounded-md p-6">
        <h1 className="text-2xl font-bold text-white mb-6">{name || "Nome da sua Área de Membros"}</h1>
        <div className="grid grid-cols-3 gap-4">
          {/* Placeholders de Produtos */}
          <div className="aspect-[2/3] bg-gray-700 rounded-md animate-pulse"></div>
          <div className="aspect-[2/3] bg-gray-700 rounded-md animate-pulse delay-75"></div>
          <div className="aspect-[2/3] bg-gray-700 rounded-md animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  );
}