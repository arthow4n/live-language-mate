import { GripVertical } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils.js';

import type { ImageAttachment } from '../schemas/imageAttachment.js';

import { ImagePreview } from './ImagePreview.js';

/**
 *
 */
export interface ImageGridItem {
  error?: string;
  image: ImageAttachment;
  isLoading?: boolean;
  src?: string;
}

/**
 *
 */
export interface ImageGridProps {
  allowReorder?: boolean;
  className?: string;
  items: ImageGridItem[];
  maxColumns?: number;
  onRemove?: (imageId: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onRetry?: (imageId: string) => void;
  showMetadata?: boolean;
  size?: 'lg' | 'md' | 'sm';
}

/**
 *
 * @param root0
 * @param root0.allowReorder
 * @param root0.className
 * @param root0.items
 * @param root0.maxColumns
 * @param root0.onRemove
 * @param root0.onReorder
 * @param root0.onRetry
 * @param root0.showMetadata
 * @param root0.size
 */
export function ImageGrid({
  allowReorder = true,
  className,
  items,
  maxColumns = 4,
  onRemove,
  onReorder,
  onRetry,
  showMetadata = true,
  size = 'md',
}: ImageGridProps): React.JSX.Element {
  const [draggedIndex, setDraggedIndex] = React.useState<null | number>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<null | number>(null);

  const handleDragStart = (event: React.DragEvent, index: number): void => {
    if (!allowReorder || !onReorder) return;
    
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
    
    // Create a custom drag image
    const dragImage = event.currentTarget.cloneNode(true);
    if (!(dragImage instanceof HTMLElement)) return;
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(5deg)';
    event.dataTransfer.setDragImage(dragImage, 50, 50);
  };

  const handleDragEnd = (): void => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (event: React.DragEvent, index: number): void => {
    if (!allowReorder || !onReorder || draggedIndex === null) return;
    
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (): void => {
    setDragOverIndex(null);
  };

  const handleDrop = (event: React.DragEvent, index: number): void => {
    if (!allowReorder || !onReorder || draggedIndex === null) return;
    
    event.preventDefault();
    
    if (draggedIndex !== index) {
      onReorder(draggedIndex, index);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getGridCols = (): string => {
    const cols = Math.min(items.length, maxColumns);
    return {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
    }[cols] ?? 'grid-cols-4';
  };

  if (items.length === 0) {
    return (
      <div className={cn(
        'flex items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg',
        className
      )}>
        <div>
          <div className="text-lg font-medium mb-2">No images</div>
          <div className="text-sm">Upload or drag images to get started</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        getGridCols(),
        className
      )}
    >
      {items.map((item, index) => (
        <div
          className={cn(
            'relative group transition-all duration-200',
            allowReorder && onReorder && 'cursor-move',
            draggedIndex === index && 'opacity-50 scale-95',
            dragOverIndex === index && draggedIndex !== null && 'scale-105',
            dragOverIndex === index && draggedIndex !== index && 'ring-2 ring-primary'
          )}
          draggable={!!(allowReorder && onReorder)}
          key={item.image.id}
          onDragEnd={handleDragEnd}
          onDragLeave={handleDragLeave}
          onDragOver={(e) => { handleDragOver(e, index); }}
          onDragStart={(e) => { handleDragStart(e, index); }}
          onDrop={(e) => { handleDrop(e, index); }}
        >
          {/* Drag Handle */}
          {allowReorder && onReorder && (
            <div className="absolute -top-2 -left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-background border border-border rounded-md p-1 shadow-sm">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Image Preview */}
          <ImagePreview
            error={item.error}
            image={item.image}
            isLoading={item.isLoading}
            onRemove={onRemove}
            onRetry={onRetry}
            showMetadata={showMetadata}
            size={size}
            src={item.src}
          />

          {/* Drop Indicator */}
          {dragOverIndex === index && draggedIndex !== null && draggedIndex !== index && (
            <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none" />
          )}
        </div>
      ))}
    </div>
  );
}