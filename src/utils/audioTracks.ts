import { AUDIO_TRACKS } from '@/constants/audio';
import { AudioTrack } from '@/types/audio.types';

export function getAudioTrackById(id: string): AudioTrack | undefined {
  return AUDIO_TRACKS.find(t => t.id === id);
}
