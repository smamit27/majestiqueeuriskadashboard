import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import './AIChat.css';

export default function AIChatButton({ isOpen, onClick }) {
  return (
    <button
      className={`ai-chat-button ${isOpen ? 'ai-chat-button--open' : ''}`}
      onClick={onClick}
      aria-label="Toggle AI Chat"
    >
      {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
    </button>
  );
}
