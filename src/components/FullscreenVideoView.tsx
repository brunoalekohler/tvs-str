import React, { useRef, useEffect } from 'react';

interface FullscreenVideoViewProps {
  videoUrl?: string;
  audioUnlocked?: boolean;
  onAudioUnlock?: () => void;
}

export const FullscreenVideoView: React.FC<FullscreenVideoViewProps> = ({
  videoUrl = '/video.mp4',
  audioUnlocked = false,
  onAudioUnlock,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play automatically and handle audio unlock
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !audioUnlocked;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay unmuted blocked, falling back to muted:', err);
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }, [videoUrl, audioUnlocked]);

  // Click on screen to unlock audio without showing any buttons
  const handleClick = () => {
    if (!audioUnlocked && onAudioUnlock) {
      onAudioUnlock();
    }
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      onClick={handleClick}
      className="fixed inset-0 w-screen h-screen z-10 bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
      title="Vídeo Operacional - Tela Cheia"
    >
      <video
        ref={videoRef}
        src={videoUrl || '/video.mp4'}
        loop
        playsInline
        autoPlay
        muted={!audioUnlocked}
        className="w-full h-full min-w-full min-h-full object-cover"
      />
    </div>
  );
};
