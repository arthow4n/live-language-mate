import {
  supabase,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '@/integrations/supabase/client';

export const generateChatTitle = async (
  conversationHistory: Array<{ message_type: string; content: string }>,
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

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        message: `Based on this conversation in ${targetLanguage}, generate a very short (2-4 words) chat title that summarizes the topic. Only return the title, nothing else: ${contextMessages}`,
        messageType: 'title-generation',
        conversationHistory: [],
        targetLanguage,
        model,
        streaming: false,
      }),
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
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
      if (data.response) {
        const title = data.response.trim().replace(/['"]/g, '');
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

export const updateConversationTitle = async (
  conversationId: string,
  newTitle: string
): Promise<boolean> => {
  try {
    console.log(
      '💾 Updating conversation title:',
      conversationId,
      'to:',
      newTitle
    );

    const { error } = await supabase
      .from('conversations')
      .update({
        title: newTitle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (error) {
      console.error('❌ Error updating conversation title:', error);
      return false;
    }

    console.log('✅ Conversation title updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating conversation title:', error);
    return false;
  }
};
