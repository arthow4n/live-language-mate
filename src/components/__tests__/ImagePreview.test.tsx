import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { expectToBeInstanceOf } from '@/__tests__/typedExpectHelpers';

import type { ImageAttachment } from '../../schemas/imageAttachment';

import { IMAGE_ERROR_CODES, ImageError } from '../../services/errorHandling';
import { ImagePreview } from '../ImagePreview';

describe('ImagePreview', () => {
  const mockOnRemove = vi.fn();
  const mockOnRetry = vi.fn();

  const mockImage: ImageAttachment = {
    filename: 'test-image.jpg',
    id: 'test-id',
    mimeType: 'image/jpeg',
    savedAt: new Date(),
    size: 1024 * 1024, // 1MB
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders image with src successfully', () => {
    const testSrc = 'data:image/jpeg;base64,test';

    render(
      <ImagePreview image={mockImage} onRemove={mockOnRemove} src={testSrc} />
    );

    const img = screen.getByRole('img', { name: mockImage.filename });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', testSrc);
    expect(img).toHaveAttribute('alt', mockImage.filename);
  });

  test('shows loading state initially', () => {
    render(
      <ImagePreview
        image={mockImage}
        isLoading={true}
        src="data:image/jpeg;base64,test"
      />
    );

    // Should show the loading spinner (Loader2 icon)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('shows loading state while image loads', () => {
    render(
      <ImagePreview image={mockImage} src="data:image/jpeg;base64,test" />
    );

    // Image should be loading initially (before onLoad fires)
    const img = screen.getByRole('img');
    expect(img).toHaveClass('opacity-0'); // Should be hidden while loading
  });

  test('handles image load event', async () => {
    render(
      <ImagePreview image={mockImage} src="data:image/jpeg;base64,test" />
    );

    const img = screen.getByRole('img');
    expectToBeInstanceOf(img, HTMLImageElement);

    // Simulate image load
    img.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(img).not.toHaveClass('opacity-0');
    });
  });

  test('handles image error event', async () => {
    render(
      <ImagePreview image={mockImage} onRetry={mockOnRetry} src="invalid-src" />
    );

    const img = screen.getByRole('img');
    expectToBeInstanceOf(img, HTMLImageElement);

    // Simulate image error
    img.dispatchEvent(new Event('error'));

    await waitFor(() => {
      // Should show error state
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    expect(screen.getByTitle('Retry loading image')).toBeInTheDocument();
  });

  test('shows error state when error prop is provided', () => {
    render(
      <ImagePreview
        error={
          new ImageError('Upload failed', {
            code: IMAGE_ERROR_CODES.UPLOAD_FAILED,
          })
        }
        image={mockImage}
        onRetry={mockOnRetry}
        src="data:image/jpeg;base64,test"
      />
    );

    // Should show error state
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByTitle('Retry loading image')).toBeInTheDocument();
  });

  test('shows placeholder when no src provided', () => {
    render(<ImagePreview image={mockImage} onRemove={mockOnRemove} />);

    // Should show placeholder
    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();

    // Should not show actual image
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('calls onRemove when remove button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ImagePreview
        image={mockImage}
        onRemove={mockOnRemove}
        src="data:image/jpeg;base64,test"
      />
    );

    const removeButton = screen.getByTitle('Remove image');
    await user.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith(mockImage.id);
  });

  test('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ImagePreview
        error={
          new ImageError('Upload failed', {
            code: IMAGE_ERROR_CODES.UPLOAD_FAILED,
          })
        }
        image={mockImage}
        onRetry={mockOnRetry}
        src="invalid-src"
      />
    );

    const retryButton = screen.getByTitle('Retry loading image');
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledWith(mockImage.id);
  });

  test('does not call onRemove when loading', async () => {
    const user = userEvent.setup();

    render(
      <ImagePreview
        image={mockImage}
        isLoading={true}
        onRemove={mockOnRemove}
        src="data:image/jpeg;base64,test"
      />
    );

    // Remove button should exist but be disabled during loading
    const removeButton = screen.getByTitle('Remove image');
    expect(removeButton).toBeDisabled();

    await user.click(removeButton);
    expect(mockOnRemove).not.toHaveBeenCalled();
  });

  test('does not call onRetry when loading', async () => {
    const user = userEvent.setup();

    render(
      <ImagePreview
        error={
          new ImageError('Previous error', {
            code: IMAGE_ERROR_CODES.UPLOAD_FAILED,
          })
        }
        image={mockImage}
        isLoading={true}
        onRemove={mockOnRemove}
        onRetry={mockOnRetry}
      />
    );

    // Remove button should exist but be disabled during loading
    const removeButton = screen.getByTitle('Remove image');
    expect(removeButton).toBeDisabled();

    // Even though there's an error, retry should not work during loading
    const retryButton = screen.getByTitle('Retry loading image');
    await user.click(retryButton);
    expect(mockOnRetry).not.toHaveBeenCalled();
  });

  test('shows metadata when showMetadata is true', () => {
    render(
      <ImagePreview
        image={mockImage}
        showMetadata={true}
        src="data:image/jpeg;base64,test"
      />
    );

    expect(screen.getByText(mockImage.filename)).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument(); // Formatted file size
  });

  test('does not show metadata when showMetadata is false', () => {
    render(
      <ImagePreview
        image={mockImage}
        showMetadata={false}
        src="data:image/jpeg;base64,test"
      />
    );

    expect(screen.queryByText(mockImage.filename)).not.toBeInTheDocument();
    expect(screen.queryByText('1 MB')).not.toBeInTheDocument();
  });

  test('applies different size variants correctly', () => {
    const { rerender } = render(
      <ImagePreview
        image={mockImage}
        size="sm"
        src="data:image/jpeg;base64,test"
      />
    );

    let container = screen.getByTestId('image-preview-container');
    expect(container).toHaveClass('w-16', 'h-16');

    rerender(
      <ImagePreview
        image={mockImage}
        size="md"
        src="data:image/jpeg;base64,test"
      />
    );

    container = screen.getByTestId('image-preview-container');
    expect(container).toHaveClass('w-24', 'h-24');

    rerender(
      <ImagePreview
        image={mockImage}
        size="lg"
        src="data:image/jpeg;base64,test"
      />
    );

    container = screen.getByTestId('image-preview-container');
    expect(container).toHaveClass('w-32', 'h-32');
  });

  test('applies custom className', () => {
    render(
      <ImagePreview
        className="custom-preview"
        image={mockImage}
        src="data:image/jpeg;base64,test"
      />
    );

    const container = screen.getByTestId('image-preview-container');
    expect(container).toHaveClass('custom-preview');
  });

  test('does not show remove button when onRemove is not provided', () => {
    render(
      <ImagePreview image={mockImage} src="data:image/jpeg;base64,test" />
    );

    expect(screen.queryByTitle('Remove image')).not.toBeInTheDocument();
  });

  test('does not show retry button when onRetry is not provided', () => {
    render(
      <ImagePreview
        error={
          new ImageError('Some error', {
            code: IMAGE_ERROR_CODES.UPLOAD_FAILED,
          })
        }
        image={mockImage}
      />
    );

    // Should show error state but no retry button
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.queryByTitle('Retry loading image')).not.toBeInTheDocument();
  });

  test('resets image error state when retry is called', async () => {
    const user = userEvent.setup();

    render(
      <ImagePreview
        image={mockImage}
        onRetry={mockOnRetry}
        src="data:image/jpeg;base64,test"
      />
    );

    const img = screen.getByRole('img');
    expectToBeInstanceOf(img, HTMLImageElement);

    // Simulate image error
    img.dispatchEvent(new Event('error'));

    await waitFor(() => {
      // Should show error state
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    // Click retry
    const retryButton = screen.getByTitle('Retry loading image');
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledWith(mockImage.id);

    // Error state should be cleared and loading should start
    await waitFor(() => {
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  test('handles image dragging correctly', () => {
    render(
      <ImagePreview image={mockImage} src="data:image/jpeg;base64,test" />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('draggable', 'false');
  });

  test('shows appropriate hover states', () => {
    render(
      <ImagePreview
        image={mockImage}
        onRemove={mockOnRemove}
        showMetadata={true}
        src="data:image/jpeg;base64,test"
      />
    );

    // Remove button should have opacity-0 initially (becomes visible on hover)
    const removeButton = screen.getByTitle('Remove image');
    expect(removeButton).toHaveClass('opacity-0');
    expect(removeButton).toHaveClass('group-hover:opacity-100');

    // Metadata should also have hover opacity classes
    const metadataContainer = screen.getByTestId('metadata-overlay');
    expect(metadataContainer).toHaveClass('opacity-0');
    expect(metadataContainer).toHaveClass('group-hover:opacity-100');
  });
});
