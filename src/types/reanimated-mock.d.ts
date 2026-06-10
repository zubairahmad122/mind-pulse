declare module 'react-native-reanimated/mock' {
  import Reanimated from 'react-native-reanimated';
  const mock: typeof Reanimated;
  export default mock;
  export * from 'react-native-reanimated';
}
