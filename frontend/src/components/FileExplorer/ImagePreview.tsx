import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaImage } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';

interface ImagePreviewProps {
  imageUrl: string;
  fileName: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl, fileName }) => {
  const { t } = useTranslation('components');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="flex items-center justify-center h-full p-4">
      {hasError ? (
        <div className="text-center text-gray-500">
          <FaImage className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>{t('fileExplorer.imageLoadFailed')}</p>
          <p className="text-sm mt-2">{fileName}</p>
        </div>
      ) : (
        <div className="relative max-w-full max-h-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain bg-white dark:bg-gray-900 rounded shadow-lg"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            style={{ display: hasError ? 'none' : 'block' }}
          />
        </div>
      )}
    </div>
  );
};