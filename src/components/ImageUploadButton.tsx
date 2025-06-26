import { ImageIcon, Upload } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils.js';

import type { ImageValidationOptions } from '../schemas/imageAttachment.js';

import { validateImageFile } from '../services/imageUtils.js';
import { Button } from './ui/button.js';

/**
 *
 */
export interface ImageUploadButtonProps {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  onError?: (error: string) => void;
  onFilesSelected: (files: File[]) => void;
  size?: 'default' | 'icon' | 'lg' | 'sm';
  validationOptions?: ImageValidationOptions;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
}

/**
 *
 * @param root0
 * @param root0.children
 * @param root0.className
 * @param root0.disabled
 * @param root0.multiple
 * @param root0.onError
 * @param root0.onFilesSelected
 * @param root0.size
 * @param root0.validationOptions
 * @param root0.variant
 */
export function ImageUploadButton({
  children,
  className,
  disabled = false,
  multiple = true,
  onError,
  onFilesSelected,
  size = 'sm',
  validationOptions,
  variant = 'outline',
}: ImageUploadButtonProps): React.JSX.Element {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleButtonClick = (): void => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);
    
    if (files.length === 0) return;

    // Validate all files
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const validation = validateImageFile(file, validationOptions);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error ?? 'Unknown error'}`);
      }
    }

    // Report errors if any
    if (errors.length > 0 && onError) {
      onError(`Invalid files:\n${errors.join('\n')}`);
    }

    // Pass valid files to handler
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }

    // Reset input to allow selecting the same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleButtonClick();
    }
  };

  return (
    <>
      <Button
        aria-label="Upload images"
        className={cn('cursor-pointer', className)}
        disabled={disabled}
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        size={size}
        type="button"
        variant={variant}
      >
        {children ?? (
          <>
            <ImageIcon className="h-4 w-4" />
            <Upload className="h-4 w-4" />
            {size !== 'icon' && 'Upload Images'}
          </>
        )}
      </Button>
      <input
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-hidden="true"
        className="hidden"
        multiple={multiple}
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />
    </>
  );
}