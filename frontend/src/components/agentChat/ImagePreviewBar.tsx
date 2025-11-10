import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ImageData } from '../../hooks/agentChat/useImageUpload';

export interface ImagePreviewBarProps {
  images: ImageData[];
  onImagePreview: (preview: string) => void;
  onImageRemove: (id: string) => void;
}

export const ImagePreviewBar: React.FC<ImagePreviewBarProps> = ({
  images,
  onImagePreview,
  onImageRemove
}) => {
  const { t } = useTranslation('components');

  if (images.length === 0) return null;

  return (
    <div className="p-4 pb-2 border-b border-gray-100 dark:border-gray-700">
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <div key={img.id} className="relative group">
            <img
              src={img.preview}
              alt={t('agentChat.imagePreview')}
              className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onImagePreview(img.preview)}
            />
            <button
              onClick={() => onImageRemove(img.id)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
              title={t('agentChat.deleteImage')}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
