import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function ChatMessage({ role, content, isTyping }) {
  const isAssistant = role === 'assistant';

  if (isTyping) {
    return (
      <div className="chat-message chat-message--assistant">
        <div className="chat-avatar">AI</div>
        <div className="chat-bubble chat-bubble--typing">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-message ${isAssistant ? 'chat-message--assistant' : 'chat-message--user'}`}>
      <div className="chat-avatar">{isAssistant ? 'AI' : 'U'}</div>
      <div className={`chat-bubble ${isAssistant ? 'chat-bubble--assistant' : 'chat-bubble--user'}`}>
        {isAssistant ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <p>{content}</p>
        )}
      </div>
    </div>
  );
}
