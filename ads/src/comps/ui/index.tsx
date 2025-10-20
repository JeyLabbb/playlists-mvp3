/**
 * UI Components - Componentes mock reales con estilo Apple-like
 * Simulan la UI real de la aplicación sin usar capturas de pantalla
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { tokens } from '../../design';

// Tipos para las props de los componentes
interface UIComponentProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * PromptBox - Simula el input de búsqueda de la app
 */
export const PromptBox: React.FC<UIComponentProps & {
  placeholder?: string;
  value?: string;
  isTyping?: boolean;
  width?: number;
  height?: number;
}> = ({
  placeholder = "Buscar música...",
  value = "",
  isTyping = false,
  width = 320,
  height = 48,
  style = {},
}) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: tokens.colors.card.background,
        border: `1px solid ${tokens.colors.border.subtle}`,
        borderRadius: tokens.radius.lg,
        padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
        display: 'flex',
        alignItems: 'center',
        boxShadow: tokens.shadows.sm,
        ...style,
      }}
    >
      {/* Icono de búsqueda */}
      <div
        style={{
          width: 20,
          height: 20,
          marginRight: tokens.spacing[3],
          opacity: 0.6,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      
      {/* Texto del placeholder o valor */}
      <div
        style={{
          flex: 1,
          fontSize: tokens.typography.fontSize.base,
          fontFamily: tokens.typography.fontFamily.primary,
          color: value ? tokens.colors.text.primary : tokens.colors.text.tertiary,
          fontWeight: tokens.typography.fontWeight.normal,
        }}
      >
        {value || placeholder}
      </div>
      
      {/* Cursor parpadeante cuando está escribiendo */}
      {isTyping && (
        <div
          style={{
            width: 2,
            height: 20,
            backgroundColor: tokens.colors.pleia.green,
            marginLeft: 2,
            animation: 'blink 1s infinite',
          }}
        />
      )}
    </div>
  );
};

/**
 * SongCard - Simula una tarjeta de canción
 */
export const SongCard: React.FC<UIComponentProps & {
  title: string;
  artist: string;
  duration?: string;
  isPlaying?: boolean;
  width?: number;
  height?: number;
}> = ({
  title,
  artist,
  duration = "3:24",
  isPlaying = false,
  width = 280,
  height = 64,
  style = {},
}) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: tokens.colors.card.background,
        border: `1px solid ${tokens.colors.border.subtle}`,
        borderRadius: tokens.radius.md,
        padding: tokens.spacing[4],
        display: 'flex',
        alignItems: 'center',
        boxShadow: tokens.shadows.sm,
        ...style,
      }}
    >
      {/* Avatar/Thumbnail del artista */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: tokens.radius.sm,
          backgroundColor: tokens.colors.pleia.green,
          marginRight: tokens.spacing[3],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          color: tokens.colors.bg.primary,
        }}
      >
        {artist.charAt(0).toUpperCase()}
      </div>
      
      {/* Información de la canción */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: tokens.typography.fontSize.base,
            fontFamily: tokens.typography.fontFamily.primary,
            color: tokens.colors.text.primary,
            fontWeight: tokens.typography.fontWeight.medium,
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: tokens.typography.fontSize.sm,
            fontFamily: tokens.typography.fontFamily.secondary,
            color: tokens.colors.text.secondary,
            fontWeight: tokens.typography.fontWeight.normal,
          }}
        >
          {artist}
        </div>
      </div>
      
      {/* Duración */}
      <div
        style={{
          fontSize: tokens.typography.fontSize.sm,
          fontFamily: tokens.typography.fontFamily.mono,
          color: tokens.colors.text.tertiary,
          marginLeft: tokens.spacing[3],
        }}
      >
        {duration}
      </div>
      
      {/* Indicador de reproducción */}
      {isPlaying && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: tokens.colors.pleia.green,
            marginLeft: tokens.spacing[3],
            animation: 'pulse 2s infinite',
          }}
        />
      )}
    </div>
  );
};

