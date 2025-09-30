"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FeedbackModal from "../components/FeedbackModal";

function FeedbackContent() {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get('pid');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Show modal automatically when page loads
    setShowModal(true);
  }, []);

  const handleClose = () => {
    // Redirect to home after closing
    window.location.href = '/';
  };

  const handleSubmitted = () => {
    // Show success message and redirect
    alert('¡Gracias por tu feedback! Te ayudará a mejorar las playlists.');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-black-base flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white mb-4">
          Feedback de Playlist
        </h1>
        <p className="text-gray-text-secondary mb-8">
          Tu opinión nos ayuda a mejorar
        </p>
        
        <FeedbackModal
          open={showModal}
          onClose={handleClose}
          onSubmitted={handleSubmitted}
          defaultValues={{
            playlistId: playlistId || undefined
          }}
        />
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black-base flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">
            Cargando...
          </h1>
        </div>
      </div>
    }>
      <FeedbackContent />
    </Suspense>
  );
}
