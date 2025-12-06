import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Upload } from 'lucide-react';
import { getCroppedImg, Area } from '@/lib/cropImage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AvatarUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (avatarUrl: string) => void;
  userId: string;
  currentAvatarUrl?: string | null;
}

export function AvatarUploadModal({
  open,
  onClose,
  onSave,
  userId,
}: AvatarUploadModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast.error('Por favor, selecione e ajuste uma imagem');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Get cropped image (max 100KB)
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 100);

      // 2. Verify final size
      if (croppedBlob.size > 100 * 1024) {
        toast.error('Não foi possível reduzir a imagem para menos de 100KB. Tente uma imagem menor.');
        setIsLoading(false);
        return;
      }

      // 3. Generate unique filename
      const fileName = `${userId}/avatar_${Date.now()}.jpg`;

      // 4. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // 5. Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 6. Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast.success('Foto atualizada com sucesso!');
      onSave(urlData.publicUrl);
      handleClose();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Erro ao salvar foto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar Foto de Perfil</DialogTitle>
          <DialogDescription>
            {imageSrc 
              ? 'Ajuste sua foto arrastando e usando o zoom' 
              : 'Selecione uma imagem do seu dispositivo'
            }
          </DialogDescription>
        </DialogHeader>

        {!imageSrc ? (
          // File selection area
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-all">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              id="avatar-file-input"
            />
            <label htmlFor="avatar-file-input" className="cursor-pointer block">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WebP • Máximo 100KB após corte
              </p>
            </label>
          </div>
        ) : (
          <>
            {/* Crop area */}
            <div className="relative h-64 w-full rounded-xl overflow-hidden bg-muted">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom control */}
            <div className="flex items-center gap-3 px-2">
              <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>

            {/* Size indicator */}
            <p className="text-xs text-muted-foreground text-center">
              A imagem será comprimida automaticamente para no máximo 100KB
            </p>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          {imageSrc && (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Foto'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
