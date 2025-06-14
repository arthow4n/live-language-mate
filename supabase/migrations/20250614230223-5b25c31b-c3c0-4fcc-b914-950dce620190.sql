
-- Add chat_mate_prompt and editor_mate_prompt columns to conversations table
ALTER TABLE public.conversations 
ADD COLUMN chat_mate_prompt TEXT,
ADD COLUMN editor_mate_prompt TEXT;
