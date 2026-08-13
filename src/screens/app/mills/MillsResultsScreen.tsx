import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock3, Scale, Trophy } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeIn, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { FONTS } from '@/constants/designSystem';
import { MILLS_THEME as T } from '@/constants/millsTheme';
import { ROUTES } from '@/constants';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** One restrained spark of the win burst — radial fade-and-drift, not confetti. */
function Particle({ angle, color, delay }: { angle: number; color: string; delay: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);
  const style = useAnimatedStyle(() => {
    const distance = 46 * progress.value;
    return {
      opacity: 1 - progress.value,
      transform: [
        { translateX: Math.cos(angle) * distance },
        { translateY: Math.sin(angle) * distance },
        { scale: 1 - progress.value * 0.4 },
      ],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.particle, { backgroundColor: color }, style]} />;
}

export default function MillsResultsScreen() {
  const p=useLocalSearchParams<Record<string,string>>();
  const router=useRouter();
  const insets=useSafeAreaInsets();
  const reducedMotion=useReducedMotion();
  const isDraw=p.result==='draw';
  const winnerId=p.winner==='P2'?'P2':'P1';
  const winner=winnerId==='P1'?p.p1:p.p2;
  const winnerColor=winnerId==='P1'?T.p1:T.p2;
  const loserName=winnerId==='P1'?p.p2:p.p1;
  const loserRemaining=winnerId==='P1'?p.p2Remaining:p.p1Remaining;
  const durationMs=Number(p.duration||0);
  const duration=`${Math.floor(durationMs/60000)}:${String(Math.floor(durationMs/1000)%60).padStart(2,'0')}`;
  const next=p.startingPlayer==='P1'?'P2':'P1';
  const reason=isDraw
    ? p.reason==='threefold-repetition'?'Threefold repetition':'No-capture move limit reached'
    : p.reason==='blocked'?`${loserName} has no legal moves`:`${loserName} reduced to ${loserRemaining||'2'} pieces`;
  const rematch=()=>router.replace({pathname:ROUTES.appMillsMatch,params:{p1:p.p1,p2:p.p2,startingPlayer:next,sound:p.sound,haptics:p.haptics,theme:p.theme}} as never);

  const emblemEnter=reducedMotion?FadeIn.duration(220):ZoomIn.duration(420);
  const stagger=(delay:number)=>reducedMotion?FadeIn.duration(180):FadeInDown.delay(delay).duration(320);

  return <View style={[styles.safe,{paddingTop:Math.max(insets.top,8),paddingBottom:Math.max(insets.bottom,8)}]}>
    <LinearGradient colors={['#111D2F','#080D18','#060A12']} style={StyleSheet.absoluteFill}/>
    <View pointerEvents="none" style={[styles.glow,{backgroundColor:isDraw?'rgba(158,173,191,.07)':`${winnerColor}14`}]}/>
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View entering={emblemEnter} style={styles.emblemWrap}>
        {!isDraw&&!reducedMotion&&Array.from({length:7},(_,i)=><Particle key={i} angle={(i/7)*Math.PI*2} color={winnerColor} delay={90}/>)}
        <View style={[styles.emblem,{borderColor:isDraw?T.border:winnerColor,backgroundColor:isDraw?'rgba(255,255,255,.05)':`${winnerColor}18`}]}>
          {isDraw?<Scale color={T.text} size={34}/>:<Trophy color={winnerColor} size={36}/>}
        </View>
      </Animated.View>

      <Animated.View entering={stagger(100)} style={styles.headingBlock}>
        <Text style={[styles.kicker,{color:isDraw?T.textMuted:winnerColor}]}>{isDraw?'MATCH DRAWN':'VICTORY'}</Text>
        <Text style={styles.title}>{isDraw?'Draw':`${winner} wins`}</Text>
        <Text style={styles.reason}>{reason}</Text>
      </Animated.View>

      <Animated.View entering={stagger(180)} style={styles.summary}>
        <Summary icon={<Clock3 color={T.textMuted} size={18}/>} label="MATCH TIME" value={duration}/>
        <View style={styles.summaryRule}/>
        <Summary icon={<View style={styles.turnIcon}><Text style={styles.turnIconText}>#</Text></View>} label="TOTAL TURNS" value={p.turns||'0'}/>
      </Animated.View>

      <Animated.View entering={stagger(240)} style={styles.players}>
        <PlayerResult name={p.p1||'Player 1'} symbol="●" color={T.p1} mills={p.p1Mills} captures={p.p1Captured} remaining={p.p1Remaining} winner={!isDraw&&winnerId==='P1'}/>
        <PlayerResult name={p.p2||'Player 2'} symbol="◆" color={T.p2} mills={p.p2Mills} captures={p.p2Captured} remaining={p.p2Remaining} winner={!isDraw&&winnerId==='P2'}/>
      </Animated.View>

      <Animated.View entering={stagger(300)} style={styles.actions}>
        <Pressable onPress={rematch} style={[styles.primary,{backgroundColor:isDraw?T.p1:winnerColor}]}><Text style={styles.primaryText}>REMATCH</Text></Pressable>
        <Pressable onPress={()=>router.replace(ROUTES.appMillsSetup as never)} style={styles.secondary}><Text style={styles.secondaryText}>NEW MATCH</Text></Pressable>
        <Pressable onPress={()=>router.replace(ROUTES.appEyeGames as never)} style={styles.exit}><Text style={styles.exitText}>BACK TO GAMES</Text></Pressable>
      </Animated.View>
    </ScrollView>
  </View>;
}

function Summary({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <View style={styles.summaryItem}>{icon}<View><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View></View>}
function PlayerResult({name,symbol,color,mills,captures,remaining,winner}:{name:string;symbol:string;color:string;mills?:string;captures?:string;remaining?:string;winner:boolean}){return <View style={[styles.playerCard,winner&&{borderColor:color,backgroundColor:`${color}0C`}]}><View style={styles.playerHeading}><Text style={[styles.playerSymbol,{color}]}>{symbol}</Text><Text numberOfLines={1} style={styles.playerName}>{name}</Text>{winner&&<Text style={[styles.winnerTag,{color}]}>WINNER</Text>}</View><Metric label="Mills formed" value={mills||'0'}/><Metric label="Captures" value={captures||'0'}/><Metric label="Pieces remaining" value={remaining||'0'}/></View>}
function Metric({label,value}:{label:string;value:string}){return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:T.background},glow:{position:'absolute',width:330,height:330,borderRadius:165,top:-130,alignSelf:'center'},container:{flexGrow:1,padding:22,paddingBottom:30,alignItems:'center'},
  emblemWrap:{alignItems:'center',justifyContent:'center',marginTop:24},
  particle:{position:'absolute',width:6,height:6,borderRadius:3},
  emblem:{width:82,height:82,borderRadius:41,borderWidth:1.5,alignItems:'center',justifyContent:'center'},
  headingBlock:{alignItems:'center'},
  kicker:{fontFamily:FONTS.bodyBold,fontSize:10,letterSpacing:2.3,marginTop:18},title:{color:T.text,fontFamily:FONTS.heading,fontSize:31,textAlign:'center',marginTop:7},reason:{color:T.textMuted,fontFamily:FONTS.body,fontSize:14,textAlign:'center',marginTop:6},
  summary:{width:'100%',minHeight:70,flexDirection:'row',alignItems:'center',marginTop:25,borderRadius:19,backgroundColor:'rgba(20,31,47,.82)',borderWidth:1,borderColor:T.border},summaryItem:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},summaryRule:{width:1,height:34,backgroundColor:T.border},summaryLabel:{color:T.textMuted,fontFamily:FONTS.bodyBold,fontSize:8,letterSpacing:.8},summaryValue:{color:T.text,fontFamily:FONTS.headingSemi,fontSize:19,marginTop:2},turnIcon:{width:18,height:18,alignItems:'center',justifyContent:'center'},turnIconText:{color:T.textMuted,fontFamily:FONTS.headingSemi,fontSize:18},
  players:{width:'100%',flexDirection:'row',gap:10,marginTop:12},playerCard:{flex:1,borderRadius:19,borderWidth:1,borderColor:T.border,backgroundColor:'rgba(20,31,47,.7)',padding:13},playerHeading:{minHeight:36,flexDirection:'row',alignItems:'center',gap:7,borderBottomWidth:1,borderBottomColor:T.border,marginBottom:6},playerSymbol:{fontSize:16},playerName:{flex:1,color:T.text,fontFamily:FONTS.bodySemi,fontSize:12},winnerTag:{fontFamily:FONTS.bodyBold,fontSize:7,letterSpacing:.7},metric:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:5},metricLabel:{color:T.textMuted,fontFamily:FONTS.body,fontSize:9},metricValue:{color:T.text,fontFamily:FONTS.headingSemi,fontSize:14},
  actions:{width:'100%',marginTop:'auto',paddingTop:22,gap:9},primary:{height:54,borderRadius:17,alignItems:'center',justifyContent:'center'},primaryText:{color:'#071316',fontFamily:FONTS.bodyBold,fontSize:13,letterSpacing:.8},secondary:{height:50,borderRadius:16,borderWidth:1,borderColor:T.border,backgroundColor:'rgba(255,255,255,.035)',alignItems:'center',justifyContent:'center'},secondaryText:{color:T.text,fontFamily:FONTS.bodySemi,fontSize:12,letterSpacing:.7},exit:{height:42,alignItems:'center',justifyContent:'center'},exitText:{color:T.textMuted,fontFamily:FONTS.bodySemi,fontSize:10,letterSpacing:.8},
});