/**
 * PlaylistsGrid - Simula una grilla de playlists
 */
export const PlaylistsGrid: React.FC<UIComponentProps & {
  playlists: Array<{
    name: string;
    songCount: number;
    color: string;
  }>;
  columns?: number;
  width?: number;
}> = ({
  playlists = [
    { name: "Fiesta", songCount: 24, color: tokens.colors.pleia.green },
    { name: "Relax", songCount: 18, color: tokens.colors.pleia.blue },
    { name: "Workout", songCount: 32, color: "#FF6B6B" },
    { name: "Chill", songCount: 15, color: "#FFB347" },
  ],
  columns = 2,
  width = 320,
  style = {},
}) => {
  const gap = Number(tokens.spacing[4] as unknown as number);
  const itemWidth = (width - gap * (columns - 1)) / columns;
  
  return (
    <div
      style={{
        width,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: tokens.spacing[4],
        ...style,
      }}
    >
      {playlists.map((playlist, index) => (
        <div
          key={index}
          style={{
            width: itemWidth,
            height: itemWidth,
            backgroundColor: tokens.colors.card.background,
            border: `1px solid ${tokens.colors.border.subtle}`,
            borderRadius: tokens.radius.lg,
            padding: tokens.spacing[4],
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: tokens.shadows.sm,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Color de acento */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: playlist.color,
            }}
          />
          
          {/* Contenido */}
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.lg,
                fontFamily: tokens.typography.fontFamily.primary,
                color: tokens.colors.text.primary,
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[2],
              }}
            >
              {playlist.name}
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm,
                fontFamily: tokens.typography.fontFamily.secondary,
                color: tokens.colors.text.secondary,
              }}
            >
              {playlist.songCount} canciones
            </div>
          </div>
          
          {/* Icono de playlist */}
          <div
            style={{
              width: 24,
              height: 24,
              opacity: 0.3,
              alignSelf: 'flex-end',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Button - Botón con estilo Apple
 */
export const Button: React.FC<UIComponentProps & {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  width?: number;
  height?: number;
}> = ({
  children,
  variant = 'primary',
  size = 'md',
  width,
  height,
  style = {},
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: tokens.colors.pleia.green,
          color: tokens.colors.bg.primary,
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          color: tokens.colors.text.primary,
          border: `1px solid ${tokens.colors.border.medium}`,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: tokens.colors.text.secondary,
          border: 'none',
        };
      default:
        return {
          backgroundColor: tokens.colors.pleia.green,
          color: tokens.colors.bg.primary,
          border: 'none',
        };
    }
  };
  
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
          fontSize: tokens.typography.fontSize.sm,
          height: height || 32,
        };
      case 'md':
        return {
          padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
          fontSize: tokens.typography.fontSize.base,
          height: height || 40,
        };
      case 'lg':
        return {
          padding: `${tokens.spacing[4]} ${tokens.spacing[8]}`,
          fontSize: tokens.typography.fontSize.lg,
          height: height || 48,
        };
      default:
        return {
          padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
          fontSize: tokens.typography.fontSize.base,
          height: height || 40,
        };
    }
  };
  
  return (
    <div
      style={{
        width,
        ...getSizeStyles(),
        ...getVariantStyles(),
        borderRadius: tokens.radius.md,
        fontFamily: tokens.typography.fontFamily.primary,
        fontWeight: tokens.typography.fontWeight.medium,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: variant === 'primary' ? tokens.shadows.pleia.sm : tokens.shadows.sm,
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * LoadingSpinner - Spinner de carga
 */
export const LoadingSpinner: React.FC<UIComponentProps & {
  size?: number;
  color?: string;
}> = ({
  size = 24,
  color = tokens.colors.pleia.green,
  style = {},
}) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}20`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        ...style,
      }}
    />
  );
};

// Exportar todos los componentes
export const uiComponents = {
  PromptBox,
  SongCard,
  PlaylistsGrid,
  Button,
  LoadingSpinner,
} as const;

export default uiComponents;
