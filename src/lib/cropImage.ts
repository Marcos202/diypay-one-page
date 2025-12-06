export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  maxSizeKB: number = 100
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to the cropped area
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Convert to blob with compression loop
  const maxBytes = maxSizeKB * 1024;
  let quality = 0.9;
  let blob: Blob | null = null;

  // Try to compress until we reach the target size
  while (quality > 0.1) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        'image/jpeg',
        quality
      );
    });

    if (blob && blob.size <= maxBytes) {
      break;
    }

    quality -= 0.1;
  }

  // If still too big, resize the image
  if (blob && blob.size > maxBytes) {
    const scale = Math.sqrt(maxBytes / blob.size);
    const newWidth = Math.floor(pixelCrop.width * scale);
    const newHeight = Math.floor(pixelCrop.height * scale);

    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      newWidth,
      newHeight
    );

    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        'image/jpeg',
        0.8
      );
    });
  }

  if (!blob) {
    throw new Error('Failed to create blob');
  }

  return blob;
}
