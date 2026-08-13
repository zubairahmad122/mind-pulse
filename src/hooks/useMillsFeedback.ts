import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';

type Cue='select'|'place'|'mill'|'capture'|'invalid'|'win';
export function useMillsFeedback(soundEnabled:boolean,hapticsEnabled:boolean){
  const players=useRef<Partial<Record<Cue,AudioPlayer>>>({});
  useEffect(()=>{
    players.current={
      select:createAudioPlayer(require('@/assets/sounds/effects/schulte-correct.mp3')),
      place:createAudioPlayer(require('@/assets/sounds/effects/schulte-correct.mp3')),
      mill:createAudioPlayer(require('@/assets/sounds/effects/schulte-level-up.mp3')),
      capture:createAudioPlayer(require('@/assets/sounds/effects/hit.mp3')),
      invalid:createAudioPlayer(require('@/assets/sounds/effects/schulte-wrong.mp3')),
      win:createAudioPlayer(require('@/assets/sounds/effects/schulte-complete.mp3')),
    };
    return()=>{Object.values(players.current).forEach(player=>{try{player.release();}catch{}});players.current={};};
  },[]);
  const sound=useCallback((cue:Cue)=>{if(!soundEnabled)return;const player=players.current[cue];if(!player)return;try{player.volume=cue==='select'?.18:cue==='place'?.35:cue==='invalid'?.22:cue==='capture'?.45:.58;void player.seekTo(0).then(()=>player.play()).catch(()=>{});}catch{}},[soundEnabled]);
  const impact=useCallback((style:Haptics.ImpactFeedbackStyle)=>{if(hapticsEnabled)void Haptics.impactAsync(style).catch(()=>{});},[hapticsEnabled]);
  return {
    select:()=>{impact(Haptics.ImpactFeedbackStyle.Light);sound('select');},
    place:()=>{impact(Haptics.ImpactFeedbackStyle.Medium);sound('place');},
    move:()=>{impact(Haptics.ImpactFeedbackStyle.Light);sound('place');},
    mill:()=>{if(hapticsEnabled)void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});sound('mill');},
    capture:()=>{impact(Haptics.ImpactFeedbackStyle.Heavy);sound('capture');},
    win:()=>{if(hapticsEnabled)void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});sound('win');},
    invalid:()=>{if(hapticsEnabled)void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(()=>{});sound('invalid');},
  };
}
