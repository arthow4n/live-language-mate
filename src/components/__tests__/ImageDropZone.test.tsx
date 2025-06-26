import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createTestFile } from '@/__tests__/testUtilities';

import { ImageDropZone } from '../ImageDropZone';

describe('ImageDropZone', () => {
  const mockOnFilesDropped = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to create DataTransfer with files using polyfills
  const createDataTransfer = (files: File[]): DataTransfer => {
    const dt = new DataTransfer();
    files.forEach((file) => {
      dt.items.add(file);
    });
    return dt;
  };

  // Helper function to fire drag events with DataTransfer using testing-library fireEvent
  const fireDragEvent = (
    element: Element,
    eventConfig: { dataTransfer: DataTransfer; type: string }
  ): void => {
    const { dataTransfer, type } = eventConfig;
    if (type === 'drop') {
      // For drop events, create a custom event to avoid pageX setter issues
      const event = Object.assign(new Event(type, { bubbles: true }), {
        dataTransfer,
        preventDefault: (): void => undefined,
        stopPropagation: (): void => undefined,
      });
      fireEvent(element, event);
    } else {
      const eventInit: DragEventInit = {
        bubbles: true,
        dataTransfer,
      };
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Test helper for dynamic fireEvent access
      const eventHandler = fireEvent[type as keyof typeof fireEvent];
      if (typeof eventHandler === 'function') {
        eventHandler(element, eventInit);
      } else {
        fireEvent(
          element,
          Object.assign(new Event(type, { bubbles: true }), { dataTransfer })
        );
      }
    }
  };

  test('renders children content', () => {
    render(
      <ImageDropZone onFilesDropped={mockOnFilesDropped}>
        <div>Drop zone content</div>
      </ImageDropZone>
    );

    expect(screen.getByText('Drop zone content')).toBeInTheDocument();
  });

  test('shows drop overlay when dragging files over', () => {
    render(
      <ImageDropZone onFilesDropped={mockOnFilesDropped}>
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    const dataTransfer = createDataTransfer(files);

    // Simulate drag enter
    fireDragEvent(dropZone, { dataTransfer, type: 'dragenter' });

    expect(screen.getByText('Drop images here')).toBeInTheDocument();
    expect(
      screen.getByText('Release to upload your images')
    ).toBeInTheDocument();
  });

  test('hides drop overlay when drag leaves', () => {
    render(
      <ImageDropZone onFilesDropped={mockOnFilesDropped}>
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    const dataTransfer = createDataTransfer(files);

    // Simulate drag enter
    fireDragEvent(dropZone, { dataTransfer, type: 'dragenter' });

    expect(screen.getByText('Drop images here')).toBeInTheDocument();

    // Simulate drag leave
    fireDragEvent(dropZone, { dataTransfer, type: 'dragleave' });

    expect(screen.queryByText('Drop images here')).not.toBeInTheDocument();
  });

  test('handles file drop successfully', () => {
    render(
      <ImageDropZone onFilesDropped={mockOnFilesDropped}>
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test1.jpg',
        size: 1024 * 1024,
      }),
      createTestFile({
        mimeType: 'image/png',
        name: 'test2.png',
        size: 2 * 1024 * 1024,
      }),
    ];

    const dataTransfer = createDataTransfer(files);

    // Simulate drop
    fireDragEvent(dropZone, { dataTransfer, type: 'drop' });

    expect(mockOnFilesDropped).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'test1.jpg' }),
        expect.objectContaining({ name: 'test2.png' }),
      ])
    );
    expect(mockOnError).not.toHaveBeenCalled();
  });

  test('validates files on drop and filters invalid ones', () => {
    render(
      <ImageDropZone
        onError={mockOnError}
        onFilesDropped={mockOnFilesDropped}
        validationOptions={{ maxSize: 1024 * 1024 }} // 1MB limit
      >
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');

    const validFile = createTestFile({
      mimeType: 'image/jpeg',
      name: 'small.jpg',
      size: 500 * 1024, // 500KB
    });

    const invalidFile = createTestFile({
      mimeType: 'image/jpeg',
      name: 'large.jpg',
      size: 2 * 1024 * 1024, // 2MB
    });

    const dataTransfer = createDataTransfer([validFile, invalidFile]);

    // Simulate drop
    fireDragEvent(dropZone, { dataTransfer, type: 'drop' });

    expect(mockOnFilesDropped).toHaveBeenCalledWith([validFile]);
    expect(mockOnError).toHaveBeenCalledWith(
      expect.stringContaining('large.jpg')
    );
  });

  test('handles drop with no image files', () => {
    render(
      <ImageDropZone onError={mockOnError} onFilesDropped={mockOnFilesDropped}>
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');

    const dataTransfer = createDataTransfer([]);

    // Simulate drop
    fireDragEvent(dropZone, { dataTransfer, type: 'drop' });

    expect(mockOnFilesDropped).not.toHaveBeenCalled();
    expect(mockOnError).toHaveBeenCalledWith(
      'No image files found in the dropped items'
    );
  });

  test('does not respond to drag events when disabled', () => {
    render(
      <ImageDropZone disabled={true} onFilesDropped={mockOnFilesDropped}>
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    const dataTransfer = createDataTransfer(files);

    // Simulate drag enter
    fireDragEvent(dropZone, { dataTransfer, type: 'dragenter' });

    expect(screen.queryByText('Drop images here')).not.toBeInTheDocument();

    // Simulate drop
    fireDragEvent(dropZone, { dataTransfer, type: 'drop' });

    expect(mockOnFilesDropped).not.toHaveBeenCalled();
  });

  test('sets correct drop effect during drag over', () => {
    render(
      <ImageDropZone onFilesDropped={mockOnFilesDropped}>
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    const dataTransfer = createDataTransfer(files);

    // Simulate drag over
    fireDragEvent(dropZone, { dataTransfer, type: 'dragover' });

    expect(dataTransfer.dropEffect).toBe('copy');
  });

  test('handles drag counter correctly for nested elements', () => {
    render(
      <ImageDropZone onFilesDropped={mockOnFilesDropped}>
        <div data-testid="dropzone">
          <div data-testid="nested">Nested content</div>
        </div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');
    const nested = screen.getByTestId('nested');

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    const dataTransfer = createDataTransfer(files);

    // Simulate drag enter on parent
    fireDragEvent(dropZone, { dataTransfer, type: 'dragenter' });

    expect(screen.getByText('Drop images here')).toBeInTheDocument();

    // Simulate drag enter on nested element
    fireDragEvent(nested, { dataTransfer, type: 'dragenter' });

    expect(screen.getByText('Drop images here')).toBeInTheDocument();

    // Simulate drag leave on nested element
    fireDragEvent(nested, { dataTransfer, type: 'dragleave' });

    // Should still show overlay since we're still over parent
    expect(screen.getByText('Drop images here')).toBeInTheDocument();

    // Simulate drag leave on parent
    fireDragEvent(dropZone, { dataTransfer, type: 'dragleave' });

    // Now overlay should be hidden
    expect(screen.queryByText('Drop images here')).not.toBeInTheDocument();
  });

  test('does not show overlay when showOverlay is false', () => {
    render(
      <ImageDropZone onFilesDropped={mockOnFilesDropped} showOverlay={false}>
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    const dataTransfer = createDataTransfer(files);

    // Simulate drag enter
    fireDragEvent(dropZone, { dataTransfer, type: 'dragenter' });

    expect(screen.queryByText('Drop images here')).not.toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(
      <ImageDropZone
        className="custom-drop-zone"
        onFilesDropped={mockOnFilesDropped}
      >
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');
    expect(dropZone).toHaveClass('custom-drop-zone');
  });

  test('resets drag state when becoming disabled', () => {
    const { rerender } = render(
      <ImageDropZone onFilesDropped={mockOnFilesDropped}>
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    const dropZone = screen.getByTestId('image-drop-zone');

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    const dataTransfer = createDataTransfer(files);

    // Simulate drag enter
    fireDragEvent(dropZone, { dataTransfer, type: 'dragenter' });

    expect(screen.getByText('Drop images here')).toBeInTheDocument();

    // Disable the component
    rerender(
      <ImageDropZone disabled={true} onFilesDropped={mockOnFilesDropped}>
        <div data-testid="dropzone">Drop zone content</div>
      </ImageDropZone>
    );

    expect(screen.queryByText('Drop images here')).not.toBeInTheDocument();
  });
});
