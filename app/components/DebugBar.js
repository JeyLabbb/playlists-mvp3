'use client';

import { useProfile } from '../../lib/useProfile';

export default function DebugBar() {
  const { isFounder, plan, founderSince, email, loading, error, data } = useProfile();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 p-2 text-xs font-mono"
      style={{ 
        backgroundColor: '#FF8C00',
        color: '#0B0F14',
        borderBottom: '2px solid #FF4500'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span><strong>DEBUG:</strong></span>
          <span>isFounder: {isFounder ? '✅' : '❌'}</span>
          <span>plan: {plan || 'null'}</span>
          <span>email: {email || 'null'}</span>
          <span>loading: {loading ? '⏳' : '✅'}</span>
          {error && <span>error: {error.message}</span>}
        </div>
        <div className="text-xs opacity-75">
          API: /api/me | FounderSince: {founderSince || 'null'}
        </div>
      </div>
    </div>
  );
}
