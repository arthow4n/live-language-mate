import { apiClient } from '@/services/apiClient';
import { localStorageService } from '@/services/localStorageService';

export const generateChatTitle = async (
  conversationHistory: { message_type: string; content: string }[],
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const response = await apiClient.aiChat({
      message: `Based on this conversation in ${targetLanguage}, generate a very short (2-4 words) chat title that summarizes the topic. Only return the title, nothing else: ${contextMessages}`,
      messageType: 'title-generation',
      conversationHistory: [],
      systemPrompt:
        'You are a helpful assistant that generates short, concise chat titles.',
      chatMatePrompt: 'N/A',
      editorMatePrompt: 'N/A',
      targetLanguage,
      model,
      chatMateBackground: 'N/A',
      editorMateExpertise: 'N/A',
      feedbackStyle: 'encouraging',
      culturalContext: false,
      progressiveComplexity: false,
      streaming: false,
      currentDateTime,
      userTimezone,
      enableReasoning: false,
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
      const data = (await response.json()) as { response?: string };
      if (data.response) {
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

export const updateConversationTitle = (
  conversationId: string,
  newTitle: string
): boolean => {
  try {
    console.log(
      '💾 Updating conversation title:',
      conversationId,
      'to:',
      newTitle
    );

    localStorageService.updateConversationTitle(conversationId, newTitle);

    console.log('✅ Conversation title updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating conversation title:', error);
    return false;
  }
};
