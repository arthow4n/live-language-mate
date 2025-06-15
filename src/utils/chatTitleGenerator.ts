
import { supabase } from "@/integrations/supabase/client";

export const generateChatTitle = async (
  conversationHistory: Array<{ role: string; content: string }>,
  targetLanguage: string
): Promise<string> => {
  try {
    // Get the first few messages to understand the conversation context
    const contextMessages = conversationHistory.slice(0, 4).map(msg => msg.content).join(' ');
    
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: `Based on this conversation in ${targetLanguage}, generate a very short (2-4 words) chat title that summarizes the topic. Only return the title, nothing else: ${contextMessages}`,
        messageType: 'title-generation',
        conversationHistory: [],
        targetLanguage
      }
    });

    if (error || !data?.response) {
      console.error('Error generating title:', error);
      return 'Chat';
    }

    // Clean up the response and ensure it's short
    const title = data.response.trim().replace(/['"]/g, '');
    return title.length > 30 ? title.substring(0, 30) + '...' : title;
  } catch (error) {
    console.error('Error generating chat title:', error);
    return 'Chat';
  }
};

export const updateConversationTitle = async (
  conversationId: string,
  newTitle: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ 
        title: newTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating conversation title:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating conversation title:', error);
    return false;
  }
};
