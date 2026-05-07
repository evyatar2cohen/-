import React, { useState, useRef, useEffect } from 'react';
import { Send, Cloud, MapPin, Sparkles, Loader2, ThermometerSun, Wind, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { streamChat, ChatMessage } from './services/gemini';
import { WeatherDisplay } from './components/WeatherDisplay';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'שלום! אני SkyWise AI. איך אני יכול לעזור לך עם מזג האוויר היום?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const chatStream = streamChat(userMessage, messages);
      let isFirstChunk = true;
      
      for await (const chunk of chatStream) {
        if (isFirstChunk) {
          setMessages(prev => [...prev, { 
            role: 'model', 
            text: chunk.text || '', 
            weatherData: chunk.weatherData 
          }]);
          isFirstChunk = false;
        } else {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'model') {
              lastMessage.text = chunk.text || '';
              lastMessage.weatherData = chunk.weatherData || lastMessage.weatherData;
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'מצטער, חלה שגיאה בתקשורת. אנא נסה שוב.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative flex flex-col h-screen max-w-5xl mx-auto px-4">
        {/* Header */}
        <header className="py-6 flex items-center justify-between border-b border-zinc-800/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Cloud className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SkyWise AI</h1>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">מנוע מזג אוויר מדויק</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              עדכונים חיים
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto py-8 space-y-8 scrollbar-hide" dir="rtl">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col gap-3 max-w-[85%]",
                  msg.role === 'user' ? "mr-auto items-start" : "ml-auto items-end"
                )}
              >
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed text-right",
                  msg.role === 'user' 
                    ? "bg-emerald-600 text-white rounded-tl-none shadow-lg shadow-emerald-900/20" 
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tr-none"
                )}>
                  <div className="markdown-body">
                    <ReactMarkdown>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
                
                {msg.weatherData && (
                  <div className="w-full max-w-md mt-2">
                    <WeatherDisplay data={msg.weatherData} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex items-center gap-2 text-zinc-500 text-sm font-mono justify-end"
            >
              מנתח מודלים של מזג אוויר...
              <Loader2 className="w-4 h-4 animate-spin" />
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input Area */}
        <footer className="py-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
          <form onSubmit={handleSubmit} className="relative group" dir="rtl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="שאל על מזג האוויר בכל מקום בעולם..."
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-6 py-4 pl-14 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all backdrop-blur-xl text-right"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-5 h-5 rotate-180" />
            </button>
          </form>
          <p className="text-[10px] text-zinc-600 text-center mt-4 font-mono uppercase tracking-widest">
            מופעל על ידי Gemini 3 Flash ומודלים עולמיים של Open-Meteo
          </p>
        </footer>
      </div>
    </div>
  );
}
