import type { UiMessageType } from '@/schemas/messages';

/**
 * Converts UI messages to API format with correct role mapping
 * @param messages - Array of UI messages to convert
 * @returns Array of messages formatted for the API
 */
export function convertMessagesToApiFormat(
  messages: { content: string; type: UiMessageType }[]
): { content: string; role: 'assistant' | 'system' | 'user' }[] {
  return messages.map((msg) => ({
    content: `[${msg.type}]: ${msg.content}`,
    role: mapMessageTypeToRole(msg.type),
  }));
}

/**
 * Maps UI message types to OpenRouter API roles
 * @param messageType - The UI message type ('user', 'chat-mate', 'editor-mate')
 * @returns The appropriate role for the OpenRouter API
 */
export function mapMessageTypeToRole(
  messageType: UiMessageType
): 'assistant' | 'system' | 'user' {
  switch (messageType) {
    case 'chat-mate':
      return 'assistant';
    case 'editor-mate':
      return 'assistant';
    case 'user':
      return 'user';
    default:
      // This should never happen due to TypeScript typing, but adding for safety
      throw new Error(`Unknown message type: ${String(messageType)}`);
  }
}
