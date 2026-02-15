'use client';

import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  'What are the best value bets for today?',
  'Analyze the next Premier League match',
  'Show me high-confidence picks',
  'What leagues should I focus on?',
];

export default function AIDeskPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI sports betting assistant. Ask me anything about matches, odds, strategies, or get personalized recommendations.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a demo response. In production, this would connect to an AI service to provide real betting insights and analysis.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Bot className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">AI Desk</h1>
          </div>
          <p className="text-gray-400">
            Ask any sports betting question and get instant AI-powered insights
          </p>
        </div>

        <GlassCard className="p-6 mb-6">
          <div className="h-[500px] overflow-y-auto mb-4 space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-orange-500 text-white'
                      : 'bg-white/5 border border-white/10 text-gray-100'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-medium text-purple-400">AI Assistant</span>
                    </div>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-400" />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                      <div
                        className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about sports betting..."
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </GlassCard>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Sparkles className="w-4 h-4" />
            <span>Suggested questions:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedQuestions.map((question, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSuggestion(question)}
                className="text-left p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all text-sm text-gray-300"
              >
                {question}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
