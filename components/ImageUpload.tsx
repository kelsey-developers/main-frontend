'use client';

import React, { useState, useRef, useCallback } from 'react';

export interface UploadedImage {
  id: string;
  url: string;
  name: string;
  size: number;
  created_at: string;
}

interface ImageUploadProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImagesUploaded,
  maxFiles = 10,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(Array.from(e.dataTransfer.files));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
    // Reset so the same file can be re-selected after removal
    e.target.value = '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Only image files are accepted (JPEG, PNG, WebP, GIF).');
      return;
    }
    if (imageFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} images at once.`);
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      imageFiles.forEach((f) => formData.append('images', f));

      setUploadProgress(40);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      setUploadProgress(80);

      const json = await res.json() as { urls?: string[]; error?: string };

      if (!res.ok) {
        throw new Error(json.error || `Upload failed (${res.status})`);
      }

      const urls: string[] = json.urls ?? [];
      const uploaded: UploadedImage[] = urls.map((url, i) => ({
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `img-${Date.now()}-${i}`,
        url,
        name: imageFiles[i]?.name ?? `image-${i + 1}`,
        size: imageFiles[i]?.size ?? 0,
        created_at: new Date().toISOString(),
      }));

      setUploadProgress(100);
      onImagesUploaded(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [maxFiles, onImagesUploaded]);

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-[#0B5858] bg-[#f0fafa]' : 'border-gray-300 hover:border-gray-400'
        } ${disabled || isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isUploading ? undefined : openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B5858]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Poppins' }}>
                Uploading images…
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, backgroundColor: '#0B5858' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
                {Math.round(uploadProgress)}%
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900" style={{ fontFamily: 'Poppins' }}>
                {isDragging ? 'Drop images here' : 'Upload Property Images'}
              </p>
              <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
                Drag and drop images here, or click to select files
              </p>
              <p className="text-xs text-gray-400 mt-2" style={{ fontFamily: 'Poppins' }}>
                Supports JPEG, PNG, WebP · Max {maxFiles} files · 10 MB each
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600" style={{ fontFamily: 'Poppins' }}>{error}</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
