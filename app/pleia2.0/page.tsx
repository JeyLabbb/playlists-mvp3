'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ChatInterface from '../components/pleia2/ChatInterface';
import PlaylistPreview from '../components/pleia2/PlaylistPreview';

// Sesión mock para desarrollo
const MOCK_SESSION = {
  user: {
    name: 'Jorge JR',
    email: 'jorgejr200419@gmail.com',
    image: null,
  },
  expires: '2099-12-31T23:59:59.999Z',
};

export default function Pleia2Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // En desarrollo, usar sesión mock
  const isDevelopment = process.env.NODE_ENV === 'development';
  const activeSession = isDevelopment ? MOCK_SESSION : session;
  const activeStatus = isDevelopment ? 'authenticated' : status;

  useEffect(() => {
    if (!isDevelopment && status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, isDevelopment]);

  if (!isDevelopment && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-night)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aurora mx-auto mb-4"></div>
          <p style={{ color: 'var(--color-mist)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    let currentAssistantMessageId = Date.now().toString() + '-assistant';
    let accumulatedContent = '';
    let accumulatedThoughts: string[] = [];
    let accumulatedToolCalls: any[] = [];
    let accumulatedToolOutputs: any[] = [];

    // Agregar mensaje del asistente inicial (vacío pero con estructura para thoughts)
    setMessages(prev => [...prev, {
      id: currentAssistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thoughts: [],
      toolCalls: [],
      toolOutputs: [],
      isStreaming: true
    }]);

    try {
      const response = await fetch('/api/pleia2/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationId,
          currentPlaylist,
          messages: messages.slice(-10) // Últimos 10 mensajes para contexto
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Error en la respuesta del servidor');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        console.log('[PLEIA2-FRONTEND] Received', lines.length, 'lines');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              console.log('[PLEIA2-FRONTEND] Data:', data.type, data.content);
              
              if (data.type === 'thought') {
              // Pensamiento del agente
              accumulatedThoughts.push(data.content);
              setMessages(prev => prev.map(m => 
                m.id === currentAssistantMessageId 
                  ? { ...m, thoughts: [...accumulatedThoughts] }
                  : m
              ));
            } else if (data.type === 'tool_call') {
              // Llamada a herramienta: data.content = { name, message, args, status }
              const toolObj = {
                name: data.content.name,
                message: data.content.message,
                status: 'loading',
                id: `tool-${Date.now()}-${data.content.name}`
              };
              accumulatedToolCalls.push(toolObj);
              setMessages(prev => prev.map(m => 
                m.id === currentAssistantMessageId 
                  ? { ...m, toolCalls: [...accumulatedToolCalls] }
                  : m
              ));
            } else if (data.type === 'tool_output') {
              // Resultado de herramienta: data.content = { name, result, summary, status }
              // Buscar el tool_call correspondiente y marcarlo como completed
              const toolName = data.content.name;
              accumulatedToolCalls = accumulatedToolCalls.map(tc => 
                tc.name === toolName ? { ...tc, status: 'completed', result: data.content.summary } : tc
              );
              setMessages(prev => prev.map(m => 
                m.id === currentAssistantMessageId 
                  ? { ...m, toolCalls: [...accumulatedToolCalls] }
                  : m
              ));
            } else if (data.type === 'final_response') {
              // Respuesta final del agente
              accumulatedContent += data.content;
              setMessages(prev => prev.map(m => 
                m.id === currentAssistantMessageId 
                  ? { ...m, content: accumulatedContent }
                  : m
              ));
            } else if (data.type === 'playlist_update') {
              // Actualizar playlist
              setCurrentPlaylist(data.content);
            } else if (data.type === 'conversation_id') {
              // ID de conversación
              if (!conversationId) {
                setConversationId(data.content);
              }
            } else if (data.type === 'done') {
              // Conversación completada
              if (data.content?.conversationId && !conversationId) {
                setConversationId(data.content.conversationId);
              }
            } else if (data.type === 'error') {
              throw new Error(data.content.message || data.content);
            }
            } catch (parseError) {
              console.error('[PLEIA2-FRONTEND] Parse error:', parseError, 'Line:', line);
            }
          }
        }
      }

      // Marcar el mensaje como completado (no streaming)
      setMessages(prev => prev.map(m => 
        m.id === currentAssistantMessageId 
          ? { ...m, isStreaming: false, content: accumulatedContent || 'Completado.' }
          : m
      ));

    } catch (error: any) {
      console.error('Error sending message:', error);
      // Actualizar el mensaje del asistente para mostrar el error
      setMessages(prev => prev.map(m => 
        m.id === currentAssistantMessageId 
          ? { 
              ...m, 
              content: `⚠️ Hubo un problema: ${error.message || 'Por favor, intenta de nuevo.'}`,
              isError: true,
              isStreaming: false
            }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!currentPlaylist) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/pleia2/create-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlist: currentPlaylist,
          conversationId
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear la playlist');
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-success',
        role: 'assistant',
        content: `¡Playlist "${currentPlaylist.name}" creada exitosamente! 🎉\n\nPuedes verla en tu cuenta de Spotify.`,
        timestamp: new Date(),
        playlistUrl: data.playlistUrl
      }]);

    } catch (error) {
      console.error('Error creating playlist:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: 'Error al crear la playlist. Por favor, intenta de nuevo.',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePlaylist = (updatedPlaylist: any) => {
    setCurrentPlaylist(updatedPlaylist);
  };

  return (
    <div 
      className="h-screen flex flex-col overflow-hidden"
      style={{ 
        background: 'radial-gradient(ellipse at top, rgba(71, 200, 209, 0.08), transparent 50%), radial-gradient(ellipse at bottom right, rgba(91, 140, 255, 0.08), transparent 50%), var(--color-night)',
        fontFamily: 'var(--font-body)'
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ 
            background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
            animationDuration: '4s'
          }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ 
            background: 'linear-gradient(225deg, #5B8CFF, #47C8D1)',
            animationDuration: '6s'
          }}
        />
      </div>

      {/* Header con glassmorphism - FIJO Y DELGADO */}
      <header 
        className="sticky top-0 z-50 backdrop-blur-xl border-b px-6 py-2 shadow-lg"
        style={{ 
          background: 'rgba(26, 35, 43, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/')}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--color-mist)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
            <div className="flex items-center gap-4">
              {/* Logo PLEIA inline SVG - GRANDE SIN MÁRGENES */}
              <svg width="160" height="50" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style={{ filter: 'drop-shadow(0 0 35px rgba(71, 200, 209, 0.7))' }}>
                <defs>
                  <linearGradient id="gradStar2" x1="176" y1="176" x2="336" y2="336" gradientUnits="userSpaceOnUse">
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
                    Z" fill="url(#gradStar2)"/>
                </g>
              </svg>
              <div>
                <h1 
                  className="text-5xl font-bold tracking-tight"
                  style={{ 
                    background: 'linear-gradient(135deg, #47C8D1 0%, #5B8CFF 50%, #7B68EE 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontFamily: 'var(--font-primary)',
                    textShadow: '0 0 40px rgba(71, 200, 209, 0.3)'
                  }}
                >
                  2.0
                </h1>
                <p className="text-sm font-medium tracking-wide" style={{ color: 'var(--color-aurora)' }}>
                  Advanced AI Agent
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--color-cloud)' }}>
                {activeSession?.user?.name || 'Usuario'}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-mist)' }}>
                {activeSession?.user?.email}
              </p>
            </div>
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-xl"
              style={{ 
                background: 'linear-gradient(135deg, #47C8D1, #5B8CFF)',
                color: 'var(--color-night)',
                boxShadow: '0 8px 32px rgba(71, 200, 209, 0.4)'
              }}
            >
              {activeSession?.user?.name?.[0] || '?'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Ajustado para input fijo */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat Interface - ocupa todo el espacio disponible */}
        <div className={`flex flex-col ${currentPlaylist ? 'w-full lg:w-1/2' : 'w-full'} relative`}>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* Playlist Preview */}
        {currentPlaylist && (
          <div className="hidden lg:block w-1/2 border-l border-white/10 overflow-y-auto">
            <PlaylistPreview
              playlist={currentPlaylist}
              onUpdate={handleUpdatePlaylist}
              onCreatePlaylist={handleCreatePlaylist}
              isCreating={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}

