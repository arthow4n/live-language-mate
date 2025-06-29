import { describe, expect, test } from 'vitest';

import {
  createURLAttachment,
  extractImageUrls,
  isValidImageUrl,
} from '../urlDetection';

describe('URL Detection Utilities', () => {
  describe('extractImageUrls', () => {
    test('should extract single image URL from text', () => {
      const text = 'Check out this image: https://example.com/photo.jpg';
      const result = extractImageUrls(text);

      expect(result.cleanedText).toBe('Check out this image:');
      expect(result.urlAttachments).toHaveLength(1);
      expect(result.urlAttachments[0].url).toBe(
        'https://example.com/photo.jpg'
      );
      expect(result.urlAttachments[0].type).toBe('url');
      expect(result.urlAttachments[0].id).toMatch(/^url-\d+-\d+$/);
    });

    test('should extract multiple image URLs from text', () => {
      const text =
        'Here are two images: https://example.com/photo1.jpg and https://example.com/photo2.png';
      const result = extractImageUrls(text);

      expect(result.cleanedText).toBe('Here are two images: and');
      expect(result.urlAttachments).toHaveLength(2);
      expect(result.urlAttachments[0].url).toBe(
        'https://example.com/photo1.jpg'
      );
      expect(result.urlAttachments[1].url).toBe(
        'https://example.com/photo2.png'
      );
    });

    test('should handle various image extensions', () => {
      const extensions = [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'bmp',
        'svg',
        'ico',
        'tiff',
      ];
      const urls = extensions.map((ext) => `https://example.com/image.${ext}`);
      const text = `Images: ${urls.join(' ')}`;

      const result = extractImageUrls(text);

      expect(result.urlAttachments).toHaveLength(extensions.length);
      urls.forEach((url, index) => {
        expect(result.urlAttachments[index].url).toBe(url);
      });
    });

    test('should handle URLs with query parameters', () => {
      const text =
        'Image with params: https://example.com/image.jpg?size=large&format=webp';
      const result = extractImageUrls(text);

      expect(result.urlAttachments).toHaveLength(1);
      expect(result.urlAttachments[0].url).toBe(
        'https://example.com/image.jpg?size=large&format=webp'
      );
    });

    test('should handle URLs with fragments', () => {
      const text =
        'Image with fragment: https://example.com/image.jpg#main-image';
      const result = extractImageUrls(text);

      expect(result.urlAttachments).toHaveLength(1);
      expect(result.urlAttachments[0].url).toBe(
        'https://example.com/image.jpg#main-image'
      );
    });

    test('should handle HTTPS and HTTP URLs', () => {
      const text =
        'Secure: https://example.com/secure.jpg and insecure: http://example.com/insecure.png';
      const result = extractImageUrls(text);

      expect(result.urlAttachments).toHaveLength(2);
      expect(result.urlAttachments[0].url).toBe(
        'https://example.com/secure.jpg'
      );
      expect(result.urlAttachments[1].url).toBe(
        'http://example.com/insecure.png'
      );
    });

    test('should remove duplicate URLs', () => {
      const text =
        'Same image twice: https://example.com/photo.jpg and again https://example.com/photo.jpg';
      const result = extractImageUrls(text);

      expect(result.urlAttachments).toHaveLength(1);
      expect(result.urlAttachments[0].url).toBe(
        'https://example.com/photo.jpg'
      );
    });

    test('should clean up extra whitespace', () => {
      const text =
        'Multiple   spaces   https://example.com/image.jpg   between   words';
      const result = extractImageUrls(text);

      expect(result.cleanedText).toBe('Multiple spaces between words');
    });

    test('should return empty arrays when no URLs found', () => {
      const text = 'This text has no image URLs in it.';
      const result = extractImageUrls(text);

      expect(result.cleanedText).toBe(text);
      expect(result.urlAttachments).toHaveLength(0);
    });

    test('should ignore non-image URLs', () => {
      const text =
        'Website: https://example.com and document: https://example.com/document.pdf';
      const result = extractImageUrls(text);

      expect(result.cleanedText).toBe(text);
      expect(result.urlAttachments).toHaveLength(0);
    });

    test('should handle edge case with only URL in text', () => {
      const text = 'https://example.com/image.jpg';
      const result = extractImageUrls(text);

      expect(result.cleanedText).toBe('');
      expect(result.urlAttachments).toHaveLength(1);
      expect(result.urlAttachments[0].url).toBe(
        'https://example.com/image.jpg'
      );
    });

    test('should handle URLs at beginning, middle, and end of text', () => {
      const text =
        'https://example.com/start.jpg middle text https://example.com/middle.png end text https://example.com/end.gif';
      const result = extractImageUrls(text);

      expect(result.cleanedText).toBe('middle text end text');
      expect(result.urlAttachments).toHaveLength(3);
      expect(result.urlAttachments[0].url).toBe(
        'https://example.com/start.jpg'
      );
      expect(result.urlAttachments[1].url).toBe(
        'https://example.com/middle.png'
      );
      expect(result.urlAttachments[2].url).toBe('https://example.com/end.gif');
    });

    test('should handle case-insensitive extensions', () => {
      const text =
        'Mixed case: https://example.com/IMAGE.JPG and https://example.com/photo.PNG';
      const result = extractImageUrls(text);

      expect(result.urlAttachments).toHaveLength(2);
      expect(result.urlAttachments[0].url).toBe(
        'https://example.com/IMAGE.JPG'
      );
      expect(result.urlAttachments[1].url).toBe(
        'https://example.com/photo.PNG'
      );
    });
  });

  describe('isValidImageUrl', () => {
    test('should return true for valid HTTPS image URLs', () => {
      const validUrls = [
        'https://example.com/image.jpg',
        'https://example.com/photo.png',
        'https://example.com/pic.gif',
        'https://example.com/image.webp',
        'https://example.com/icon.svg',
      ];

      validUrls.forEach((url) => {
        expect(isValidImageUrl(url)).toBe(true);
      });
    });

    test('should return true for valid HTTP image URLs', () => {
      const validUrls = [
        'http://example.com/image.jpg',
        'http://example.com/photo.png',
      ];

      validUrls.forEach((url) => {
        expect(isValidImageUrl(url)).toBe(true);
      });
    });

    test('should return false for non-HTTP/HTTPS protocols', () => {
      const invalidUrls = [
        'ftp://example.com/image.jpg',
        'file:///path/to/image.jpg',
        'data:image/jpeg;base64,/9j/4AAQ...',
      ];

      invalidUrls.forEach((url) => {
        expect(isValidImageUrl(url)).toBe(false);
      });
    });

    test('should return false for non-image file extensions', () => {
      const invalidUrls = [
        'https://example.com/document.pdf',
        'https://example.com/video.mp4',
        'https://example.com/audio.mp3',
        'https://example.com/archive.zip',
      ];

      invalidUrls.forEach((url) => {
        expect(isValidImageUrl(url)).toBe(false);
      });
    });

    test('should return false for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'https://',
        'https://example',
        'example.com/image.jpg',
      ];

      invalidUrls.forEach((url) => {
        expect(isValidImageUrl(url)).toBe(false);
      });
    });

    test('should handle URLs with query parameters and fragments', () => {
      const validUrls = [
        'https://example.com/image.jpg?size=large',
        'https://example.com/image.png#main',
        'https://example.com/image.gif?v=1&size=small#section',
      ];

      validUrls.forEach((url) => {
        expect(isValidImageUrl(url)).toBe(true);
      });
    });

    test('should handle URLs with nested paths containing extensions', () => {
      const validUrls = [
        'https://example.com/folder.jpg/image.png',
        'https://example.com/path/to/image.jpg',
        'https://example.com/2023/photos/vacation.jpeg',
      ];

      validUrls.forEach((url) => {
        expect(isValidImageUrl(url)).toBe(true);
      });
    });
  });

  describe('createURLAttachment', () => {
    test('should create a valid URL attachment object', () => {
      const url = 'https://example.com/image.jpg';
      const attachment = createURLAttachment(url);

      expect(attachment.type).toBe('url');
      expect(attachment.url).toBe(url);
      expect(attachment.id).toMatch(/^url-\d+-[a-z0-9]+$/);
      expect(attachment.addedAt).toBeInstanceOf(Date);
      expect(attachment.addedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('should create unique IDs for different attachments', () => {
      const url = 'https://example.com/image.jpg';
      const attachment1 = createURLAttachment(url);
      const attachment2 = createURLAttachment(url);

      expect(attachment1.id).not.toBe(attachment2.id);
    });

    test('should handle various URL formats', () => {
      const urls = [
        'https://example.com/image.jpg',
        'http://example.com/photo.png',
        'https://cdn.example.com/images/pic.gif?v=1#main',
      ];

      urls.forEach((url) => {
        const attachment = createURLAttachment(url);
        expect(attachment.url).toBe(url);
        expect(attachment.type).toBe('url');
      });
    });
  });

  describe('extractImageUrls edge cases', () => {
    test('should handle empty string input', () => {
      const result = extractImageUrls('');
      expect(result.cleanedText).toBe('');
      expect(result.urlAttachments).toHaveLength(0);
    });

    test('should handle whitespace-only input', () => {
      const result = extractImageUrls('   \n\t   ');
      expect(result.cleanedText).toBe('');
      expect(result.urlAttachments).toHaveLength(0);
    });

    test('should handle URLs with special characters in domain', () => {
      const text = 'Image: https://sub-domain.example-site.com/image.jpg';
      const result = extractImageUrls(text);

      expect(result.urlAttachments).toHaveLength(1);
      expect(result.urlAttachments[0].url).toBe(
        'https://sub-domain.example-site.com/image.jpg'
      );
    });

    test('should handle very long URLs', () => {
      const longPath =
        'very/long/path/to/nested/folders/with/many/segments/that/goes/on/and/on';
      const url = `https://example.com/${longPath}/image.jpg`;
      const text = `Long URL: ${url}`;

      const result = extractImageUrls(text);

      expect(result.urlAttachments).toHaveLength(1);
      expect(result.urlAttachments[0].url).toBe(url);
    });

    test('should handle URLs with international domain names', () => {
      const text = 'International: https://xn--nxasmq6b.example.com/image.jpg';
      const result = extractImageUrls(text);

      expect(result.urlAttachments).toHaveLength(1);
      expect(result.urlAttachments[0].url).toBe(
        'https://xn--nxasmq6b.example.com/image.jpg'
      );
    });
  });
});
