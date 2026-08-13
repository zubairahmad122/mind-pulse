/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally
   mutated outside render (gesture worklets, effects); the React Compiler rule doesn't
   yet model that pattern. */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  LogOut,
  MoreHorizontal,
  Play,
  RotateCcw,
  Sparkles,
  Vibrate,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AccessibilityInfo, BackHandler, type LayoutChangeEvent, Modal, Pressable, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '@/constants/designSystem';
import { MILLS_THEME as T } from '@/constants/millsTheme';
import { ROUTES } from '@/constants';
import { MillsBackground } from '@/components/games/mills/MillsBackground';
import { MillsBoard } from '@/components/games/mills/MillsBoard';
import { IdentityMark, MillsPlayerStatus } from '@/components/games/mills/MillsPlayerStatus';
import { countPieces, createInitialGame, gameReducer, opponentOf, type GameAction, type GameState, type PositionId } from '@/engine/core/games/mills';
import { clearMillsMatch, loadMillsMatch, saveMillsMatch } from '@/services/millsPersistence';
import { useMillsFeedback } from '@/hooks/useMillsFeedback';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { shouldPromptLeaveOnBack } from './millsMatchBackLogic';

/** First-paint estimate only — real layout (measured via onLayout below) takes over as soon as
 * it's available, so this never needs to be pixel-accurate, just close enough to avoid a flash. */
function fallbackChromeHeight(compact: boolean) {
  return compact ? 260 : 300;
}

function phaseLabel(state: GameState, flying: boolean): string {
  if (state.capturePending) return 'REMOVE';
  if (flying) return 'FLYING';
  return state.phase === 'placement' ? 'PLACEMENT' : 'MOVEMENT';
}

function resultHeadline(state: GameState): string {
  if (!state.result) return '';
  if (state.result.type === 'draw') return 'DRAW';
  return `${state.settings.playerNames[state.result.winner]} WINS`.toUpperCase();
}

