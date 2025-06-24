import { useCallback } from 'react';

import type { MessageMetadata } from '@/schemas/messages';

import { logError } from '@/lib/utils';
import { aiChatStreamResponseSchema } from '@/schemas/api';

/**
 * Configuration for the AI streaming hook
 */
interface UseAIStreamingOptions {
  /**
   * Called when streaming is complete
   * @param completeData - Object containing messageId and final metadata
   */
  onComplete: (completeData: {
    messageId: string;
    metadata: MessageMetadata;
  }) => void;

  /**
   * Called when content is updated during streaming
   * @param updateData - Object containing messageId, content, and optional reasoning
   */
  onContentUpdate: (updateData: {
    content: string;
    messageId: string;
    reasoning?: string;
  }) => void;
}

/**
 * Hook for handling AI streaming responses with consistent parsing and error handling.
 *
 * This hook processes Server-Sent Events (SSE) from the AI API and provides callbacks
 * for content updates and completion. It handles the standard streaming format:
 * - Lines delimited by `\n\n`
 * - JSON payloads with `{"type": "content|reasoning|done", "content": "..."}`
 * - Proper buffering for partial chunks
 * @param options - Configuration object with callback functions
 * @returns Function to handle streaming response
 */
export function useAIStreaming(options: UseAIStreamingOptions): {
  handleStreamingResponse: (params: {
    messageId: string;
    model: string;
    response: Response;
    startTime: number;
  }) => Promise<{
    content: string;
    metadata: MessageMetadata;
    reasoning: string;
  }>;
} {
  const { onComplete, onContentUpdate } = options;

  const handleStreamingResponse = useCallback(
    async (params: {
      messageId: string;
      model: string;
      response: Response;
      startTime: number;
    }): Promise<{
      content: string;
      metadata: MessageMetadata;
      reasoning: string;
    }> => {
      const { messageId, model, response, startTime } = params;

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let reasoningContent = '';
      let buffer = '';

      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- infinite loop requires explicit break condition
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');

          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const rawData = JSON.parse(line.slice(6));
                const parseResult =
                  aiChatStreamResponseSchema.safeParse(rawData);
                if (!parseResult.success) {
                  continue;
                }
                const data = parseResult.data;

                if (data.type === 'content' && data.content) {
                  fullContent += data.content;
                  onContentUpdate({
                    content: fullContent,
                    messageId,
                    reasoning: reasoningContent || undefined,
                  });
                } else if (data.type === 'reasoning' && data.content) {
                  reasoningContent += data.content;
                  onContentUpdate({
                    content: fullContent,
                    messageId,
                    reasoning: reasoningContent,
                  });
                } else if (data.type === 'done') {
                  const endTime = Date.now();
                  const generationTime = endTime - startTime;
                  const metadata: MessageMetadata = {
                    endTime,
                    generationTime,
                    model,
                    startTime,
                  };

                  onComplete({ messageId, metadata });

                  return {
                    content: fullContent,
                    metadata,
                    reasoning: reasoningContent,
                  };
                }
              } catch (e) {
                logError('Error parsing streaming data:', e, 'Line:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Fallback if stream ends without 'done' message
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      const metadata: MessageMetadata = {
        endTime,
        generationTime,
        model,
        startTime,
      };

      onComplete({ messageId, metadata });

      return {
        content: fullContent,
        metadata,
        reasoning: reasoningContent,
      };
    },
    [onContentUpdate, onComplete]
  );

  return { handleStreamingResponse };
}
