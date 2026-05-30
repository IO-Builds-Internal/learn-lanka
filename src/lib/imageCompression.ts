/**
 * Utility to compress images on the client side using HTML5 Canvas.
 * If the file is not an image or compression fails/is not needed, it returns the original file.
 */
export const compressImage = (
  file: File,
  maxSizeBytes: number,
  onCompressStart?: () => void,
  onCompressEnd?: (compressedFile: File, savedBytes: number) => void
): Promise<File> => {
  return new Promise((resolve) => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    // If file is already smaller than the limit, no need to compress
    if (file.size <= maxSizeBytes) {
      resolve(file);
      return;
    }

    if (onCompressStart) {
      onCompressStart();
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Proportional resizing (maximum dimension of 2048px is excellent for readability)
        const maxDimension = 2048;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (onCompressEnd) onCompressEnd(file, 0);
          resolve(file);
          return;
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Iterative compression to match size limit target
        let quality = 0.85;
        const exportBlob = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                if (onCompressEnd) onCompressEnd(file, 0);
                resolve(file);
                return;
              }

              // Check if size fits within target OR quality is too low to reduce further
              if (blob.size <= maxSizeBytes || quality <= 0.15) {
                const newFileName = file.name.replace(/\.[^/.]+$/, '') + '_compressed.jpg';
                const compressedFile = new File([blob], newFileName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });

                const savedBytes = file.size - compressedFile.size;
                if (onCompressEnd) {
                  onCompressEnd(compressedFile, savedBytes);
                }
                resolve(compressedFile);
              } else {
                // Iteratively lower quality and try again
                quality -= 0.15;
                exportBlob();
              }
            },
            'image/jpeg',
            quality
          );
        };

        exportBlob();
      };
      img.onerror = () => {
        if (onCompressEnd) onCompressEnd(file, 0);
        resolve(file);
      };
    };
    reader.onerror = () => {
      if (onCompressEnd) onCompressEnd(file, 0);
      resolve(file);
    };
  });
};
