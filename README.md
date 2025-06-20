# live-language-mate

Just moved to a new country? `live-language-mate` is a chat web app with minimalistic UI, which lets you chat with AI and learn the language naturally. This web app is designed mainly for expats moving to a new country.

In the current version, we only have English interface.

The web app's UI is responsive, therefore works in both desktop and mobile.

## How it works at a glance

In this system, there are 3 persons involved: you, Chat Mate, Editor Mate.

1. You as the user chat mainly with Chat Mate, you can type in any languages, 
2. Whenever you sent a message in the chat, 2 kinds of replies are triggered in parallel:
   1. Chat Mate is a native speaker of the target language you are learning, it replies to your chat message as if you are speaking target language, it understands whichever language you write in.
   2. Editor Mate comments on your chat message, it helps you to understand how could you write your message better in the target language, if you wrote in another language than the target language, Editor Mate will help to express what you were trying to say in the target language.
3. Once Chat Mate has replied, Editor Mate comments on Chat Mate's reply, explaining hard words and cultural contexts automatically for you, and giving you an example response as if the Editor Mate was you.
4. You can select words in any of the chat messages, and open the selection in Editor Mate Panel, in which you can then chat with Editor Mate.
5. Continue to chat with Chat Mate and learn the language naturally with Editor Mate's help!

More details below.

### Chat Mate

- Chat Mate is an AI agent.
- Chat Mate is a native of the country you just moved to.
- Chat Mate knows the country's cultural norms well.
- Chat Mate is a native speaker of the language you are learning, "Target Language".
- Chat Mate understands no matter which language you are talking to it, Chat Mate will just treat your chat message as if the message is written in Target Language.
- Chat Mate doesn't know you are new to their language and culture, which means, Chat Mate assumes you are already fully integrated into the society, therefore the chat will be intentionally kept natural without being interrupted by language learning itself.
- Chat Mate can only see the chat messages between you and itself, in other words, Chat Mate is unaware of any of the comments by Editor Mate and the chats between you and Editor Mate.
- You can configure Chat Mate's personality in free text, which will be appended as a part of its system prompt, this can for example change how Chat Mate talks with you, in which background you are talking with each other, etc.

### Editor Mate.
- Editor Mate is an AI agent.
- Editor Mate observes your conversation with Chat Mate.
- Editor Mate is a native of the country you just moved to.
- Editor Mate knows the country's cultural norms well.
- Editor Mate is an experienced teacher in Target Language.
- Editor Mate helps you to understand the language mistakes you make, and suggests how you can say it in a better way.
- If Editor Mate sees you are speaking a different language than Target Language, Editor Mate will translate the message into Target Language, and the translation takes the chat context into consideration.
- Chat Mate is unaware of the existence of Editor Mate.
- For each of the chat messages sent by you, Editor Mate make a comment to identify language mistakes, including but not limited to wrong grammar or wrong word choice, and make suggestion and/or give example about how to fix those mistakes and write correctly. If your message was written well, Editor Mate will just simply give you a thumb up emoji 👍 as a confirmation.
- For each of the chat messages sent by Chat Mate, Editor Mate replies to Chat Mate's message as if Editor Mate was you, this is to provide you an example response which you can take inspiration from. In addition, Editor Mate reviews to identify and fix language mistakes of Chat Mate's message, but if Chat Mate's message is totally correct, Editor Mate will not mention anything about Chat Mate's language being correct or wrong, so the response will only be replying to Chat Mate's message as if Editor Mate was you.
- You can configure Editor Mate's personality in free text, which will be appended as a part of its system prompt, this can for example control how much Editor Mate should clarify, tell Editor Mate how much you know about Target Language, etc.

## Other features
- Chat management
  - Create new chat
  - Left side bar for jumping between chats
  - Fork the chat from the selected message, in other words, create new chat from an existing chat message with its previous chat messages
  - Regenerate a certain chat message
  - Edit and delete chat messages in the chat, you can edit and delete all the messages no matter it's from you, Chat Mate, or Editor Mate
  - Prompts for Chat Mate and Editor Mate is copied from template to the chat when opening a new chat, you can edit the prompts for the chat without affecting prompts in the other chats
  - Delete chat
- Switch between LLM provider and models
  - Support OpenAI-compatible chat completion API, for example, via OpenRouter.
  - Chat message is live streamed if the API supports.
- Common useful tools for language learner:
  - Editor Mate Panel which allows you to ask Editor Mate more questions. In mobile, this interface is only opened when it's used; in desktop, this interface is docked to a sidebar to the right of the screen (=next to the main chat).
  - If you select words in any chat message or Editor Mate Panel, the words will be passed to Editor Mate Panel, replacing Editor Mate Panel's current context.
  - In Editor Mate Panel, there are quick links leading you to search the selected words on e.g. Google, Wikitionary, YouGlish.
