import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { generateContextForQuery, getTabMetrics } from '../../services/ragService';
import { askGemini } from '../../services/geminiService';
import ChatMessage from './ChatMessage';
import { useSuggestedQuestions } from '../../hooks/useSuggestedQuestions';

const CHAT_TABS = [
  { id: 'general', label: '🏠 Society', title: 'Society Overview' },
  { id: 'maintenance', label: '🏬 Shops', title: 'Shops & Maintenance' },
  { id: 'finance', label: '💰 Finance', title: 'Income & Bills' },
  { id: 'operations', label: '🛠️ Operations', title: 'Staff & Tasks' },
  { id: 'complaints', label: '🚨 Complaints', title: 'Complaints Tracker' }
];

export default function AIChatWindow({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('general');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "I'm ready to help. Try asking about pending maintenance or recent complaints." }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [metrics, setMetrics] = useState([]);
  const messagesEndRef = useRef(null);
  
  const { suggestions } = useSuggestedQuestions(activeTab);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    async function loadMetrics() {
      if (isOpen) {
        const data = await getTabMetrics(activeTab);
        setMetrics(data);
      }
    }
    loadMetrics();
  }, [activeTab, isOpen]);

  const handleSend = async (text) => {
    if (!text.trim() || isTyping) return;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);

    try {
      // Step 1: Generate RAG Context from Firestore (with potential active tab fallback)
      let context = await generateContextForQuery(text);
      
      // If intent parser doesn't find anything, try using activeTab context
      if (!context) {
        let fallbackQuery = "";
        if (activeTab === 'maintenance') fallbackQuery = "shops";
        else if (activeTab === 'complaints') fallbackQuery = "complaints";
        else if (activeTab === 'finance') fallbackQuery = "finance";
        else if (activeTab === 'operations') fallbackQuery = "staff";
        
        if (fallbackQuery) {
          context = await generateContextForQuery(fallbackQuery);
        }
      }

      if (!context) {
        setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't find any matching data in your database." }]);
        setIsTyping(false);
        return;
      }

      // Step 2: Query Gemini
      const historyToPass = messages.slice(1);
      const answer = await askGemini(text, context, historyToPass);
      
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error while processing your request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  return (
    <div className={`ai-chat-window ${isOpen ? 'ai-chat-window--open' : ''}`}>
      <div className="ai-chat-header">
        <div className="ai-chat-header-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#10b981" />
            <h3>Euriska AI Assistant</h3>
          </div>
          <p>Ask anything about the society data</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="ai-chat-tabs">
        {CHAT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`ai-chat-tab-btn ${activeTab === tab.id ? 'ai-chat-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="ai-chat-messages">
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} role={msg.role} content={msg.content} />
        ))}
        {isTyping && <ChatMessage role="assistant" isTyping={true} />}
        
        {messages.length === 1 && (
          <>
            {/* Visual Metrics aggregate widgets */}
            {metrics && metrics.length > 0 && (
              <div className="ai-chat-metrics-container">
                <div className="ai-chat-metrics-header">
                  {CHAT_TABS.find(t => t.id === activeTab)?.title} Summary
                </div>
                <div className="ai-chat-metrics-grid">
                  {metrics.map((m, idx) => (
                    <div key={idx} className="ai-chat-metric-card">
                      <span className="ai-chat-metric-val" style={{ color: m.accent }}>{m.value}</span>
                      <span className="ai-chat-metric-lbl">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ai-chat-suggestions">
              <p className="ai-chat-suggestions-title">Suggested Questions</p>
              <div className="ai-chat-suggestions-list">
                {suggestions.map((suggestion, idx) => (
                  <button 
                    key={idx} 
                    className="ai-chat-suggestion-chip"
                    onClick={() => handleSend(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input-container">
        <form onSubmit={handleSubmit} className="ai-chat-input-wrapper">
          <input
            type="text"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={!input.trim()} aria-label="Send message">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
