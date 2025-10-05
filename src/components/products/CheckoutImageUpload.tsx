import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UploadCloud, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckoutImageUploadProps {
  onUploadSuccess: (url: string) => void;
  initialUrl?: string;
  userId: string;
}

const BUCKET_NAME = 'product-checkout-images'; // Bucket dedicado

export const CheckoutImageUpload = ({ onUploadSuccess, initialUrl = '', userId }: CheckoutImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>(initialUrl);

  useEffect(() => {
    setUploadedUrl(initialUrl);
  }, [initialUrl]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !userId) return;

    // Validação de tamanho: máximo 300KB
    const maxSizeInBytes = 300 * 1024; // 300KB
    if (file.size > maxSizeInBytes) {
      toast.error('Arquivo muito grande. O tamanho máximo permitido é 300KB.');
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
      const filePath = `${userId}/${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      
      setUploadedUrl(publicUrl);
      onUploadSuccess(publicUrl);
      toast.success('Imagem enviada com sucesso!', { id: toastId });

    } catch (err: any) {
      toast.error('Falha no upload', { id: toastId, description: err.message });
    } finally {
      setUploading(false);
    }
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
        // Só remove do storage se for uma imagem do Supabase
        if (uploadedUrl.includes('supabase.co/storage')) {
          const oldFilePath = new URL(uploadedUrl).pathname.split(`/${BUCKET_NAME}/`)[1];
          if(oldFilePath) await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
        }
        setUploadedUrl('');
        onUploadSuccess('');
        toast.success('Imagem removida.', { id: toastId });
    } catch(err: any) {
        toast.error('Falha ao remover', { id: toastId, description: err.message });
    }
  };

  if (uploading) return <div className="border-2 border-dashed rounded-lg p-8 h-[150px] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  if (uploadedUrl) return <div className="relative w-full max-w-sm border rounded-lg group"><img src={uploadedUrl} alt="Preview do Checkout" className="w-full h-auto object-cover rounded-lg" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"><Button type="button" variant="destructive" size="icon" onClick={handleRemoveImage}><X className="h-5 w-5" /></Button></div></div>;
  
  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${ isDragActive ? 'border-primary bg-primary/10' : 'border-border' }`}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <UploadCloud className="h-10 w-10" />
        <p className="text-sm">Arraste uma imagem ou clique aqui para fazer o upload</p>
        <p className="text-xs">Recomendado: 670×360px ou 1000×500px</p>
      </div>
    </div>
  );
};