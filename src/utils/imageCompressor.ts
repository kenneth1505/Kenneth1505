/**
 * Utility for resizing and compressing images on the client-side before upload.
 * Resolves performance issues (loading hangs) and prevents Firestore's 1MB document limit failures.
 */
export const compressAndResizeImage = (
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.7
): Promise<{ file: File; dataUrl: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Scale maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                  {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  }
                );
                const readerForDataUrl = new FileReader();
                readerForDataUrl.onloadend = () => {
                  resolve({
                    file: compressedFile,
                    dataUrl: readerForDataUrl.result as string,
                  });
                };
                readerForDataUrl.readAsDataURL(compressedFile);
              } else {
                resolve({ file, dataUrl: event.target?.result as string });
              }
            },
            "image/jpeg",
            quality
          );
        } else {
          resolve({ file, dataUrl: event.target?.result as string });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ file, dataUrl: "" });
    };
    reader.readAsDataURL(file);
  });
};
