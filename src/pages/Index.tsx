
import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Send, 
  Menu, 
  Settings, 
  Plus, 
  MoreVertical,
  Languages,
  Trash2,
  Edit3,
  RotateCcw,
  Search,
  ExternalLink
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ChatMessage from '@/components/ChatMessage';
import AskInterface from '@/components/AskInterface';
import SettingsDialog from '@/components/SettingsDialog';

interface Message {
  id: string;
  type: 'user' | 'chat-mate' | 'editor-mate';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  lastMessage?: Date;
}

const Index = () => {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      title: 'Swedish Practice',
      messages: [
        {
          id: '1',
          type: 'user',
          content: 'Hej! How are you today?',
          timestamp: new Date()
        },
        {
          id: '2',
          type: 'chat-mate',
          content: 'Hej! Jag mår bra, tack så mycket! Hur mår du? Vad har du för planer idag?',
          timestamp: new Date()
        },
        {
          id: '3',
          type: 'editor-mate',
          content: '👍 Nice greeting! Just a small note: "How are you today?" can be translated as "Hur mår du idag?" in Swedish. Your Chat Mate responded perfectly naturally!',
          timestamp: new Date()
        }
      ],
      lastMessage: new Date()
    }
  ]);
  
  const [currentChatId, setCurrentChatId] = useState<string>('1');
  const [newMessage, setNewMessage] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [showAskInterface, setShowAskInterface] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentChat = chats.find(chat => chat.id === currentChatId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `New Chat ${chats.length + 1}`,
      messages: [],
      lastMessage: new Date()
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    setIsSidebarOpen(false);
    toast({
      title: "New chat created",
      description: "Ready to practice your language skills!"
    });
  };

  const deleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId && chats.length > 1) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChatId(remainingChats[0]?.id || '');
    }
    toast({
      title: "Chat deleted",
      description: "Chat has been removed successfully."
    });
  };

  const simulateAIResponse = async (userMessage: string) => {
    if (!currentChat) return;

    setIsStreaming(true);

    // Simulate Chat Mate response
    const chatMateMessage: Message = {
      id: Date.now().toString(),
      type: 'chat-mate',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    const updatedChat = { ...currentChat };
    updatedChat.messages.push(chatMateMessage);
    setChats(chats.map(chat => chat.id === currentChatId ? updatedChat : chat));

    // Simulate streaming response
    const responses = [
      "Det låter intressant! Berätta mer om vad du tänker på.",
      "Vad kul att höra! Jag håller med dig helt och hållet.",
      "Oj, det var något nytt för mig. Kan du förklara det lite mer?",
      "Absolut! Det är precis så jag också känner. Vad tycker du om...?"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Stream the response character by character
    for (let i = 0; i <= randomResponse.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      chatMateMessage.content = randomResponse.substring(0, i);
      setChats(chats => chats.map(chat => 
        chat.id === currentChatId 
          ? {
              ...chat,
              messages: chat.messages.map(msg => 
                msg.id === chatMateMessage.id ? { ...chatMateMessage } : msg
              )
            }
          : chat
      ));
    }

    chatMateMessage.isStreaming = false;
    
    // Add Editor Mate comment after a short delay
    setTimeout(() => {
      const editorComments = [
        "👍 Great conversation flow! Your Swedish friend responded naturally.",
        "Good exchange! Note: 'Det låter intressant' means 'That sounds interesting' - perfect conversational Swedish!",
        "Nice! Your chat mate used 'Vad kul att höra!' which means 'How nice to hear!' - a common positive expression.",
        "👍 Excellent natural conversation! Your friend's response shows genuine interest."
      ];
      
      const editorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'editor-mate',
        content: editorComments[Math.floor(Math.random() * editorComments.length)],
        timestamp: new Date()
      };

      setChats(chats => chats.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, editorMessage] }
          : chat
      ));
    }, 1000);

    setIsStreaming(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentChat || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: newMessage.trim(),
      timestamp: new Date()
    };

    const updatedChat = { ...currentChat };
    updatedChat.messages.push(userMessage);
    updatedChat.lastMessage = new Date();
    
    setChats(chats.map(chat => chat.id === currentChatId ? updatedChat : chat));
    setNewMessage('');

    // Simulate AI responses
    await simulateAIResponse(userMessage.content);
  };

  const handleTextSelection = (text: string) => {
    setSelectedText(text);
    setShowAskInterface(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Languages className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg">Language Mate</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        <Button 
          onClick={createNewChat}
          className="w-full"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 group ${
                currentChatId === chat.id 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => {
                setCurrentChatId(chat.id);
                setIsSidebarOpen(false);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {chat.title}
                  </h3>
                  {chat.messages.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {chat.messages[chat.messages.length - 1].content}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-80 border-r bg-white">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h1 className="font-semibold text-lg">
                {currentChat?.title || 'Language Practice'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAskInterface(!showAskInterface)}
              className="hidden lg:flex"
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 px-4">
              <div className="max-w-4xl mx-auto py-4 space-y-4">
                {currentChat?.messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onTextSelect={handleTextSelection}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t bg-white p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message in Swedish or English..."
                    className="flex-1"
                    disabled={isStreaming}
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isStreaming}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Ask Interface */}
          <div className="hidden lg:block w-80 border-l bg-white">
            <AskInterface selectedText={selectedText} />
          </div>
        </div>
      </div>

      {/* Mobile Ask Interface */}
      <Sheet open={showAskInterface} onOpenChange={setShowAskInterface}>
        <SheetContent side="right" className="w-full sm:w-80 p-0">
          <AskInterface 
            selectedText={selectedText} 
            onClose={() => setShowAskInterface(false)} 
          />
        </SheetContent>
      </Sheet>

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
};

export default Index;
