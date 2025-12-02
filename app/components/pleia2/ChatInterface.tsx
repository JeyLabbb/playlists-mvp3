'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isError?: boolean;
  playlistUrl?: string;
  thoughts?: string[];
  toolCalls?: any[];
  toolOutputs?: any[];
  isStreaming?: boolean;
  isToolWorking?: boolean;
}

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onExampleClick?: (example: string) => void;
}

export default function ChatInterface({ messages, isLoading, onSendMessage, onExampleClick }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log('[CHAT-UI] Input changed:', input, 'Length:', input.length, 'Trimmed:', input.trim().length, 'isLoading:', isLoading);
    console.log('[CHAT-UI] Button should be:', !input.trim() || isLoading ? 'DISABLED' : 'ENABLED');
  }, [input, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[CHAT-UI] Submit attempt - input:', input, 'trimmed:', input.trim(), 'isLoading:', isLoading);
    if (input.trim() && !isLoading) {
      console.log('[CHAT-UI] Sending message:', input);
      onSendMessage(input);
      setInput('');
    } else {
      console.log('[CHAT-UI] Submit blocked - conditions not met');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Messages Area - SOLO ESTA ZONA HACE SCROLL CON ESPACIO PARA INPUT */}
      <div className="flex-1 overflow-y-auto px-6 py-8 pb-48 space-y-6 relative z-10 pleia-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
            {/* Logo PLEIA con efectos - MÁS GRANDE */}
            <div className="relative mb-6">
              <div 
                className="absolute inset-0 blur-3xl opacity-60 animate-pulse"
                style={{
                  background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                  animationDuration: '3s'
                }}
              />
              {/* SVG Logo PLEIA - AUMENTADO */}
              <svg 
                width="220" 
                height="220" 
                viewBox="0 0 120 40" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className="relative"
                style={{
                  filter: 'drop-shadow(0 0 40px rgba(71, 200, 209, 0.9))'
                }}
              >
                <defs>
                  <linearGradient id="gradStarChat" x1="176" y1="176" x2="336" y2="336" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#36E2B4"/>
                    <stop offset="1" stopColor="#5B8CFF"/>
                  </linearGradient>
                </defs>
                <text x="60" y="28" textAnchor="middle" fontFamily="Space Grotesk, Inter, system-ui" fontSize="18" fontWeight="600" letterSpacing="0.02em" fill="#F5F7FA">
                  PLEIA
                </text>
                <g transform="translate(60, 10) scale(0.08)">
                  <path d="
                    M256 136
                    L276 210
                    L352 230
                    L276 250
                    L256 324
                    L236 250
                    L160 230
                    L236 210
                    Z" fill="url(#gradStarChat)"/>
                </g>
              </svg>
            </div>

            <h2 
              className="text-4xl font-bold mb-3 tracking-tight"
              style={{ 
                background: 'linear-gradient(135deg, #47C8D1 0%, #5B8CFF 50%, #7B68EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'var(--font-primary)',
                letterSpacing: '-0.02em'
              }}
            >
              Hola, soy PLEIA 2.0
            </h2>
            <p className="text-base mb-6 max-w-xl" style={{ color: 'var(--color-cloud)' }}>
              Tu agente conversacional avanzado para crear playlists perfectas mediante IA.
            </p>

            {/* Example Prompts */}
            <div 
              className="mt-4 p-6 rounded-3xl backdrop-blur-md max-w-2xl border shadow-2xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(71, 200, 209, 0.1), rgba(91, 140, 255, 0.1))',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-aurora)' }}>
                💡 Ejemplos de lo que puedes pedirme:
              </p>
              <div className="space-y-2 text-sm" style={{ color: 'var(--color-cloud)' }}>
                <div 
                  className="p-3 rounded-xl backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer" 
                  style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                  onClick={() => {
                    console.log('[CHAT-UI] Example 1 clicked');
                    const text = "Crea una playlist de rock alternativo melancólico ";
                    console.log('[CHAT-UI] Setting input to:', text, 'Length:', text.length);
                    setInput(text);
                    inputRef.current?.focus();
                  }}
                >
                  "Crea una playlist de rock alternativo melancólico"
                </div>
                <div 
                  className="p-3 rounded-xl backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer" 
                  style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                  onClick={() => {
                    console.log('[CHAT-UI] Example 2 clicked');
                    const text = "Música para concentrarme, estilo lofi pero más energética ";
                    console.log('[CHAT-UI] Setting input to:', text, 'Length:', text.length);
                    setInput(text);
                    inputRef.current?.focus();
                  }}
                >
                  "Música para concentrarme, estilo lofi pero más energética"
                </div>
                <div 
                  className="p-3 rounded-xl backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer" 
                  style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                  onClick={() => {
                    console.log('[CHAT-UI] Example 3 clicked');
                    const text = "Playlist de reggaeton romántico de artistas emergentes ";
                    console.log('[CHAT-UI] Setting input to:', text, 'Length:', text.length);
                    setInput(text);
                    inputRef.current?.focus();
                  }}
                >
                  "Playlist de reggaeton romántico de artistas emergentes"
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div
                className={`group max-w-[85%] md:max-w-[70%] rounded-3xl px-5 py-4 transition-all ${
                  (message as any).isToolWorking ? 'animate-pulse' : 'hover:scale-[1.02]'
                } ${
                  message.role === 'user'
                    ? 'rounded-br-md shadow-xl'
                    : 'rounded-bl-md shadow-2xl'
                }`}
                style={{
                  background: message.role === 'user'
                    ? 'linear-gradient(135deg, #47C8D1 0%, #5B8CFF 100%)'
                    : (message as any).isToolWorking
                    ? 'linear-gradient(135deg, rgba(71, 200, 209, 0.15), rgba(91, 140, 255, 0.15))'
                    : (message as any).isError
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04))',
                  color: message.role === 'user' ? 'var(--color-night)' : 'var(--color-cloud)',
                  border: message.role === 'user' 
                    ? 'none'
                    : (message as any).isToolWorking
                    ? '1px solid rgba(71, 200, 209, 0.4)'
                    : (message as any).isError 
                    ? '1px solid rgba(239, 68, 68, 0.3)' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: message.role === 'user'
                    ? '0 20px 40px rgba(71, 200, 209, 0.3), 0 0 20px rgba(91, 140, 255, 0.2)'
                    : (message as any).isToolWorking
                    ? '0 10px 30px rgba(71, 200, 209, 0.2), inset 0 1px 0 rgba(71, 200, 209, 0.1)'
                    : '0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                  backdropFilter: message.role !== 'user' ? 'blur(20px)' : 'none'
                }}
              >
                {/* Thoughts eliminados - solo mostramos tool calls técnicos */}

                {/* Tool Calls (Llamadas a herramientas) - Estilo Técnico AI Agent */}
                {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {message.toolCalls.map((toolCall: any, idx: number) => {
                      const isLoading = toolCall.status === 'loading';
                      const isCompleted = toolCall.status === 'completed';
                      
                      return (
                        <div 
                          key={toolCall.id || idx}
                          className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all"
                          style={{
                            background: isCompleted 
                              ? 'rgba(71, 200, 209, 0.2)' 
                              : 'rgba(91, 140, 255, 0.2)',
                            border: isCompleted
                              ? '1px solid rgba(71, 200, 209, 0.4)'
                              : '1px solid rgba(91, 140, 255, 0.4)',
                            backdropFilter: 'blur(20px)',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {/* Status Indicator */}
                          {isLoading ? (
                            <div className="flex gap-0.5" style={{ color: '#5B8CFF' }}>
                              <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                              <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
                              <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
                            </div>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0" style={{ color: '#47C8D1' }}>
                              <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          
                          {/* Tool Message */}
                          <span 
                            className="flex-1 leading-tight"
                            style={{
                              color: isCompleted ? '#47C8D1' : '#5B8CFF',
                            }}
                          >
                            {isCompleted && toolCall.result ? toolCall.result : toolCall.message || toolCall}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tool Outputs ya no se usan - se integran en toolCalls con estado completed */}

                {/* Main Content */}
                <div className={`whitespace-pre-wrap text-[15px] leading-relaxed font-medium ${(message as any).isToolWorking ? 'flex items-center gap-2' : ''}`}>
                  {(message as any).isToolWorking && (
                    <span className="inline-block animate-spin-slow">⚙️</span>
                  )}
                  {message.isStreaming && !message.content ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-block animate-pulse">⏳</span>
                      <span className="text-sm opacity-60">Procesando...</span>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>

                {message.playlistUrl && (
                  <a
                    href={message.playlistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 hover:shadow-lg"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'var(--color-aurora)',
                      border: '1px solid rgba(71, 200, 209, 0.3)'
                    }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Abrir en Spotify
                  </a>
                )}

                <div 
                  className="text-xs mt-2 flex items-center gap-2"
                  style={{ 
                    opacity: 0.5,
                    color: message.role === 'user' ? 'var(--color-night)' : 'var(--color-mist)'
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                  {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start animate-slide-in">
            <div
              className="max-w-[70%] rounded-3xl rounded-bl-md px-6 py-4 backdrop-blur-md border shadow-2xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04))',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full animate-bounce" 
                    style={{ 
                      background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                      animationDelay: '0ms',
                      boxShadow: '0 0 10px rgba(71, 200, 209, 0.5)'
                    }}
                  />
                  <span 
                    className="w-2.5 h-2.5 rounded-full animate-bounce" 
                    style={{ 
                      background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                      animationDelay: '150ms',
                      boxShadow: '0 0 10px rgba(71, 200, 209, 0.5)'
                    }}
                  />
                  <span 
                    className="w-2.5 h-2.5 rounded-full animate-bounce" 
                    style={{ 
                      background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                      animationDelay: '300ms',
                      boxShadow: '0 0 10px rgba(71, 200, 209, 0.5)'
                    }}
                  />
                </div>
                <span 
                  className="text-sm font-medium"
                  style={{ 
                    background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Pensando...
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Premium Design FIJO */}
      <div 
        className="absolute bottom-0 left-0 right-0 z-20 border-t backdrop-blur-xl p-6"
        style={{ 
          background: 'rgba(26, 35, 43, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.4)'
        }}
      >
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative group">
            {/* Glow effect on focus - MÁS SUTIL */}
            <div 
              className="absolute -inset-1 rounded-3xl opacity-0 group-focus-within:opacity-30 blur-xl transition-opacity duration-500"
              style={{ 
                background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
              }}
            />
            
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe la playlist perfecta que imaginas..."
                disabled={isLoading}
                rows={3}
                className="w-full rounded-3xl px-6 py-4 pr-16 resize-none focus:outline-none transition-all disabled:opacity-50 placeholder:text-gray-500"
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: 'var(--color-cloud)',
                  border: '0.5px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  overflow: 'hidden',
                  overflowY: 'auto',
                  maxHeight: '120px'
                }}
              />
              
              {/* Send Button - Metallic & Animated */}
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-3 bottom-3 w-10 h-10 rounded-2xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 active:scale-95 group/btn"
                style={{
                  background: 'linear-gradient(135deg, #47C8D1 0%, #5B8CFF 50%, #7B68EE 100%)',
                  boxShadow: '0 8px 20px rgba(71, 200, 209, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                }}
              >
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent)',
                  }}
                />
                <svg
                  className="w-5 h-5 relative z-10 transition-transform group-hover/btn:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: 'white', strokeWidth: 2.5 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4 mt-3">
            <p className="text-xs" style={{ color: 'var(--color-mist)', opacity: 0.6 }}>
              <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">Enter</kbd> enviar
              <span className="mx-2">•</span>
              <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">Shift</kbd> + <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">Enter</kbd> nueva línea
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

