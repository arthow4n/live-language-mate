import type { URLAttachment } from '@/schemas/imageAttachment';

/**
 *
 */
interface URLExtractionResult {
  cleanedText: string;
  urlAttachments: URLAttachment[];
}

/**
 * Creates a URL attachment object from a URL string
 * @param url - The image URL
 * @returns URL attachment object
 */
export function createURLAttachment(url: string): URLAttachment {
  return {
    addedAt: new Date(),
    id: `url-${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    type: 'url' as const,
    url,
  };
}

/**
 * Extracts image URLs from text and returns cleaned text with URL attachments
 * @param text - The input text that may contain image URLs
 * @returns Object containing cleaned text and URL attachments
 */
export function extractImageUrls(text: string): URLExtractionResult {
  // Regex to match image URLs with common image extensions
  const imageUrlRegex =
    /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff)(?:\?[^\s]*)?(?:#[^\s]*)?)/gi;

  const foundUrls: string[] = [];
  let cleanedText = text;

  let match;
  while ((match = imageUrlRegex.exec(text)) !== null) {
    const url = match[1];

    // Check if this URL is already found (avoid duplicates)
    if (!foundUrls.includes(url)) {
      foundUrls.push(url);
    }

    // Remove the URL from the text
    cleanedText = cleanedText.replace(url, '').trim();
  }

  // Clean up extra whitespace that may result from URL removal
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

  // Create URL attachment objects
  const urlAttachments: URLAttachment[] = foundUrls.map((url, index) => ({
    addedAt: new Date(),
    id: `url-${Date.now().toString()}-${index.toString()}`,
    type: 'url' as const,
    url,
  }));

  return {
    cleanedText,
    urlAttachments,
  };
}

/**
 * Validates if a URL appears to be a valid image URL
 * @param url - The URL to validate
 * @returns True if the URL appears to be a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Check if it's HTTP or HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Check if the pathname ends with a common image extension
    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.bmp',
      '.svg',
      '.ico',
      '.tiff',
    ];
    const pathname = urlObj.pathname.toLowerCase();

    return imageExtensions.some((ext) => pathname.includes(ext));
  } catch {
    return false;
  }
}
