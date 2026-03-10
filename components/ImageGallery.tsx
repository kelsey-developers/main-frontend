'use client';

import React from 'react';
import type { UploadedImage } from '@/components/ImageUpload';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ImageGalleryProps {
  images: UploadedImage[];
  selectedImageId: string | null;
  onImageSelect: (imageId: string | null) => void;
  onImageDelete: (imageId: string) => void;
  disabled?: boolean;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  selectedImageId,
  onImageSelect,
  onImageDelete,
  disabled = false
}) => {
  const handleImageClick = (imageId: string) => {
    if (disabled) return;
    if (selectedImageId === imageId) {
      onImageSelect(null);
    } else {
      onImageSelect(imageId);
    }
  };

  const handleDelete = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    if (disabled) return;
    onImageDelete(imageId);
  };

  if (images.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <div className="w-12 h-12 mx-auto mb-4 text-gray-300">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm" style={{ fontFamily: 'Poppins' }}>No images uploaded yet. Upload some images to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Poppins' }}>Select Main Image</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => {
          const isSelected = selectedImageId === image.id;
          return (
            <div
              key={image.id}
              className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                isSelected ? 'border-[#0B5858] ring-2 ring-[#0B5858] ring-opacity-30' : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleImageClick(image.id)}
            >
              <div className="aspect-square relative">
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
                {!disabled && (
                  <button
                    onClick={(e) => handleDelete(e, image.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="p-2 bg-white">
                <p className="text-xs text-gray-600 truncate" style={{ fontFamily: 'Poppins' }}>{image.name}</p>
                <p className="text-xs text-gray-400" style={{ fontFamily: 'Poppins' }}>{formatFileSize(image.size)}</p>
              </div>
            </div>
          );
        })}
      </div>
      {selectedImageId && (
        <div className="mt-6 p-4 border border-green-800 rounded-lg">
          <p className="text-sm text-green-800" style={{ fontFamily: 'Poppins' }}>✓ Main image selected. This will be the featured image for your listing.</p>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
