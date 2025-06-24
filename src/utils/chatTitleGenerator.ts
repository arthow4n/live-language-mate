import { logError } from '@/lib/utils';
import { apiClient } from '@/services/apiClient';
import { systemPrompts } from '@/services/prompts/templates/systemPrompts';

export const generateChatTitle = async (options: {
  conversationHistory: { content: string; message_type: string }[];
  model: string;
  targetLanguage: string;
}): Promise<string> => {
  const { conversationHistory, model, targetLanguage } = options;
  try {
    // Get the first few messages to understand the conversation context
    const contextMessages = conversationHistory
      .slice(0, 4)
      .map((msg) => msg.content)
      .join(' ');

    const currentDateTime = new Date().toLocaleString('en-US', {
      day: 'numeric',
      hour: '2-digit',
      hour12: true,
      minute: '2-digit',
      month: 'long',
      second: '2-digit',
      weekday: 'long',
      year: 'numeric',
    });
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Build message using the system prompt template
    const titleTemplate = systemPrompts.titleGeneration;
    const message = titleTemplate.userMessageTemplate
      .replace('{targetLanguage}', targetLanguage)
      .replace('{contextMessages}', contextMessages);

    const response = await apiClient.aiChat({
      chatMateBackground: 'N/A',
      chatMatePrompt: 'N/A',
      conversationHistory: [],
      culturalContext: false,
      currentDateTime,
      editorMateExpertise: 'N/A',
      editorMatePrompt: 'N/A',
      enableReasoning: false,
      feedbackStyle: 'encouraging',
      message,
      messageType: 'title-generation',
      model,
      progressiveComplexity: false,
      streaming: false,
      systemPrompt: titleTemplate.systemPrompt,
      targetLanguage,
      userTimezone,
    });

    if (!response.ok) {
      logError(
        '❌ Title generation response not ok:',
        response.status,
        response.statusText
      );
      return 'Chat';
    }

    // Handle both streaming and non-streaming responses
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      if (
        data &&
        typeof data === 'object' &&
        'response' in data &&
        typeof data.response === 'string' &&
        data.response
      ) {
        const title = String(data.response).trim().replace(/['"]/g, '');
        const finalTitle =
          title.length > 30 ? title.substring(0, 30) + '...' : title;
        return finalTitle;
      }
    }

    logError('❌ Invalid response format for title generation');
    return 'Chat';
  } catch (error) {
    logError('❌ Error generating title:', error);
    return 'Chat';
  }
};
