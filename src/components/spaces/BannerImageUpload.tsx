import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Image, Loader2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const BUCKET_NAME = 'uploads';

interface BannerImageUploadProps {
  onUploadSuccess: (url: string) => void;
  value?: string;
  userId: string;
}

export const BannerImageUpload: React.FC<BannerImageUploadProps> = ({
  onUploadSuccess,
  value = '',
  userId,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>(value);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Sincronizar estado interno com prop value
  useEffect(() => {
    setUploadedUrl(value);
  }, [value]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !userId) return;

    const file = acceptedFiles[0];
    
    // Validar tamanho do arquivo (250KB)
    if (file.size > 256000) {
      toast.error('Arquivo muito grande. O tamanho máximo é 250KB.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Enviando banner...');

    try {
      // Se já existe uma imagem, remove a antiga
      if (uploadedUrl && uploadedUrl.includes('supabase.co/storage')) {
        console.log('Removendo imagem anterior:', uploadedUrl);
        const oldFilePath = new URL(uploadedUrl).pathname.split(`/${BUCKET_NAME}/`)[1];
        if (oldFilePath) {
          console.log('Path da imagem anterior:', oldFilePath);
          const { error: removeError } = await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
          if (removeError) {
            console.error('Erro ao remover imagem anterior:', removeError);
          } else {
            console.log('Imagem anterior removida com sucesso');
          }
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/banners/${fileName}`;

      console.log('Fazendo upload para:', filePath);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      console.log('Upload concluído. URL:', publicUrl);

      setUploadedUrl(publicUrl);
      onUploadSuccess(publicUrl);
      toast.success('Banner enviado com sucesso!', { id: toastId });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da imagem', { 
        id: toastId,
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setUploading(false);
    }
  }, [uploadedUrl, onUploadSuccess, userId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
  });

  const handleRemoveImage = async () => {
    if (!uploadedUrl) return;
    
    console.log('Iniciando remoção de imagem:', uploadedUrl);
    const toastId = toast.loading('Removendo banner...');
    
    // Só remove do storage se for uma imagem do Supabase
    if (uploadedUrl.includes('supabase.co/storage')) {
      try {
        const urlObj = new URL(uploadedUrl);
        const fullPath = urlObj.pathname;
        console.log('URL completa sendo parseada:', uploadedUrl);
        console.log('Path completo extraído:', fullPath);
        
        const pathParts = fullPath.split(`/${BUCKET_NAME}/`);
        if (pathParts.length > 1) {
          const oldFilePath = pathParts[1];
          console.log('Path da imagem a remover:', oldFilePath);
          
          const { error: removeError } = await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
          if (removeError) {
            console.error('Erro do Supabase ao remover arquivo:', removeError);
            console.error('Tentativa de remoção no path:', oldFilePath);
            // Não fazer throw - apenas log do erro mas continuar com a limpeza da UI
          } else {
            console.log('Arquivo removido do storage com sucesso:', oldFilePath);
          }
        } else {
          console.warn('Não foi possível extrair o path do arquivo da URL:', uploadedUrl);
        }
      } catch (parseError) {
        console.error('Erro ao fazer parse da URL:', parseError);
        console.error('URL que causou o erro:', uploadedUrl);
        // Continuar mesmo com erro de parse
      }
    } else {
      console.log('URL externa detectada - não removendo do storage:', uploadedUrl);
    }
    
    // Sempre limpar a UI independentemente do resultado da remoção do storage
    setUploadedUrl('');
    setUrlInput('');
    onUploadSuccess('');
    toast.success('Banner removido com sucesso!', { id: toastId });
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    
    const url = urlInput.trim();
    setUploadedUrl(url);
    onUploadSuccess(url);
    setShowUrlInput(false);
    setUrlInput('');
    toast.success('URL da imagem adicionada!');
  };

  const handleUrlCancel = () => {
    setShowUrlInput(false);
    setUrlInput('');
  };

  if (uploading) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-muted/10">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Enviando banner...</p>
      </div>
    );
  }

  if (uploadedUrl) {
    return (
      <div className="space-y-3">
        <div className="relative aspect-[25/12] w-full max-w-md border rounded-lg overflow-hidden bg-muted">
          <img
            src={uploadedUrl}
            alt="Banner preview"
            className="w-full h-full object-cover"
          />
          <Button
            onClick={handleRemoveImage}
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Dimensão recomendada: 1500 x 720 pixels • Máximo: 250KB
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/10' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/10'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {isDragActive ? 'Solte a imagem aqui' : 'Fazer upload do banner'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Arraste e solte ou clique para selecionar
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Image className="h-3 w-3" />
          <span>PNG, JPG, JPEG, GIF, WebP</span>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Dimensão recomendada: 1500 x 720 pixels • Máximo: 250KB
        </p>
      </div>
      
      {!showUrlInput ? (
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowUrlInput(true)}
            className="gap-2"
          >
            <Link className="h-4 w-4" />
            Usar URL de imagem
          </Button>
        </div>
      ) : (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/5">
          <h4 className="text-sm font-medium text-foreground">Inserir URL da imagem</h4>
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUrlSubmit();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
              size="sm"
            >
              Usar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleUrlCancel}
              size="sm"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};