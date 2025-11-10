import { useState, useCallback, RefObject } from 'react';

export interface ImageData {
  id: string;
  file: File;
  preview: string;
}

export interface UseImageUploadProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  inputMessage: string;
  setInputMessage: (value: string) => void;
}

export const useImageUpload = ({
  textareaRef,
  inputMessage,
  setInputMessage
}: UseImageUploadProps) => {
  const [selectedImages, setSelectedImages] = useState<ImageData[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // 在光标位置插入占位符
  const insertPlaceholderAtCursor = useCallback((placeholder: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const currentValue = inputMessage;

    // 在光标位置插入占位符
    const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
    setInputMessage(newValue);

    // 设置光标位置到占位符之后
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
      textarea.focus();
    }, 0);
  }, [inputMessage, setInputMessage, textareaRef]);

  // 处理图片文件
  const processImageFile = useCallback((file: File) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImages(prev => {
          const newImages = [...prev, {
            id,
            file,
            preview: e.target!.result as string
          }];

          // 在光标位置插入占位符 [imageN]
          const imageIndex = newImages.length;
          const placeholder = `[image${imageIndex}]`;
          insertPlaceholderAtCursor(placeholder);

          return newImages;
        });
      }
    };
    reader.readAsDataURL(file);
  }, [insertPlaceholderAtCursor]);

  // 图片选择处理
  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(file =>
      file.type.startsWith('image/') &&
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    );

    imageFiles.forEach(processImageFile);

    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  }, [processImageFile]);

  // 图片移除
  const handleImageRemove = useCallback((id: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // 图片预览
  const handleImagePreview = useCallback((preview: string) => {
    setPreviewImage(preview);
  }, []);

  // 粘贴图片
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        hasImage = true;
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
        }
      }
    }

    // 如果粘贴的是图片,阻止默认行为(防止插入DataURL)
    if (hasImage) {
      event.preventDefault();
    }
  }, [processImageFile]);

  // 拖拽相关
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer?.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(file =>
      file.type.startsWith('image/') &&
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    );

    imageFiles.forEach(processImageFile);
  }, [processImageFile]);

  // 清空图片
  const clearImages = useCallback(() => {
    setSelectedImages([]);
  }, []);

  // 转换为后端格式
  const getImagesForBackend = useCallback(() => {
    return selectedImages.map(img => ({
      id: img.id,
      data: img.preview.split(',')[1], // Remove data:image/type;base64, prefix
      mediaType: img.file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      name: img.file.name
    }));
  }, [selectedImages]);

  return {
    selectedImages,
    previewImage,
    isDragOver,
    handleImageSelect,
    handleImageRemove,
    handleImagePreview,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearImages,
    getImagesForBackend,
    setPreviewImage
  };
};
