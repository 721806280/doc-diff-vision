import type * as MammothModule from 'mammoth';

type MammothImage = {
  read(format: 'base64'): Promise<string>;
  contentType: string;
};

type MammothApi = typeof MammothModule & {
  images: {
    imgElement(callback: (image: MammothImage) => Promise<{ src: string; alt: string }>): unknown;
  };
};

export async function parseDocx(file: File): Promise<string> {
  const mammoth: MammothApi = await import('mammoth');

  try {
    const arrayBuffer = await file.arrayBuffer();
    const convertImage = mammoth.images.imgElement(async (image) => ({
      src: `data:${image.contentType};base64,${await image.read('base64')}`,
      alt: '文档嵌入图片'
    }));
    const result = await mammoth.convertToHtml({ arrayBuffer }, { convertImage });

    return result.value ? result.value.trim() : '<p>（空文档）</p>';
  } catch (error) {
    console.error('[DOCX解析错误]', error);
    throw error;
  }
}
