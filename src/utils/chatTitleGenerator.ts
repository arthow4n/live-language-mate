import { apiClient } from '@/services/apiClient';

export const generateChatTitle = async (
  conversationHistory: { content: string; message_type: string }[],
  targetLanguage: string,
  model: string
): Promise<string> => {
  try {
    // Get the first few messages to understand the conversation context
    const contextMessages = conversationHistory
      .slice(0, 4)
      .map((msg) => msg.content)
      .join(' ');

    console.log(
      '🏷️ Generating title from messages:',
      contextMessages.substring(0, 100) + '...'
    );

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
      message: `Based on this conversation in ${targetLanguage}, generate a very short (2-4 words) chat title that summarizes the topic. Only return the title, nothing else: ${contextMessages}`,
      messageType: 'title-generation',
      model,
      progressiveComplexity: false,
      streaming: false,
      systemPrompt:
        'You are a helpful assistant that generates short, concise chat titles.',
      targetLanguage,
      userTimezone,
    });

    if (!response.ok) {
      console.error(
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
        console.log('✅ Generated title:', finalTitle);
        return finalTitle;
      }
    }

    console.error('❌ Invalid response format for title generation');
    return 'Chat';
  } catch (error) {
    console.error('❌ Error generating title:', error);
    return 'Chat';
  }
};
