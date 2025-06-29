/* eslint-disable @typescript-eslint/unbound-method -- Test file with many mock function calls */
/* eslint-disable testing-library/no-node-access -- Test file requires DOM node access for closest() calls */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createTestFile } from '@/__tests__/testUtilities';

import type { ImageAttachment } from '../../schemas/imageAttachment';

import { imageStorage } from '../../services/imageStorage';
import { ImageMessage } from '../ImageMessage';

// Mock the image storage service
vi.mock('../../services/imageStorage');

const mockImageStorage = vi.mocked(imageStorage);

describe('ImageMessage', () => {
  const mockOnImageClick = vi.fn();

  const createTestImageAttachment = (
    overrides: Partial<ImageAttachment> = {}
  ): ImageAttachment => ({
    filename: 'test.jpg',
    id: 'test-id-1',
    mimeType: 'image/jpeg',
    savedAt: new Date('2024-01-01T00:00:00Z'),
    size: 1024 * 1024,
    type: 'file',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL methods
    vi.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:test-url');
    vi.spyOn(global.URL, 'revokeObjectURL').mockReturnValue();

    // Default successful mock
    mockImageStorage.getImage.mockResolvedValue(
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024 * 1024,
      })
    );
  });

  test('renders nothing when no attachments provided', () => {
    const { container } = render(<ImageMessage attachments={[]} />);

    expect(container.firstChild).toBeNull();
  });

  test('renders single image with metadata', async () => {
    const attachment = createTestImageAttachment();

    render(
      <ImageMessage
        attachments={[attachment]}
        onImageClick={mockOnImageClick}
        showMetadata={true}
      />
    );

    // Should show loading state initially
    expect(screen.getByTestId('image-loading')).toHaveClass('animate-pulse');

    // Wait for image to load
    await waitFor(() => {
      expect(screen.getByTestId('image-clickable')).toBeInTheDocument();
    });

    const button = screen.getByTestId('image-clickable');
    const image = button.querySelector('img');
    expect(image).toHaveAttribute('src', 'blob:test-url');
    expect(image).toHaveAttribute('alt', 'test.jpg');

    // Verify storage was called
    expect(mockImageStorage.getImage).toHaveBeenCalledWith('test-id-1');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  test('renders multiple images in grid layout', async () => {
    const attachments = [
      createTestImageAttachment({ filename: 'first.jpg', id: 'id-1' }),
      createTestImageAttachment({ filename: 'second.jpg', id: 'id-2' }),
      createTestImageAttachment({ filename: 'third.jpg', id: 'id-3' }),
    ];

    mockImageStorage.getImage
      .mockResolvedValueOnce(
        createTestFile({
          mimeType: 'image/jpeg',
          name: 'first.jpg',
          size: 1024,
        })
      )
      .mockResolvedValueOnce(
        createTestFile({
          mimeType: 'image/jpeg',
          name: 'second.jpg',
          size: 1024,
        })
      )
      .mockResolvedValueOnce(
        createTestFile({
          mimeType: 'image/jpeg',
          name: 'third.jpg',
          size: 1024,
        })
      );

    render(
      <ImageMessage attachments={attachments} onImageClick={mockOnImageClick} />
    );

    // Wait for all images to load
    await waitFor(() => {
      expect(screen.getAllByTestId('image-clickable')).toHaveLength(3);
    });

    // Verify grid layout container
    expect(screen.getByTestId('image-grid')).toHaveClass('grid-cols-2');

    // Verify all storage calls were made
    expect(mockImageStorage.getImage).toHaveBeenCalledWith('id-1');
    expect(mockImageStorage.getImage).toHaveBeenCalledWith('id-2');
    expect(mockImageStorage.getImage).toHaveBeenCalledWith('id-3');
  });

  test('handles image click events', async () => {
    const attachment = createTestImageAttachment();

    render(
      <ImageMessage
        attachments={[attachment]}
        onImageClick={mockOnImageClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('image-clickable')).toBeInTheDocument();
    });

    const image = screen.getByTestId('image-clickable');
    await userEvent.click(image);

    expect(mockOnImageClick).toHaveBeenCalledWith(attachment, 'blob:test-url');
  });

  test('handles keyboard navigation on images', async () => {
    const attachment = createTestImageAttachment();

    render(
      <ImageMessage
        attachments={[attachment]}
        onImageClick={mockOnImageClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('image-clickable')).toBeInTheDocument();
    });

    const image = screen.getByTestId('image-clickable');

    // Test Enter key
    image.focus();
    await userEvent.keyboard('{Enter}');
    expect(mockOnImageClick).toHaveBeenCalledWith(attachment, 'blob:test-url');

    // Test Space key
    await userEvent.keyboard(' ');
    expect(mockOnImageClick).toHaveBeenCalledTimes(2);
  });

  test('displays loading state while images are being fetched', () => {
    const attachment = createTestImageAttachment();

    // Make getImage hang to test loading state
    mockImageStorage.getImage.mockImplementation(
      () =>
        new Promise(() => {
          // Intentionally empty to test loading state
        })
    );

    render(<ImageMessage attachments={[attachment]} />);

    // Should show loading animation
    expect(screen.getByTestId('image-loading')).toHaveClass('animate-pulse');

    // Should show loading placeholder
    expect(screen.getByTestId('image-loading')).toBeInTheDocument();
  });

  test('displays error state when image loading fails', async () => {
    const attachment = createTestImageAttachment();
    mockImageStorage.getImage.mockRejectedValue(new Error('Storage error'));

    render(<ImageMessage attachments={[attachment]} />);

    await waitFor(() => {
      expect(screen.getByTestId('image-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByText('test.jpg')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('displays error state when storage returns null', async () => {
    const attachment = createTestImageAttachment();
    mockImageStorage.getImage.mockResolvedValue(null);

    render(<ImageMessage attachments={[attachment]} />);

    await waitFor(() => {
      expect(screen.getByTestId('image-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByText('test.jpg')).toBeInTheDocument();
  });

  test('shows metadata overlay on hover when enabled', async () => {
    const attachment = createTestImageAttachment({
      filename: 'large-image.jpg',
      size: 2 * 1024 * 1024, // 2MB
    });

    render(<ImageMessage attachments={[attachment]} showMetadata={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('image-clickable')).toBeInTheDocument();
    });

    // Metadata should be in the DOM but hidden initially
    expect(screen.getByText('large-image.jpg')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
  });

  test('hides metadata when showMetadata is false', async () => {
    const attachment = createTestImageAttachment();

    render(<ImageMessage attachments={[attachment]} showMetadata={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('image-clickable')).toBeInTheDocument();
    });

    // Metadata should not be in the DOM
    expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
    expect(screen.queryByText('1 MB')).not.toBeInTheDocument();
  });

  test('applies different size variants correctly', async () => {
    const attachment = createTestImageAttachment();

    const { rerender } = render(
      <ImageMessage attachments={[attachment]} maxPreviewSize="sm" />
    );

    await waitFor(() => {
      expect(screen.getByTestId('image-clickable')).toBeInTheDocument();
    });

    let container = screen.getByTestId('image-clickable').closest('.max-w-xs');
    expect(container).toBeInTheDocument();

    // Test medium size
    rerender(<ImageMessage attachments={[attachment]} maxPreviewSize="md" />);

    container = screen.getByTestId('image-clickable').closest('.max-w-sm');
    expect(container).toBeInTheDocument();

    // Test large size
    rerender(<ImageMessage attachments={[attachment]} maxPreviewSize="lg" />);

    container = screen.getByTestId('image-clickable').closest('.max-w-md');
    expect(container).toBeInTheDocument();
  });

  test('cleans up object URLs on unmount', async () => {
    const attachment = createTestImageAttachment();

    const { unmount } = render(<ImageMessage attachments={[attachment]} />);

    await waitFor(() => {
      expect(screen.getByTestId('image-clickable')).toBeInTheDocument();
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();

    unmount();

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });

  test('avoids duplicate loading for same images', () => {
    const attachment = createTestImageAttachment();

    // Render with same attachment twice
    const { rerender } = render(<ImageMessage attachments={[attachment]} />);

    rerender(<ImageMessage attachments={[attachment]} />);

    // Should only call getImage once despite re-render
    expect(mockImageStorage.getImage).toHaveBeenCalledTimes(1);
  });

  test('handles mixed loading states for multiple images', async () => {
    const attachments = [
      createTestImageAttachment({ filename: 'success.jpg', id: 'success-id' }),
      createTestImageAttachment({ filename: 'error.jpg', id: 'error-id' }),
    ];

    mockImageStorage.getImage
      .mockResolvedValueOnce(
        createTestFile({
          mimeType: 'image/jpeg',
          name: 'success.jpg',
          size: 1024,
        })
      )
      .mockRejectedValueOnce(new Error('Failed to load'));

    render(<ImageMessage attachments={attachments} />);

    // Wait for both to finish loading (success and error)
    await waitFor(() => {
      expect(screen.getByTestId('image-clickable')).toBeInTheDocument(); // success image
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument(); // error state
    });

    // Should have one successful image and one error
    expect(screen.getByTestId('image-clickable')).toBeInTheDocument();
    expect(screen.getByText('error.jpg')).toBeInTheDocument();
  });

  test('applies custom className', async () => {
    const attachment = createTestImageAttachment();

    render(
      <ImageMessage
        attachments={[attachment]}
        className="custom-image-message"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('image-clickable')).toBeInTheDocument();
    });

    const container = screen
      .getByTestId('image-clickable')
      .closest('.custom-image-message');
    expect(container).toBeInTheDocument();
  });
});
/* eslint-enable @typescript-eslint/unbound-method -- Re-enable rule after test file */
/* eslint-enable testing-library/no-node-access -- Re-enable rule after test file */