export default function MillsMatchScreen(){
  const params=useLocalSearchParams<{p1?:string;p2?:string;startingPlayer?:'P1'|'P2';sound?:string;haptics?:string;theme?:'classic'|'slate';continue?:string}>();
  const router=useRouter(); const {width,height}=useWindowDimensions(); const insets=useSafeAreaInsets(); const [paused,setPaused]=useState(false); const [confirm,setConfirm]=useState<'restart'|'exit'|null>(null);
  const [millLocked,setMillLocked]=useState(false);const [capturingPosition,setCapturingPosition]=useState<PositionId|null>(null);const [invalidPosition,setInvalidPosition]=useState<PositionId|null>(null);
  const millTimer=useRef<ReturnType<typeof setTimeout>|null>(null);const captureTimer=useRef<ReturnType<typeof setTimeout>|null>(null);const invalidTimer=useRef<ReturnType<typeof setTimeout>|null>(null);const resultTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const resumePauseAfterRules=useRef(false);
  const initial=useMemo(()=>createInitialGame({playerNames:{P1:params.p1||'Player 1',P2:params.p2||'Player 2'},startingPlayer:params.startingPlayer==='P2'?'P2':'P1',soundEnabled:params.sound!=='false',hapticsEnabled:params.haptics!=='false',pieceTheme:params.theme==='slate'?'slate':'classic'}),[params.haptics,params.p1,params.p2,params.sound,params.startingPlayer,params.theme]);
  const [state,dispatch]=useReducer(gameReducer,initial); const restored=useRef(params.continue!=='true'); const resultSent=useRef(false);
  const feedback=useMillsFeedback(state.settings.soundEnabled,state.settings.hapticsEnabled);
  const reducedMotion=useReducedMotion();

  const flying=state.phase==='movement'&&countPieces(state.board,state.currentPlayer)===3;
  const showHint=state.settings.hintsEnabled&&state.turnNumber<2&&!state.result;
  const compact=height<700;
  const gap=compact?8:10;
  const [topGroupHeight,setTopGroupHeight]=useState<number|null>(null);
  const [dockHeight,setDockHeight]=useState<number|null>(null);
  const onTopGroupLayout=(e:LayoutChangeEvent)=>setTopGroupHeight(e.nativeEvent.layout.height);
  const onDockLayout=(e:LayoutChangeEvent)=>setDockHeight(e.nativeEvent.layout.height);
  const availableHeight=height-insets.top-insets.bottom;
  // Calculated from the actually-rendered chrome, not a hand-maintained budget — the fallback
  // only covers the first frame before onLayout reports real measurements.
  const boardSize=topGroupHeight!=null&&dockHeight!=null
    ? Math.max(240,Math.min(width-24,availableHeight-topGroupHeight-dockHeight-gap*2,520))
    : Math.max(240,Math.min(width-24,availableHeight-fallbackChromeHeight(compact),520));

  useEffect(()=>{if(params.continue!=='true')return;let active=true;void loadMillsMatch().then(saved=>{if(active&&saved)dispatch({type:'RESTORE',state:saved});restored.current=true;});return()=>{active=false;};},[params.continue]);
  useEffect(()=>()=>{if(millTimer.current)clearTimeout(millTimer.current);if(captureTimer.current)clearTimeout(captureTimer.current);if(invalidTimer.current)clearTimeout(invalidTimer.current);if(resultTimer.current)clearTimeout(resultTimer.current);},[]);
  useEffect(()=>{if(!restored.current)return;if(state.result){void clearMillsMatch();if(!resultSent.current){resultSent.current=true;const duration=Math.max(0,Date.now()-state.startedAt);resultTimer.current=setTimeout(()=>router.replace({pathname:ROUTES.appMillsResults,params:{result:state.result!.type,winner:state.result!.type==='win'?state.result!.winner:'',reason:state.result!.reason,p1:state.settings.playerNames.P1,p2:state.settings.playerNames.P2,startingPlayer:state.settings.startingPlayer,turns:String(state.turnNumber),duration:String(duration),p1Mills:String(state.players.P1.millsFormed),p2Mills:String(state.players.P2.millsFormed),p1Captured:String(state.players.P1.piecesCaptured),p2Captured:String(state.players.P2.piecesCaptured),p1Remaining:String(countPieces(state.board,'P1')),p2Remaining:String(countPieces(state.board,'P2')),sound:String(state.settings.soundEnabled),haptics:String(state.settings.hapticsEnabled),theme:state.settings.pieceTheme}} as never),reducedMotion?200:560);}}else if(state.turnNumber>0){void saveMillsMatch(state);}},[reducedMotion,router,state]);

  // Reopens the pause sheet when the user comes back from the pushed Rules screen — it was
  // never "closed", just backgrounded, so this restores the state the user actually left.
  useFocusEffect(useCallback(()=>{
    if(resumePauseAfterRules.current){resumePauseAfterRules.current=false;setPaused(true);}
  },[]));

  // Deterministic Android back priority: a Modal's own onRequestClose already intercepts back
  // before this fires whenever Pause or Confirm is visible, so this only runs for "no modal open".
  // The paused/confirm/result checks below are a defensive second guarantee of that ordering.
  useFocusEffect(useCallback(()=>{
    const sub=BackHandler.addEventListener('hardwareBackPress',()=>{
      if(!shouldPromptLeaveOnBack({paused,confirmOpen:Boolean(confirm),matchCompleted:Boolean(state.result)}))return false;
      setConfirm('exit');
      return true;
    });
    return ()=>sub.remove();
  },[paused,confirm,state.result]));

  const flashInvalid=(position:PositionId)=>{feedback.invalid();setInvalidPosition(position);if(invalidTimer.current)clearTimeout(invalidTimer.current);invalidTimer.current=setTimeout(()=>setInvalidPosition(null),reducedMotion?140:240);};
  const commit=(action:GameAction,cue:'select'|'place'|'move',position:PositionId)=>{const next=gameReducer(state,action);if(next===state){flashInvalid(position);return;}dispatch(action);if(next.capturePending&&!state.capturePending){feedback.mill();setMillLocked(!reducedMotion);if(millTimer.current)clearTimeout(millTimer.current);millTimer.current=setTimeout(()=>setMillLocked(false),reducedMotion?0:600);}else feedback[cue]();if(next.result)feedback.win();};
  const capture=(position:PositionId)=>{if(millLocked||capturingPosition)return;const action:GameAction={type:'CAPTURE',position};const next=gameReducer(state,action);if(next===state){flashInvalid(position);return;}setCapturingPosition(position);feedback.capture();captureTimer.current=setTimeout(()=>{dispatch(action);setCapturingPosition(null);if(next.result)feedback.win();},reducedMotion?150:380);};
  const tap=(position:PositionId)=>{if(state.result||paused||capturingPosition)return;if(state.capturePending){capture(position);return;}if(millLocked)return;if(state.phase==='placement'){commit({type:'PLACE',position,expectedRevision:state.revision},'place',position);return;}if(state.board[position]===state.currentPlayer){commit({type:'SELECT',position},'select',position);return;}if(state.selectedPosition){commit({type:'MOVE',to:position,expectedRevision:state.revision},'move',position);return;}flashInvalid(position);};
  const resolveConfirm=()=>{const action=confirm;setConfirm(null);if(action==='restart')dispatch({type:'RESTART'});if(action==='exit')router.replace(ROUTES.appMills as never);};

  const opponentName=state.settings.playerNames[opponentOf(state.currentPlayer)];
  const activeName=state.settings.playerNames[state.currentPlayer];
  const activeColor=state.currentPlayer==='P1'?T.p1:T.p2;
  const command=state.result||state.capturePending||flying?null:state.phase==='placement'?'PLACE A PIECE':state.selectedPosition?'CHOOSE A LEGAL DESTINATION':'SELECT A PIECE';

  return (
    <View style={[styles.safe,{paddingTop:Math.max(insets.top,6),paddingBottom:Math.max(insets.bottom,12)}]}>
      <MillsBackground watermark={false}/>
      <View style={[styles.container,{gap}]}>

        <View style={{gap:compact?6:8}} onLayout={onTopGroupLayout}>
          <View style={[styles.top,{height:compact?42:46}]}>
            <Pressable accessibilityLabel="Back" onPress={()=>{if(shouldPromptLeaveOnBack({paused,confirmOpen:Boolean(confirm),matchCompleted:Boolean(state.result)})){setConfirm('exit');}else if(state.result){router.replace(ROUTES.appMills as never);}}} style={styles.icon}><ArrowLeft color={T.text} size={17}/></Pressable>
            <View style={styles.heading}>
              <Text style={styles.gameTitle}>MILLS</Text>
              <View style={styles.headingSub}>
                <Text style={styles.match}>Local Match</Text>
                <View style={styles.headingDot}/>
                <Text style={styles.phase}>{phaseLabel(state,flying)}</Text>
              </View>
            </View>
            <Pressable accessibilityLabel="Pause menu" onPress={()=>setPaused(true)} style={styles.icon}><MoreHorizontal color={T.text} size={18}/></Pressable>
          </View>

          <MillsPlayerStatus state={state}/>

          <View accessibilityLiveRegion="polite" style={[styles.actionStrip,{minHeight:compact?46:50},state.capturePending&&styles.actionStripCapture]}>
            <View style={styles.actionLeft}>
              {state.capturePending ? (
                <>
                  <Text style={styles.actionAlert}>MILL FORMED</Text>
                  <Text style={styles.actionCommand} numberOfLines={1}>{`REMOVE ONE ${opponentName.toUpperCase()} PIECE`}</Text>
                </>
              ) : flying ? (
                <>
                  <Text style={[styles.actionAlert,{color:T.p1}]}>FLYING ACTIVE</Text>
                  <Text style={styles.actionCommand}>MOVE TO ANY EMPTY POINT</Text>
                </>
              ) : state.result ? (
                <Text style={styles.actionCommand}>{resultHeadline(state)}</Text>
              ) : (
                <>
                  <View style={styles.actionPlayerRow}>
                    <IdentityMark player={state.currentPlayer} color={activeColor}/>
                    <Text style={[styles.actionPlayer,{color:activeColor}]} numberOfLines={1}>{activeName.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.actionCommand}>{command}</Text>
                </>
              )}
            </View>
            {!state.result && <Text style={styles.actionTurn}>TURN {state.turnNumber+1}</Text>}
          </View>

          {showHint && <Text style={styles.hint}>{state.phase==='placement'?'Tap an open anchor.':'Select a piece to see legal moves.'}</Text>}
        </View>

        <View style={styles.boardWrap}>
          <MillsBoard state={state} size={boardSize} reducedMotion={reducedMotion} capturingPosition={capturingPosition} invalidPosition={invalidPosition} onPositionPress={tap}/>
        </View>

        <View style={[styles.dock,{minHeight:compact?56:60}]} onLayout={onDockLayout}>
          <Action icon={HelpCircle} label="Rules" onPress={()=>{resumePauseAfterRules.current=false;router.push(ROUTES.appMillsRules as never);}}/>
          <View style={styles.dockDivider}/>
          <Action icon={RotateCcw} label="Restart" onPress={()=>setConfirm('restart')}/>
        </View>
      </View>

      <PauseSheet
        visible={paused}
        reducedMotion={reducedMotion}
        sound={state.settings.soundEnabled}
        haptics={state.settings.hapticsEnabled}
        hints={state.settings.hintsEnabled}
        onToggleSound={()=>dispatch({type:'UPDATE_SETTINGS',settings:{soundEnabled:!state.settings.soundEnabled}})}
        onToggleHaptics={()=>dispatch({type:'UPDATE_SETTINGS',settings:{hapticsEnabled:!state.settings.hapticsEnabled}})}
        onToggleHints={()=>dispatch({type:'UPDATE_SETTINGS',settings:{hintsEnabled:!state.settings.hintsEnabled}})}
        onClose={()=>setPaused(false)}
        onRestart={()=>{setPaused(false);setConfirm('restart');}}
        onRules={()=>{resumePauseAfterRules.current=true;setPaused(false);router.push(ROUTES.appMillsRules as never);}}
        onExit={()=>{setPaused(false);setConfirm('exit');}}
      />
      <Confirm kind={confirm} onCancel={()=>setConfirm(null)} onConfirm={resolveConfirm}/>
    </View>
  );
}

