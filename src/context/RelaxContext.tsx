import React, { createContext, ReactNode, useState, useCallback } from 'react';
import type { EmotionalState } from '@/constants/emotionalStates';
import type { BreathingMusicId } from '@/constants/breathingMusic';

export interface SessionCompletionRecord {
  sessionId: string;
  completedAt: number;
  emotionBefore: EmotionalState | null;
  emotionAfter: EmotionalState | null;
  soundUsed: BreathingMusicId;
  rating: number | null;
}

interface RelaxContextType {
  // Current session state
  currentSessionId: string | null;
  sessionPaused: boolean;
  sessionElapsed: number;

  // User preferences
  voiceVolume: number;
  ambientVolume: number;
  selectedSound: BreathingMusicId;
  lastEmotion: EmotionalState | null;

  // History
  completedSessions: SessionCompletionRecord[];

  // Actions
  startSession: (sessionId: string, emotion: EmotionalState | null) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
  updateElapsed: (seconds: number) => void;
  completeSession: (emotionAfter: EmotionalState | null, rating?: number) => void;

  setVoiceVolume: (volume: number) => void;
  setAmbientVolume: (volume: number) => void;
  setSelectedSound: (sound: BreathingMusicId) => void;
  setLastEmotion: (emotion: EmotionalState) => void;
}

export const RelaxContext = createContext<RelaxContextType | undefined>(undefined);

interface RelaxProviderProps {
  children: ReactNode;
}

export const RelaxProvider: React.FC<RelaxProviderProps> = ({ children }) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [voiceVolume, setVoiceVolume] = useState(0.8);
  const [ambientVolume, setAmbientVolume] = useState(0.4);
  const [selectedSound, setSelectedSound] = useState<BreathingMusicId>('ocean');
  const [lastEmotion, setLastEmotion] = useState<EmotionalState | null>(null);
  const [completedSessions, setCompletedSessions] = useState<SessionCompletionRecord[]>([]);

  const handleStartSession = useCallback((sessionId: string, emotion: EmotionalState | null) => {
    setCurrentSessionId(sessionId);
    setSessionElapsed(0);
    setSessionPaused(false);
    setLastEmotion(emotion);
  }, []);

  const handlePauseSession = useCallback(() => {
    setSessionPaused(true);
  }, []);

  const handleResumeSession = useCallback(() => {
    setSessionPaused(false);
  }, []);

  const handleStopSession = useCallback(() => {
    setCurrentSessionId(null);
    setSessionElapsed(0);
    setSessionPaused(false);
  }, []);

  const handleUpdateElapsed = useCallback((seconds: number) => {
    setSessionElapsed(seconds);
  }, []);

  const handleCompleteSession = useCallback((emotionAfter: EmotionalState | null, rating = 0) => {
    if (!currentSessionId) return;

    const newRecord: SessionCompletionRecord = {
      sessionId: currentSessionId,
      completedAt: Date.now(),
      emotionBefore: lastEmotion,
      emotionAfter,
      soundUsed: selectedSound,
      rating: rating > 0 ? rating : null,
    };

    setCompletedSessions(prev => [...prev, newRecord]);
    setCurrentSessionId(null);
    setSessionElapsed(0);
    setSessionPaused(false);
  }, [currentSessionId, lastEmotion, selectedSound]);

  const handleSetVoiceVolume = useCallback((volume: number) => {
    setVoiceVolume(Math.max(0, Math.min(1, volume)));
  }, []);

  const handleSetAmbientVolume = useCallback((volume: number) => {
    setAmbientVolume(Math.max(0, Math.min(1, volume)));
  }, []);

  const value: RelaxContextType = {
    currentSessionId,
    sessionPaused,
    sessionElapsed,
    voiceVolume,
    ambientVolume,
    selectedSound,
    lastEmotion,
    completedSessions,

    startSession: handleStartSession,
    pauseSession: handlePauseSession,
    resumeSession: handleResumeSession,
    stopSession: handleStopSession,
    updateElapsed: handleUpdateElapsed,
    completeSession: handleCompleteSession,

    setVoiceVolume: handleSetVoiceVolume,
    setAmbientVolume: handleSetAmbientVolume,
    setSelectedSound,
    setLastEmotion,
  };

  return <RelaxContext.Provider value={value}>{children}</RelaxContext.Provider>;
};

export const useRelaxContext = (): RelaxContextType => {
  const context = React.useContext(RelaxContext);
  if (!context) {
    throw new Error('useRelaxContext must be used within a RelaxProvider');
  }
  return context;
};
