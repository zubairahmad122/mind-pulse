import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { rs } from '@/utils/responsive';

export function StatusBar() {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingHorizontal: rs(26),
      paddingTop: rs(16), paddingBottom: rs(4), flex: 0,
    }}>
      <Text style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: rs(14), color: '#f5f7fb' }}>
        9:41
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Svg width={18} height={11} viewBox="0 0 18 11">
          <Rect x={0} y={7} width={3} height={4} rx={1} fill="#f5f7fb" />
          <Rect x={5} y={4} width={3} height={7} rx={1} fill="#f5f7fb" />
          <Rect x={10} y={1.5} width={3} height={9.5} rx={1} fill="#f5f7fb" />
          <Rect x={15} y={0} width={3} height={11} rx={1} fill="#f5f7fb" opacity={0.35} />
        </Svg>
        <Svg width={16} height={11} viewBox="0 0 16 11" fill="none">
          <Path d="M8 10.2 1 4.1a10 10 0 0 1 14 0L8 10.2Z" stroke="#f5f7fb" strokeWidth={1.3} strokeLinejoin="round" />
        </Svg>
        <Svg width={24} height={12} viewBox="0 0 24 12">
          <Rect x={1} y={1} width={20} height={10} rx={3} stroke="#f5f7fb" strokeOpacity={0.5} fill="none" />
          <Rect x={3} y={3} width={15} height={6} rx={1.5} fill="#f5f7fb" />
          <Rect x={22} y={4} width={1.6} height={4} rx={0.8} fill="#f5f7fb" opacity={0.5} />
        </Svg>
      </View>
    </View>
  );
}
