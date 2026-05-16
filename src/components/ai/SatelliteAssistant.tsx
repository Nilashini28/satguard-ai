"use client";

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import type { SatelliteState, AnomalyAlert } from '@/types/satellite';
import { sendChatMessage, STARTER_QUESTIONS } from '@/lib/claudeClient';

interface SatelliteAssistantProps {
  satellites: SatelliteState[];
  alerts: AnomalyAlert[];
  initialMessage?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function SatelliteAssistant({ satellites, alerts, initialMessage }: SatelliteAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      handleSendMessage(initialMessage);
    }
  }, [initialMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      const { streaming } = await sendChatMessage(message, satellites, alerts, messages);

      await streaming((chunk) => {
        setStreamingContent(prev => prev + chunk);
      });

      setMessages(prev => [...prev, { role: 'assistant', content: streamingContent }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to connect to AI. Please check your API key configuration.' }]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-full shadow-lg hover:bg-primary/90 transition-colors font-semibold"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
          Ask SATGUARD AI
        </button>
      )}

      {isOpen && (
        <div className="w-96 h-[500px] bg-card border border-border rounded-xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-100">SATGUARD AI</h3>
                <p className="text-xs text-gray-500">Satellite Operations Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-darker rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 text-center">
                  Ask me about satellite telemetry, anomalies, or system status.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {STARTER_QUESTIONS.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(question)}
                      className="text-left px-3 py-2 bg-darker rounded-lg text-sm text-gray-300 hover:bg-darker/80 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-lg ${
                  msg.role === 'user' ? 'bg-primary text-black' : 'bg-darker text-gray-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3 py-2 rounded-lg bg-darker text-gray-200">
                  <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                  <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                </div>
              </div>
            )}

            {isLoading && !streamingContent && (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-darker border border-border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary/50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-primary text-black rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}