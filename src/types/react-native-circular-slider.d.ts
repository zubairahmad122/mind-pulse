declare module 'react-native-circular-slider' {
  import { PureComponent, ReactElement } from 'react';

  interface CircularSliderProps {
    startAngle: number;
    angleLength: number;
    onUpdate: (data: { startAngle: number; angleLength: number }) => void;
    segments?: number;
    strokeWidth?: number;
    radius?: number;
    gradientColorFrom?: string;
    gradientColorTo?: string;
    showClockFace?: boolean;
    clockFaceColor?: string;
    bgCircleColor?: string;
    stopIcon?: ReactElement;
    startIcon?: ReactElement;
  }

  export default class CircularSlider extends PureComponent<CircularSliderProps> {}
}
