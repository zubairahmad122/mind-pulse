import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375;

/** Scale a pixel value proportionally to the screen width */
export const rs = (size: number): number => Math.round(size * (SCREEN_WIDTH / BASE_WIDTH));