function Action({icon:Icon,label,onPress,disabled=false}:{icon:LucideIcon;label:string;onPress():void;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[styles.action,disabled&&styles.actionDisabled]}><Icon color={T.text} size={16}/><Text style={styles.actionText}>{label}</Text></Pressable>;
}

const SHEET_OFF_SCREEN=420;
const DISMISS_DISTANCE=90;
const DISMISS_VELOCITY=800;

/** A real gesture-driven bottom sheet: backdrop tap, drag-to-dismiss, Resume, and Android back
 * (via Modal's own onRequestClose) all converge on the same `onClose`, which the parent turns
 * into `paused=false` — this effect then animates the sheet out before it unmounts. */
function PauseSheet(p:{visible:boolean;reducedMotion:boolean;sound:boolean;haptics:boolean;hints:boolean;onToggleSound():void;onToggleHaptics():void;onToggleHints():void;onClose():void;onRestart():void;onRules():void;onExit():void}){
  const insets=useSafeAreaInsets();
  const [mounted,setMounted]=useState(p.visible);
  // Mount immediately when `visible` turns true — this is React's documented "adjust state
  // while rendering" pattern (a state-tracked previous value, not a ref — refs can't be read
  // during render), so the Modal appears on the same frame the request comes in.
  const [prevVisible,setPrevVisible]=useState(p.visible);
  if(p.visible!==prevVisible){
    setPrevVisible(p.visible);
    if(p.visible)setMounted(true);
  }
  const closedY=p.reducedMotion?28:SHEET_OFF_SCREEN;
  const translateY=useSharedValue(p.visible?0:closedY);
  const backdrop=useSharedValue(p.visible?1:0);

  useEffect(()=>{
    if(p.visible){
      AccessibilityInfo.announceForAccessibility('Match paused');
      translateY.value=withTiming(0,{duration:p.reducedMotion?140:300});
      backdrop.value=withTiming(1,{duration:p.reducedMotion?120:240});
    }else{
      translateY.value=withTiming(closedY,{duration:p.reducedMotion?120:220},finished=>{
        if(finished)runOnJS(setMounted)(false);
      });
      backdrop.value=withTiming(0,{duration:p.reducedMotion?100:200});
    }
  },[p.visible,p.reducedMotion,closedY,translateY,backdrop]);

  const onClose=p.onClose;
  const pan=Gesture.Pan()
    .onUpdate(e=>{
      if(e.translationY>0)translateY.value=e.translationY;
    })
    .onEnd(e=>{
      if(e.translationY>DISMISS_DISTANCE||e.velocityY>DISMISS_VELOCITY){
        runOnJS(onClose)();
      }else{
        translateY.value=withSpring(0,{damping:22,stiffness:260});
      }
    });

  const sheetStyle=useAnimatedStyle(()=>({transform:[{translateY:translateY.value}]}));
  const backdropStyle=useAnimatedStyle(()=>({opacity:backdrop.value}));

  if(!mounted)return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={p.onClose}>
      <GestureHandlerRootView style={styles.sheetRoot}>
        <Animated.View pointerEvents="none" style={[styles.sheetBackdrop,backdropStyle]}/>
        <Pressable style={StyleSheet.absoluteFill} onPress={p.onClose} accessibilityLabel="Close pause menu" accessibilityRole="button"/>
        <Animated.View style={[styles.sheet,sheetStyle,{paddingBottom:insets.bottom+14}]} accessibilityViewIsModal accessibilityRole="none">
          <GestureDetector gesture={pan}>
            <View style={styles.sheetHandleArea}>
              <View style={styles.sheetHandle}/>
              <Text style={styles.sheetTitle} accessibilityRole="header">Match paused</Text>
              <Text style={styles.sheetSubtitle}>Local Match</Text>
            </View>
          </GestureDetector>
          <View style={styles.sheetRows}>
            <SheetRow icon={Play} label="Resume" onPress={p.onClose}/>
            <SheetToggleRow icon={p.sound?Volume2:VolumeX} label="Sound" value={p.sound} onValueChange={p.onToggleSound}/>
            <SheetToggleRow icon={Vibrate} label="Haptics" value={p.haptics} onValueChange={p.onToggleHaptics}/>
            <SheetToggleRow icon={Sparkles} label="First-match hints" value={p.hints} onValueChange={p.onToggleHints}/>
            <SheetRow icon={HelpCircle} label="Rules" onPress={p.onRules} chevron/>
            <SheetRow icon={RotateCcw} label="Restart Match" onPress={p.onRestart} chevron/>
            <SheetRow icon={LogOut} label="Exit Match" onPress={p.onExit} danger/>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function SheetRow({icon:Icon,label,onPress,danger=false,chevron=false}:{icon:LucideIcon;label:string;onPress():void;danger?:boolean;chevron?:boolean}){
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.sheetRow}>
      <Icon color={danger?T.danger:T.text} size={18}/>
      <Text style={[styles.sheetRowLabel,danger&&{color:T.danger}]}>{label}</Text>
      {chevron&&<ChevronRight color={T.textMuted} size={16}/>}
    </Pressable>
  );
}

