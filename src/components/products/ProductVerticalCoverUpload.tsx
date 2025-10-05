import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UploadCloud, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductVerticalCoverUploadProps {
  onUploadSuccess: (url: string) => void;
  initialUrl?: string;
  userId: string;
}

const BUCKET_NAME = 'product-covers';
const MAX_SIZE_KB = 150;

export const ProductVerticalCoverUpload = ({ onUploadSuccess, initialUrl = '', userId }: ProductVerticalCoverUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>(initialUrl);

  // Sincroniza o estado interno com mudanças no initialUrl
  useEffect(() => {
    setUploadedUrl(initialUrl);
  }, [initialUrl]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !userId) return;

    if (file.size > MAX_SIZE_KB * 1024) {
      toast.error(`A imagem é muito grande. O tamanho máximo é de ${MAX_SIZE_KB} KB.`);
      return;
    }

    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = async () => {
      URL.revokeObjectURL(image.src);
      // Verificar se a proporção está correta (9:16)
      const aspectRatio = image.width / image.height;
      const targetAspectRatio = 9 / 16;
      const tolerance = 0.01; // Tolerância para pequenas diferenças de arredondamento
      
      if (Math.abs(aspectRatio - targetAspectRatio) > tolerance) {
        toast.error('A imagem deve ter proporção 9:16 (ex: 360×640px, 720×1280px).');
        return;
      }

      setUploading(true);
      const toastId = toast.loading('Enviando imagem...');
      
      try {
        if (uploadedUrl) {
            const oldFilePath = new URL(uploadedUrl).pathname.split(`/${BUCKET_NAME}/`)[1];
            if (oldFilePath) await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
        }

        const fileExtension = file.name.split('.').pop();
        const filePath = `${userId}/vertical_${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        
        setUploadedUrl(publicUrl);
        onUploadSuccess(publicUrl);
        toast.success('Imagem vertical enviada com sucesso!', { id: toastId });

      } catch (err: any) {
        toast.error('Falha no upload', { id: toastId, description: err.message });
      } finally {
        setUploading(false);
      }
    };
  }, [userId, onUploadSuccess, uploadedUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
  });

  const handleRemoveImage = async () => {
    if (!uploadedUrl) return;
    const toastId = toast.loading('Removendo imagem...');
    try {
        const oldFilePath = new URL(uploadedUrl).pathname.split(`/${BUCKET_NAME}/`)[1];
        if(oldFilePath) await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
        setUploadedUrl('');
        onUploadSuccess('');
        toast.success('Imagem removida.', { id: toastId });
    } catch(err: any) {
        toast.error('Falha ao remover', { id: toastId, description: err.message });
    }
  };

  if (uploading) return <div className="w-full h-[240px] border-2 border-dashed rounded-lg flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  if (uploadedUrl) return <div className="w-full h-[240px] flex items-center justify-center"><div className="relative w-36 max-h-64 border rounded-lg group"><img src={uploadedUrl} alt="Capa Vertical" className="w-full h-full object-cover rounded-lg" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"><Button type="button" variant="destructive" size="icon" onClick={handleRemoveImage}><X className="h-5 w-5" /></Button></div></div></div>;
  
  return (
    <div {...getRootProps()} className={`w-full h-[240px] border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors flex items-center justify-center ${ isDragActive ? 'border-primary bg-primary/10' : 'border-border' }`}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <UploadCloud className="h-10 w-10" />
        <p className="text-sm">Arraste uma imagem ou clique aqui</p>
        <p className="text-xs">Recomendado: Proporção 9:16 | 360×640px</p>
        <p className="text-xs">JPG, PNG, WEBP (Máx: 150KB)</p>
      </div>
    </div>
  );
};