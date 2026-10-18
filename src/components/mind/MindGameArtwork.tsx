import { memo, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient as ViewGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, G, LinearGradient, Line, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { PatternGlyphView } from '@/components/games/patternShift/PatternGlyphView';
import { generateGlyph } from '@/engine/core/games/patternShift';

const CYAN = '#4DE1C1';
const BLUE = '#4AA7FF';
const VIOLET = '#A48BFF';
const TILE = '#141936';
const PATTERN_CARD_GLYPH = generateGlyph(1847, 6, 'orbital');
type ArtworkProps = { size?: number };
type ArtworkVariant = 'card' | 'featured';

export const GameArtworkFrame = memo(function GameArtworkFrame({accent,variant='card',children}:{accent:string;variant?:ArtworkVariant;children:ReactNode}) {
  const featured=variant==='featured';
  return <View style={[styles.frame,featured&&styles.frameFeatured]}>
    <ViewGradient colors={['rgba(31,37,72,.96)','rgba(9,13,31,.98)']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}/>
    <Svg width="100%" height="100%" viewBox="0 0 100 100" style={StyleSheet.absoluteFill} accessible={false}>
      <Defs><RadialGradient id="frameGlow" cx="76%" cy="25%" rx="70%" ry="70%"><Stop offset="0" stopColor={accent} stopOpacity=".28"/><Stop offset=".55" stopColor={accent} stopOpacity=".06"/><Stop offset="1" stopColor={accent} stopOpacity="0"/></RadialGradient><LinearGradient id="frameShine" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF" stopOpacity=".16"/><Stop offset=".42" stopColor="#FFFFFF" stopOpacity="0"/></LinearGradient></Defs>
      <Rect width="100" height="100" fill="url(#frameGlow)"/><Path d="M5 35 C24 7 59 3 94 18 L94 4 L5 4 Z" fill="url(#frameShine)"/><Circle cx="82" cy="18" r="2" fill={accent} opacity=".7"/><Circle cx="17" cy="82" r="1.2" fill={accent} opacity=".38"/>
    </Svg>
    <View style={styles.art}>{children}</View>
    <View style={[styles.frameBorder,{borderColor:`${accent}52`}]}/>
    <View style={styles.frameHighlight}/>
  </View>;
});

export const SchulteCardArtwork = memo(function SchulteCardArtwork({ size = 76 }: ArtworkProps) {
  const values = [4, 2, 7, 1, 9, 5, 6, 3, 8];
  return <Svg width={size} height={size} viewBox="0 0 80 80" accessible={false}>
    <Defs><RadialGradient id="schulteGlow"><Stop offset="0" stopColor={CYAN} stopOpacity=".32"/><Stop offset="1" stopColor={CYAN} stopOpacity="0"/></RadialGradient></Defs>
    <Circle cx="54" cy="54" r="24" fill="url(#schulteGlow)"/><Path d="M18 57 C23 43 31 31 48 18" fill="none" stroke={BLUE} strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />
    {values.map((value, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 9 + column * 22;
      const y = 9 + row * 22;
      const active = value === 3;
      return <G key={value}>
        {active && <Circle cx={x + 9} cy={y + 9} r="15" fill={CYAN} opacity=".08" />}
        <Rect x={x} y={y+1.5} width="18" height="18" rx="5" fill="#0F0C29" opacity=".7"/><Rect x={x} y={y} width="18" height="18" rx="5" fill={active ? '#17445A' : TILE} stroke={active ? CYAN : '#8490C1'} strokeOpacity={active ? 1 : .35} strokeWidth={active ? 1.6 : .9} />
        <SvgText x={x + 9} y={y + 12} fill={active ? '#ECFEFF' : '#C3CAE5'} fillOpacity={active ? 1 : .7} fontSize="7.5" fontWeight="700" textAnchor="middle">{value}</SvgText>
      </G>;
    })}
  </Svg>;
});

export const MillsCardArtwork = memo(function MillsCardArtwork({ size = 76 }: ArtworkProps) {
  return <Svg width={size} height={size} viewBox="0 0 80 80" accessible={false}>
    <Defs><RadialGradient id="millsGlow"><Stop offset="0" stopColor={CYAN} stopOpacity=".24"/><Stop offset="1" stopColor={CYAN} stopOpacity="0"/></RadialGradient></Defs><Circle cx="40" cy="35" r="35" fill="url(#millsGlow)"/>
    <G fill="none" stroke={CYAN} strokeOpacity=".7" strokeWidth="1.3">
      <Rect x="9" y="9" width="62" height="62" rx="2" /><Rect x="22" y="22" width="36" height="36" rx="2" />
      <Line x1="40" y1="9" x2="40" y2="22" /><Line x1="40" y1="58" x2="40" y2="71" /><Line x1="9" y1="40" x2="22" y2="40" /><Line x1="58" y1="40" x2="71" y2="40" />
    </G>
    <Line x1="22" y1="22" x2="58" y2="22" stroke={VIOLET} strokeOpacity=".5" strokeWidth="2.2" strokeLinecap="round" />
    <Circle cx="22" cy="23.5" r="5.5" fill="#0F0C29" opacity=".75"/><Circle cx="40" cy="23.5" r="5.5" fill="#0F0C29" opacity=".75"/><Circle cx="58" cy="23.5" r="5.5" fill="#0F0C29" opacity=".75"/><Circle cx="22" cy="22" r="5" fill={CYAN} stroke="#DFFFFF" strokeWidth="1" /><Circle cx="40" cy="22" r="5" fill={CYAN} stroke="#DFFFFF" strokeWidth="1" /><Circle cx="58" cy="22" r="5" fill={VIOLET} stroke="#E8DEFF" strokeWidth="1" />
    <Circle cx="58" cy="58" r="4" fill="#11162E" stroke={VIOLET} strokeWidth="1.2" />
  </Svg>;
});

export const PatternShiftCardArtwork = memo(function PatternShiftCardArtwork({ size = 76 }: ArtworkProps) {
  return <PatternGlyphView glyph={PATTERN_CARD_GLYPH} size={size} emphasis="target" />;
});

export const TimeFlowCardArtwork = memo(function TimeFlowCardArtwork({ size = 76 }: ArtworkProps) {
  const tiles = [[7, 9], [30, 7], [53, 11], [9, 34], [32, 32], [55, 36], [28, 57]];
  return <Svg width={size} height={size} viewBox="0 0 80 80" accessible={false}><Defs><LinearGradient id="flowTrail" x1="0" y1="1" x2="1" y2="0"><Stop offset="0" stopColor={VIOLET}/><Stop offset="1" stopColor={CYAN}/></LinearGradient><RadialGradient id="flowGlow"><Stop offset="0" stopColor={CYAN} stopOpacity=".28"/><Stop offset="1" stopColor={CYAN} stopOpacity="0"/></RadialGradient></Defs><Circle cx="59" cy="20" r="25" fill="url(#flowGlow)"/><Path d="M16 50 C25 25 45 50 62 20" fill="none" stroke="url(#flowTrail)" strokeWidth="2" strokeOpacity=".55" strokeLinecap="round"/>
    {tiles.map(([x, y], index) => {
      const past = index === 3;
      const recent = index === 4;
      const current = index === 2;
      const accent = past ? VIOLET : recent ? BLUE : current ? CYAN : '#8290C3';
      const active = past || recent || current;
      return <G key={index} opacity={past ? .56 : 1}>
        {active && <Circle cx={x + 9} cy={y + 8} r={current ? 14 : 11} fill={accent} opacity={current ? .11 : .065} />}
        <Rect x={x} y={y} width={current ? 20 : 18} height={current ? 18 : 16} rx="5" fill={active ? '#172A45' : TILE} stroke={accent} strokeOpacity={active ? (current ? 1 : .7) : .2} strokeWidth={current ? 1.6 : 1} />
        <Rect x={x + 3} y={y + 3} width={current ? 14 : 12} height={current ? 12 : 10} rx="3" fill="none" stroke={accent} strokeOpacity={active ? .25 : .08} strokeWidth=".65" />
        <Path d={`M${x + 9} ${y + 5} L${x + 12} ${y + 8} L${x + 9} ${y + 11} L${x + 6} ${y + 8} Z`} fill={current ? '#EEFEFF' : accent} fillOpacity={active ? 1 : .25} />
      </G>;
    })}
  </Svg>;
});
export const MathGapCardArtwork = memo(function MathGapCardArtwork({size=76}:ArtworkProps){return <Image source={require('@/assets/images/icons/math-gap.webp')} resizeMode="contain" style={{width:size,height:size}} accessible={false}/>});

export const MindGameArtwork = memo(function MindGameArtwork({
  gameId,
  variant = 'card',
}: {
  gameId: string;
  variant?: ArtworkVariant;
}) {
  const size = variant === 'featured' ? 88 : 76;
  const accent=gameId==='pattern-shift'?VIOLET:gameId==='mills'?'#37D5D0':gameId==='schulte'?BLUE:CYAN;
  const artwork=gameId==='math-gap'?<MathGapCardArtwork size={size}/>:gameId==='time-flow'?<TimeFlowCardArtwork size={size}/>:gameId==='pattern-shift'?<PatternShiftCardArtwork size={size}/>:gameId==='mills'?<MillsCardArtwork size={size}/>:<SchulteCardArtwork size={size}/>;
  return <GameArtworkFrame accent={accent} variant={variant}>{artwork}</GameArtworkFrame>;
});

const styles=StyleSheet.create({frame:{width:76,height:76,borderRadius:16,overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:'#0A0E21'},frameFeatured:{width:92,height:92,borderRadius:21},art:{alignItems:'center',justifyContent:'center'},frameBorder:{position:'absolute',top:0,right:0,bottom:0,left:0,borderRadius:16,borderWidth:1},frameHighlight:{position:'absolute',left:9,right:9,top:5,height:1,borderRadius:1,backgroundColor:'rgba(255,255,255,.2)'}});
