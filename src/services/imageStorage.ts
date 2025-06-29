import {
  type ImageAttachment,
  parseImageAttachmentInput,
  serializeImageAttachment,
  supportedImageMimeTypes,
} from '../schemas/imageAttachment.js';

/**
 *
 */
export type ImageMetadata = ImageAttachment;

/**
 *
 */
export interface StorageStats {
  availableQuota?: number;
  totalImages: number;
  totalSize: number;
  usedQuota?: number;
}

/**
 *
 */
class ImageStorageService {
  private static instance: ImageStorageService | undefined;
  private imagesDir: FileSystemDirectoryHandle | null = null;
  private metadataCache = new Map<string, ImageMetadata>();
  private opfsRoot: FileSystemDirectoryHandle | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): ImageStorageService {
    ImageStorageService.instance ??= new ImageStorageService();
    return ImageStorageService.instance;
  }

  public async cleanupUnusedImages(usedImageIds: Set<string>): Promise<number> {
    await this.ensureInitialized();

    if (!this.imagesDir) {
      throw new ImageStorageError(
        'OPFS not initialized',
        'STORAGE_UNAVAILABLE'
      );
    }

    const allImages = await this.listImages();
    let deletedCount = 0;

    for (const image of allImages) {
      if (!usedImageIds.has(image.id)) {
        const deleted = await this.deleteImage(image.id);
        if (deleted) {
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  public async deleteImage(id: string): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.imagesDir) {
      throw new ImageStorageError(
        'OPFS not initialized',
        'STORAGE_UNAVAILABLE'
      );
    }

    try {
      const metadata = await this.getImageMetadata(id);
      if (!metadata) {
        return false;
      }

      const extension = this.getFileExtension(metadata.filename);
      const filename = `${id}${extension}`;

      await this.imagesDir.removeEntry(filename);
      await this.deleteMetadata(id);
      this.metadataCache.delete(id);

      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        return false;
      }
      throw new ImageStorageError(
        `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_UNAVAILABLE'
      );
    }
  }

  public async getImage(id: string): Promise<File | null> {
    await this.ensureInitialized();

    if (!this.imagesDir) {
      throw new ImageStorageError(
        'OPFS not initialized',
        'STORAGE_UNAVAILABLE'
      );
    }

    try {
      const metadata = await this.getImageMetadata(id);
      if (!metadata) {
        return null;
      }

      // Use mimeType to determine extension for consistency with save logic
      const extension = this.getExtensionFromMimeType(metadata.mimeType);
      const filename = `${id}${extension}`;

      const fileHandle = await this.imagesDir.getFileHandle(filename);
      const file = await fileHandle.getFile();

      return new File([file], metadata.filename, {
        lastModified: metadata.savedAt.getTime(),
        type: metadata.mimeType,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        return null;
      }
      throw new ImageStorageError(
        `Failed to get image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_UNAVAILABLE'
      );
    }
  }

  public async getStorageStats(): Promise<StorageStats> {
    const images = await this.listImages();
    const totalSize = images.reduce((sum, img) => sum + img.size, 0);

    let availableQuota: number | undefined;
    let usedQuota: number | undefined;

    try {
      if (typeof navigator.storage.estimate === 'function') {
        const estimate = await navigator.storage.estimate();
        availableQuota = estimate.quota;
        usedQuota = estimate.usage;
      }
    } catch {
      // Ignore quota estimation errors
    }

    return {
      availableQuota,
      totalImages: images.length,
      totalSize,
      usedQuota,
    };
  }

  public async listImages(): Promise<ImageMetadata[]> {
    await this.ensureInitialized();

    if (!this.imagesDir) {
      throw new ImageStorageError(
        'OPFS not initialized',
        'STORAGE_UNAVAILABLE'
      );
    }

    try {
      const images: ImageMetadata[] = [];

      for await (const [name] of this.imagesDir.entries()) {
        if (name.endsWith('.meta.json')) {
          const id = name.replace('.meta.json', '');
          const metadata = await this.getImageMetadata(id);
          if (metadata) {
            images.push(metadata);
          }
        }
      }

      return images.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
    } catch (error) {
      throw new ImageStorageError(
        `Failed to list images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_UNAVAILABLE'
      );
    }
  }

  public async saveImage(file: File): Promise<ImageMetadata> {
    await this.ensureInitialized();

    if (!this.imagesDir) {
      throw new ImageStorageError(
        'OPFS not initialized',
        'STORAGE_UNAVAILABLE'
      );
    }

    if (
      !supportedImageMimeTypes.includes(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Safe type check for MIME types
        file.type as (typeof supportedImageMimeTypes)[number]
      )
    ) {
      throw new ImageStorageError(
        `Unsupported file type: ${file.type}`,
        'INVALID_FILE'
      );
    }

    const id = crypto.randomUUID();
    // Use mimeType to determine extension instead of original filename
    // This ensures consistency when files are compressed/converted
    const extension = this.getExtensionFromMimeType(file.type);
    const filename = `${id}${extension}`;

    try {
      const fileHandle = await this.imagesDir.getFileHandle(filename, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      const metadata: ImageMetadata = {
        filename: file.name,
        id,
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Safe after type check above
        mimeType: file.type as (typeof supportedImageMimeTypes)[number],
        savedAt: new Date(),
        size: file.size,
      };

      this.metadataCache.set(id, metadata);
      await this.saveMetadata(id, metadata);

      return metadata;
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        throw new ImageStorageError(
          'Storage quota exceeded. Please delete some images to free up space.',
          'QUOTA_EXCEEDED'
        );
      }
      throw new ImageStorageError(
        `Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_UNAVAILABLE'
      );
    }
  }

  private async deleteMetadata(id: string): Promise<void> {
    if (!this.imagesDir) return;

    try {
      await this.imagesDir.removeEntry(`${id}.meta.json`);
    } catch {
      // Ignore if metadata file doesn't exist
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.imagesDir) {
      await this.initializeOPFS();
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    switch (mimeType) {
      case 'image/gif':
        return '.gif';
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '.png'; // fallback
    }
  }

  private getFileExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex >= 0 ? filename.substring(dotIndex) : '';
  }

  private async getImageMetadata(id: string): Promise<ImageMetadata | null> {
    if (this.metadataCache.has(id)) {
      const metadata = this.metadataCache.get(id);
      if (!metadata) {
        throw new Error('Metadata should exist in cache');
      }
      return metadata;
    }

    if (!this.imagesDir) return null;

    try {
      const metadataHandle = await this.imagesDir.getFileHandle(
        `${id}.meta.json`
      );
      const file = await metadataHandle.getFile();
      const text = await file.text();
      const data: unknown = JSON.parse(text);

      const metadata = parseImageAttachmentInput(data);

      this.metadataCache.set(id, metadata);
      return metadata;
    } catch {
      return null;
    }
  }

  private async initializeOPFS(): Promise<void> {
    if (typeof navigator.storage.getDirectory !== 'function') {
      throw new ImageStorageError(
        'OPFS is not supported in this browser',
        'STORAGE_UNAVAILABLE'
      );
    }

    try {
      this.opfsRoot = await navigator.storage.getDirectory();
      this.imagesDir = await this.opfsRoot.getDirectoryHandle('images', {
        create: true,
      });
    } catch (error) {
      throw new ImageStorageError(
        `Failed to initialize OPFS: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_UNAVAILABLE'
      );
    }
  }

  private async saveMetadata(
    id: string,
    metadata: ImageMetadata
  ): Promise<void> {
    if (!this.imagesDir) return;

    const metadataHandle = await this.imagesDir.getFileHandle(
      `${id}.meta.json`,
      {
        create: true,
      }
    );
    const writable = await metadataHandle.createWritable();
    await writable.write(JSON.stringify(serializeImageAttachment(metadata)));
    await writable.close();
  }
}

/**
 *
 */
export class ImageStorageError extends Error {
  constructor(
    message: string,
    public code:
      | 'FILE_NOT_FOUND'
      | 'INVALID_FILE'
      | 'QUOTA_EXCEEDED'
      | 'STORAGE_UNAVAILABLE'
  ) {
    super(message);
    this.name = 'ImageStorageError';
  }
}

export const imageStorage = ImageStorageService.getInstance();
