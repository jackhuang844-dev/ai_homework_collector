// lib/image-processor.ts
import { UploadedImage } from "@/types";

/**
 * 核心：前端 Canvas 智能压缩引擎
 * 限制最大边长为 1500px，画质 0.7，完美绕过 Vercel 4.5MB 限制
 */
export async function processAndCompressImages(files: File[]): Promise<UploadedImage[]> {
  const processedImages = await Promise.all(
    files.map((file) => {
      return new Promise<UploadedImage>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;
            const MAX_DIMENSION = 1500;

            // 等比例缩放
            if (w > h && w > MAX_DIMENSION) {
              h *= MAX_DIMENSION / w;
              w = MAX_DIMENSION;
            } else if (h > MAX_DIMENSION) {
              w *= MAX_DIMENSION / h;
              h = MAX_DIMENSION;
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
            }

            // 强制转换为 jpeg 格式，压缩率 0.7
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const data = compressedDataUrl.split(',')[1];

            resolve({
              data,
              mimeType: 'image/jpeg',
              preview: compressedDataUrl,
            });
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    })
  );

  return processedImages;
}
