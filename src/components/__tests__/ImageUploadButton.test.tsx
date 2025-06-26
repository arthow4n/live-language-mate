import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createTestFile } from '@/__tests__/testUtilities';
import { expectToBeInstanceOf } from '@/__tests__/typedExpectHelpers';

import { ImageUploadButton } from '../ImageUploadButton';

describe('ImageUploadButton', () => {
  const mockOnFilesSelected = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test utilities are now imported from testUtilities module

  test('renders upload button with default content', () => {
    render(<ImageUploadButton onFilesSelected={mockOnFilesSelected} />);

    const button = screen.getByRole('button', { name: /upload images/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Upload Images')).toBeInTheDocument();
  });

  test('renders custom children when provided', () => {
    render(
      <ImageUploadButton onFilesSelected={mockOnFilesSelected}>
        Custom Upload Text
      </ImageUploadButton>
    );

    expect(screen.getByText('Custom Upload Text')).toBeInTheDocument();
    expect(screen.queryByText('Upload Images')).not.toBeInTheDocument();
  });

  test('opens file dialog when button is clicked', async () => {
    const user = userEvent.setup();

    render(<ImageUploadButton onFilesSelected={mockOnFilesSelected} />);

    const button = screen.getByRole('button', { name: /upload images/i });
    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(button);

    expect(clickSpy).toHaveBeenCalledOnce();

    clickSpy.mockRestore();
  });

  test('opens file dialog when Enter key is pressed', async () => {
    const user = userEvent.setup();

    render(<ImageUploadButton onFilesSelected={mockOnFilesSelected} />);

    const button = screen.getByRole('button', { name: /upload images/i });
    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    const clickSpy = vi.spyOn(fileInput, 'click');

    button.focus();
    await user.keyboard('{Enter}');

    expect(clickSpy).toHaveBeenCalledOnce();

    clickSpy.mockRestore();
  });

  test('opens file dialog when Space key is pressed', async () => {
    const user = userEvent.setup();

    render(<ImageUploadButton onFilesSelected={mockOnFilesSelected} />);

    const button = screen.getByRole('button', { name: /upload images/i });
    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    const clickSpy = vi.spyOn(fileInput, 'click');

    button.focus();
    await user.keyboard(' ');

    expect(clickSpy).toHaveBeenCalledOnce();

    clickSpy.mockRestore();
  });

  test('handles valid file selection', async () => {
    const user = userEvent.setup();

    render(<ImageUploadButton onFilesSelected={mockOnFilesSelected} />);

    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    const validFile = createTestFile({
      mimeType: 'image/jpeg',
      name: 'test.jpg',
      size: 1024 * 1024, // 1MB
    });

    await user.upload(fileInput, validFile);

    expect(mockOnFilesSelected).toHaveBeenCalledWith([validFile]);
    expect(mockOnError).not.toHaveBeenCalled();
  });

  test('handles multiple valid files', async () => {
    const user = userEvent.setup();

    render(
      <ImageUploadButton
        multiple={true}
        onFilesSelected={mockOnFilesSelected}
      />
    );

    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    const validFiles = [
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

    await user.upload(fileInput, validFiles);

    expect(mockOnFilesSelected).toHaveBeenCalledWith(validFiles);
    expect(mockOnError).not.toHaveBeenCalled();
  });

  test('handles file validation errors', async () => {
    const user = userEvent.setup();

    render(
      <ImageUploadButton
        onError={mockOnError}
        onFilesSelected={mockOnFilesSelected}
        validationOptions={{ maxSize: 1024 }} // 1KB limit
      />
    );

    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    const invalidFile = createTestFile({
      mimeType: 'image/jpeg',
      name: 'large.jpg',
      size: 2 * 1024 * 1024, // 2MB - exceeds 1KB limit
    });

    await user.upload(fileInput, invalidFile);

    expect(mockOnFilesSelected).not.toHaveBeenCalled();
    expect(mockOnError).toHaveBeenCalledWith(
      expect.stringContaining('large.jpg')
    );
  });

  test('handles mixed valid and invalid files', async () => {
    const user = userEvent.setup();

    render(
      <ImageUploadButton
        multiple={true}
        onError={mockOnError}
        onFilesSelected={mockOnFilesSelected}
        validationOptions={{ maxSize: 1024 * 1024 }} // 1MB limit
      />
    );

    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

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

    await user.upload(fileInput, [validFile, invalidFile]);

    expect(mockOnFilesSelected).toHaveBeenCalledWith([validFile]);
    expect(mockOnError).toHaveBeenCalledWith(
      expect.stringContaining('large.jpg')
    );
  });

  test('does not call handlers when disabled', async () => {
    const user = userEvent.setup();

    render(
      <ImageUploadButton
        disabled={true}
        onFilesSelected={mockOnFilesSelected}
      />
    );

    const button = screen.getByRole('button', { name: /upload images/i });
    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(button);

    expect(clickSpy).not.toHaveBeenCalled();
    expect(mockOnFilesSelected).not.toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  test('resets input value after file selection', async () => {
    const user = userEvent.setup();

    render(<ImageUploadButton onFilesSelected={mockOnFilesSelected} />);

    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    const validFile = createTestFile({
      mimeType: 'image/jpeg',
      name: 'test.jpg',
      size: 1024 * 1024,
    });

    await user.upload(fileInput, validFile);

    expect(fileInput.value).toBe('');
  });

  test('handles empty file selection gracefully', async () => {
    const user = userEvent.setup();

    render(<ImageUploadButton onFilesSelected={mockOnFilesSelected} />);

    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    // Simulate selecting files and then canceling
    await user.upload(fileInput, []);

    expect(mockOnFilesSelected).not.toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
  });

  test('applies custom className', () => {
    render(
      <ImageUploadButton
        className="custom-class"
        onFilesSelected={mockOnFilesSelected}
      />
    );

    const button = screen.getByRole('button', { name: /upload images/i });
    expect(button).toHaveClass('custom-class');
  });

  test('applies different sizes correctly', () => {
    const { rerender } = render(
      <ImageUploadButton onFilesSelected={mockOnFilesSelected} size="icon" />
    );

    // Icon size should not show text
    expect(screen.queryByText('Upload Images')).not.toBeInTheDocument();

    rerender(
      <ImageUploadButton onFilesSelected={mockOnFilesSelected} size="lg" />
    );

    // Large size should show text
    expect(screen.getByText('Upload Images')).toBeInTheDocument();
  });

  test('has correct file input attributes', () => {
    render(
      <ImageUploadButton
        multiple={false}
        onFilesSelected={mockOnFilesSelected}
      />
    );

    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute(
      'accept',
      'image/png,image/jpeg,image/webp,image/gif'
    );
    expect(fileInput).toHaveAttribute('aria-hidden', 'true');
    expect(fileInput).not.toHaveAttribute('multiple');
  });

  test('sets multiple attribute when multiple is true', () => {
    render(
      <ImageUploadButton
        multiple={true}
        onFilesSelected={mockOnFilesSelected}
      />
    );

    const fileInput = screen.getByTestId('file-input');
    expectToBeInstanceOf(fileInput, HTMLInputElement);

    expect(fileInput).toHaveAttribute('multiple');
  });
});
