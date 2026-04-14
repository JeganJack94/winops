import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';

export default function BotFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: 'Hello! I am Monk. How can I help you today?' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputVal.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: inputVal.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputVal('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/web-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.text })
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: data.text || "Sorry, I couldn't understand that."
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: 'Connection to Monk failed. Please check network.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatText = (text) => {
    // Basic markdown to html replacement matching whatsapp rules slightly
    let formatted = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>'); // bold
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>'); // italics
    formatted = formatted.replace(/~(.*?)~/g, '<del>$1</del>'); // strikethrough

    return formatted.split('\n').map((line, i) => (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: line }} />
        <br />
      </span>
    ));
  };

  return (
    <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[9000] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-[calc(100vw-3rem)] md:w-80 h-[500px] max-h-[70vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Monk</h3>
                  <p className="text-[10px] text-primary-100 font-medium">WinOps AI Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 custom-scrollbar flex flex-col gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                  <div className={`p-3 max-w-[85%] rounded-2xl text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-sm' 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm border border-gray-100 dark:border-gray-800'
                  }`}>
                    {formatText(msg.text)}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start w-full">
                  <div className="px-4 py-3 max-w-[85%] rounded-2xl text-sm shadow-sm bg-white dark:bg-gray-800 rounded-tl-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2 text-gray-500">
                    <Loader2 size={16} className="animate-spin" /> Monk is typing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl p-1 shadow-inner border border-gray-100 dark:border-gray-700">
                <textarea
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder="Ask Monk..."
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none outline-none resize-none p-3 text-sm"
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="mb-1 mr-1 p-2 bg-primary text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors shadow-md"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white shadow-xl shadow-primary/30 border border-white/20 backdrop-blur-sm relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }}>
              <MessageSquare size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