function SheetToggleRow({icon:Icon,label,value,onValueChange}:{icon:LucideIcon;label:string;value:boolean;onValueChange():void}){
  return (
    <View style={styles.sheetRow}>
      <Icon color={value?T.p1:T.textMuted} size={18}/>
      <Text style={styles.sheetRowLabel}>{label}</Text>
      <Text style={[styles.sheetRowStatus,value&&styles.sheetRowStatusOn]}>{value?'ON':'OFF'}</Text>
      <Switch accessibilityLabel={`${label}, ${value?'on':'off'}`} value={value} onValueChange={onValueChange} trackColor={{false:'#293444',true:T.p1Dark}} thumbColor={value?T.p1:'#A0A9B4'}/>
    </View>
  );
}

type ConfirmVariant='primary'|'plain'|'danger'|'dangerPlain';

function Confirm({kind,onCancel,onConfirm}:{kind:'restart'|'exit'|null;onCancel():void;onConfirm():void}){
  const insets=useSafeAreaInsets();
  if(!kind)return null;
  const isExit=kind==='exit';
  const title=isExit?'Leave match?':'Restart match?';
  const message=isExit
    ?'Your match will be saved so you can continue later.'
    :'The current board will be cleared and this match will start again.';
  const buttons:{label:string;onPress():void;variant:ConfirmVariant}[]=isExit
    ?[{label:'Keep Playing',onPress:onCancel,variant:'primary'},{label:'Leave Match',onPress:onConfirm,variant:'dangerPlain'}]
    :[{label:'Cancel',onPress:onCancel,variant:'plain'},{label:'Restart',onPress:onConfirm,variant:'danger'}];
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Dismiss dialog">
        <Pressable style={[styles.confirmCard,{paddingBottom:insets.bottom+22}]} onPress={()=>{}}>
          <Text style={styles.confirmTitle} accessibilityRole="header">{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>
          <View style={styles.confirmRow}>
            {buttons.map(b=>(
              <Pressable
                key={b.label}
                accessibilityRole="button"
                onPress={b.onPress}
                style={[
                  styles.confirmButton,
                  b.variant==='primary'&&styles.confirmButtonPrimary,
                  b.variant==='danger'&&styles.confirmButtonDanger,
                ]}
              >
                <Text style={[
                  styles.confirmButtonText,
                  b.variant==='primary'&&styles.confirmButtonTextPrimary,
                  (b.variant==='danger'||b.variant==='dangerPlain')&&styles.confirmButtonTextDanger,
                ]}>{b.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:T.background},
  container:{flex:1,paddingHorizontal:12},

  top:{flexDirection:'row',alignItems:'center'},
  icon:{width:34,height:34,borderRadius:12,alignItems:'center',justifyContent:'center'},
  heading:{flex:1,alignItems:'center'},
  gameTitle:{color:T.text,fontFamily:FONTS.heading,fontSize:15,letterSpacing:2},
  headingSub:{flexDirection:'row',alignItems:'center',gap:5,marginTop:0},
  match:{color:T.textMuted,fontFamily:FONTS.body,fontSize:9},
  headingDot:{width:2.5,height:2.5,borderRadius:1.5,backgroundColor:T.textMuted,opacity:.6},
  phase:{color:T.p1,fontFamily:FONTS.bodyBold,fontSize:8.5,letterSpacing:.8},

  actionStrip:{borderRadius:18,backgroundColor:'rgba(15,24,37,.72)',flexDirection:'row',alignItems:'center',paddingHorizontal:14,borderWidth:1,borderColor:T.border},
  actionStripCapture:{borderColor:T.danger,backgroundColor:'rgba(255,92,101,.1)'},
  actionLeft:{flex:1,minWidth:0},
  actionAlert:{color:'#FF969C',fontFamily:FONTS.bodyBold,fontSize:11,letterSpacing:1.1},
  actionCommand:{color:T.text,fontFamily:FONTS.headingSemi,fontSize:13,marginTop:2},
  actionPlayerRow:{flexDirection:'row',alignItems:'center',gap:6},
  actionPlayer:{fontFamily:FONTS.bodyBold,fontSize:9.5,letterSpacing:1},
  actionTurn:{color:T.textMuted,fontFamily:FONTS.bodyBold,fontSize:9,letterSpacing:.6,marginLeft:8},

  hint:{color:T.textMuted,fontFamily:FONTS.body,fontSize:10,textAlign:'center'},

  boardWrap:{flex:1,alignItems:'center',justifyContent:'flex-start'},

  dock:{borderRadius:30,borderWidth:1,borderColor:'rgba(255,255,255,.09)',backgroundColor:'rgba(15,24,37,.86)',flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',paddingHorizontal:6,shadowColor:'#000',shadowOffset:{width:0,height:6},shadowOpacity:.22,shadowRadius:12},
  dockDivider:{width:1,height:22,backgroundColor:T.border},
  action:{flex:1,minHeight:42,alignItems:'center',justifyContent:'center',gap:3,borderRadius:13},
  actionDisabled:{opacity:.28},
  actionText:{color:T.textMuted,fontFamily:FONTS.bodySemi,fontSize:9.5},

  /* Pause bottom sheet */
  sheetRoot:{flex:1},
  sheetBackdrop:{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(6,10,18,.5)'},
  sheet:{position:'absolute',left:0,right:0,bottom:0,maxHeight:'60%',borderTopLeftRadius:28,borderTopRightRadius:28,backgroundColor:'rgba(14,21,33,.98)',borderWidth:1,borderColor:'rgba(255,255,255,.08)',shadowColor:'#000',shadowOffset:{width:0,height:-8},shadowOpacity:.4,shadowRadius:24},
  sheetHandleArea:{alignItems:'center',paddingTop:10,paddingBottom:12},
  sheetHandle:{width:36,height:4,borderRadius:2,backgroundColor:'rgba(255,255,255,.22)'},
  sheetTitle:{color:T.text,fontFamily:FONTS.heading,fontSize:19,marginTop:10},
  sheetSubtitle:{color:T.textMuted,fontFamily:FONTS.body,fontSize:11,marginTop:2},
  sheetRows:{paddingHorizontal:16,gap:6},
  sheetRow:{minHeight:54,borderRadius:14,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14,backgroundColor:'rgba(255,255,255,.04)'},
  sheetRowLabel:{flex:1,color:T.text,fontFamily:FONTS.bodySemi,fontSize:14},
  sheetRowStatus:{color:T.textMuted,fontFamily:FONTS.bodyBold,fontSize:10,letterSpacing:.4},
  sheetRowStatusOn:{color:T.p1},

  /* Compact confirm dialog (Leave Match / Restart) */
  scrim:{flex:1,backgroundColor:'rgba(0,0,0,.55)',justifyContent:'flex-end'},
  confirmCard:{backgroundColor:T.backgroundRaised,borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,borderWidth:1,borderColor:T.border,gap:6},
  confirmTitle:{color:T.text,fontFamily:FONTS.heading,fontSize:20},
  confirmMessage:{color:T.textMuted,fontFamily:FONTS.body,fontSize:13.5,lineHeight:19,marginBottom:14},
  confirmRow:{flexDirection:'row',gap:10},
  confirmButton:{flex:1,height:50,borderRadius:15,borderWidth:1,borderColor:T.border,alignItems:'center',justifyContent:'center'},
  confirmButtonPrimary:{backgroundColor:T.text,borderColor:T.text},
  confirmButtonDanger:{backgroundColor:T.danger,borderColor:T.danger},
  confirmButtonText:{color:T.text,fontFamily:FONTS.bodySemi,fontSize:14},
  confirmButtonTextPrimary:{color:T.background,fontFamily:FONTS.bodyBold},
  confirmButtonTextDanger:{color:T.danger,fontFamily:FONTS.bodyBold},
});
