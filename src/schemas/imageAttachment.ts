import { z } from 'zod/v4';

export const supportedImageMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export const imageAttachmentSchema = z.strictObject({
  filename: z.string().min(1),
  id: z.string().min(1),
  mimeType: z.enum(supportedImageMimeTypes),
  savedAt: z.date(),
  size: z.number().positive(),
});

export const imageAttachmentInputSchema = z.strictObject({
  filename: z.string().min(1),
  id: z.string().min(1),
  mimeType: z.enum(supportedImageMimeTypes),
  savedAt: z.iso.datetime(),
  size: z.number().positive(),
});

export const imageValidationOptionsSchema = z.strictObject({
  allowedTypes: z.array(z.string()).optional(),
  maxSize: z.number().positive().optional(),
});

export const imageCompressionOptionsSchema = z.strictObject({
  format: z.enum(['image/jpeg', 'image/webp']).optional(),
  maxHeight: z.number().positive().optional(),
  maxWidth: z.number().positive().optional(),
  quality: z.number().min(0).max(1).optional(),
});

export const imageMetadataSchema = z.strictObject({
  aspectRatio: z.number().positive(),
  height: z.number().positive(),
  size: z.number().positive(),
  type: z.string(),
  width: z.number().positive(),
});

export const storageStatsSchema = z.strictObject({
  availableQuota: z.number().positive().optional(),
  totalImages: z.number().nonnegative(),
  totalSize: z.number().nonnegative(),
  usedQuota: z.number().nonnegative().optional(),
});

/**
 *
 */
export type ImageAttachment = z.infer<typeof imageAttachmentSchema>;
/**
 *
 */
export type ImageAttachmentInput = z.infer<typeof imageAttachmentInputSchema>;
/**
 *
 */
export type ImageCompressionOptions = z.infer<typeof imageCompressionOptionsSchema>;
/**
 *
 */
export type ImageMetadata = z.infer<typeof imageMetadataSchema>;
/**
 *
 */
export type ImageValidationOptions = z.infer<typeof imageValidationOptionsSchema>;
/**
 *
 */
export type StorageStats = z.infer<typeof storageStatsSchema>;
/**
 *
 */
export type SupportedImageMimeType = typeof supportedImageMimeTypes[number];

/**
 *
 * @param input
 */
export function parseImageAttachmentInput(input: unknown): ImageAttachment {
  const parsed = imageAttachmentInputSchema.parse(input);
  return {
    ...parsed,
    savedAt: new Date(parsed.savedAt),
  };
}

/**
 *
 * @param attachment
 */
export function serializeImageAttachment(attachment: ImageAttachment): ImageAttachmentInput {
  return {
    ...attachment,
    savedAt: attachment.savedAt.toISOString(),
  };
}