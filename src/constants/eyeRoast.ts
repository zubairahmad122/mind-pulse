export type RoastLevel = 'gentle' | 'savage';

interface StepCopy {
  what: string;
  tip: string;
}

export const STEP_COPY: Record<string, Record<RoastLevel, StepCopy>> = {
  blink: {
    gentle: {
      what: 'Blink along with the animation — open and close slowly.',
      tip: 'This spreads moisture across your eyes. Keep your jaw relaxed.',
    },
    savage: {
      what: 'Your desert-dry eyes NEED this. Blink. Actually blink. Like a human.',
      tip: 'You blink 60% less when staring at screens. Right now your eyes are basically beef jerky. Fix this.',
    },
  },
  palming: {
    gentle: {
      what: 'Rub your hands together to warm them, then cup them over your closed eyes.',
      tip: 'The warmth and darkness let your eye muscles fully release.',
    },
    savage: {
      what: 'Cover those screen-fried disasters you call eyes. Hands. Over. Eyes. Now.',
      tip: 'Your retinas have been absorbing blue light all day. Give them darkness. They earned it more than you did.',
    },
  },
  '2020': {
    gentle: {
      what: 'Look at something 20 feet away. Let your eyes fully relax.',
      tip: 'You should feel the focusing muscle release as you look into the distance.',
    },
    savage: {
      what: 'Look away from your phone. YES. AWAY. Something 20 feet away. You remember the real world?',
      tip: 'Your eye\'s focusing muscle has been stuck in a cramp for hours. This is the only cure. Do it.',
    },
  },
  orbit: {
    gentle: {
      what: 'Follow the moving dot with your eyes only — keep your head still.',
      tip: 'Move slowly. This stretches the muscles that hold your eyes in position.',
    },
    savage: {
      what: 'Follow the dot. With your EYES. Not your whole head. Basic motor function.',
      tip: 'Those eye muscles have been locked in one position staring at your phone for hours. They\'re literally screaming.',
    },
  },
  nearfar: {
    gentle: {
      what: 'Shift your focus between the large text (close) and the small dot (far away).',
      tip: 'This is a stretch for your eye\'s focusing muscle. Slow is better.',
    },
    savage: {
      what: 'Near. Far. Near. Far. Your focusing muscle is atrophied from scrolling. This is rehab.',
      tip: 'Your ciliary muscle forgot how to function from screen addiction. This exercise is physical therapy for your face.',
    },
  },
  cooldown: {
    gentle: {
      what: 'Close your eyes completely. Let your face go slack. Just breathe.',
      tip: 'This final rest locks in all the recovery from the previous steps.',
    },
    savage: {
      what: 'CLOSE THEM. Don\'t peek at the screen. You\'ve been staring at screens for literal hours today.',
      tip: 'You\'re done. Your eyes are physically healing right now. Stop ruining it by opening them.',
    },
  },
};
