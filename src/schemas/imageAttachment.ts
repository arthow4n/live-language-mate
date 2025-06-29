import { z } from 'zod/v4';

export const supportedImageMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export const imageAttachmentSchema = z.strictObject({
  aspectRatio: z.number().positive(),
  filename: z.string().min(1),
  height: z.number().positive(),
  id: z.string().min(1),
  mimeType: z.enum(supportedImageMimeTypes),
  savedAt: z.date(),
  size: z.number().positive(),
  type: z.literal('file'),
  width: z.number().positive(),
});

export const urlAttachmentSchema = z.strictObject({
  addedAt: z.date(),
  id: z.string().min(1),
  type: z.literal('url'),
  url: z.url(),
});

export const attachmentSchema = z.union([
  imageAttachmentSchema,
  urlAttachmentSchema,
]);

export const imageAttachmentInputSchema = z.strictObject({
  aspectRatio: z.number().positive(),
  filename: z.string().min(1),
  height: z.number().positive(),
  id: z.string().min(1),
  mimeType: z.enum(supportedImageMimeTypes),
  savedAt: z.iso.datetime(),
  size: z.number().positive(),
  type: z.literal('file'),
  width: z.number().positive(),
});

export const urlAttachmentInputSchema = z.strictObject({
  addedAt: z.iso.datetime(),
  id: z.string().min(1),
  type: z.literal('url'),
  url: z.url(),
});

export const attachmentInputSchema = z.union([
  imageAttachmentInputSchema,
  urlAttachmentInputSchema,
]);

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
export type Attachment = z.infer<typeof attachmentSchema>;
/**
 *
 */
export type AttachmentInput = z.infer<typeof attachmentInputSchema>;
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
export type ImageCompressionOptions = z.infer<
  typeof imageCompressionOptionsSchema
>;
/**
 *
 */
export type ImageMetadata = z.infer<typeof imageMetadataSchema>;
/**
 *
 */
export type ImageValidationOptions = z.infer<
  typeof imageValidationOptionsSchema
>;
/**
 *
 */
export type StorageStats = z.infer<typeof storageStatsSchema>;
/**
 *
 */
export type SupportedImageMimeType = (typeof supportedImageMimeTypes)[number];
/**
 *
 */
export type URLAttachment = z.infer<typeof urlAttachmentSchema>;
/**
 *
 */
export type URLAttachmentInput = z.infer<typeof urlAttachmentInputSchema>;

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
 * @param input
 */
export function parseURLAttachmentInput(input: unknown): URLAttachment {
  const parsed = urlAttachmentInputSchema.parse(input);
  return {
    ...parsed,
    addedAt: new Date(parsed.addedAt),
  };
}

/**
 *
 * @param attachment
 */
export function serializeAttachment(attachment: Attachment): AttachmentInput {
  if (attachment.type === 'file') {
    return serializeImageAttachment(attachment);
  } else {
    return serializeURLAttachment(attachment);
  }
}

/**
 *
 * @param attachment
 */
export function serializeImageAttachment(
  attachment: ImageAttachment
): ImageAttachmentInput {
  return {
    ...attachment,
    savedAt: attachment.savedAt.toISOString(),
  };
}

/**
 *
 * @param attachment
 */
export function serializeURLAttachment(
  attachment: URLAttachment
): URLAttachmentInput {
  return {
    ...attachment,
    addedAt: attachment.addedAt.toISOString(),
  };
}
