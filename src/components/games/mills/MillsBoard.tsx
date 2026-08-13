import { memo, useEffect, useMemo, useState } from 'react';
import { Animated as RNAnimated, Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BOARD_COORDINATES, MILL_LINES, POSITION_IDS, getCapturablePieces, getSelectablePieces, getVisibleLegalDestinations, type GameState, type PositionId } from '@/engine/core/games/mills';
import { MILLS_THEME as T } from '@/constants/millsTheme';

const PAD = 28;
const GRID = 100;
const SVG_SIZE = GRID * 6 + PAD * 2;

const BOARD_WOOD = require('@/assets/images/mills/mills-board-wood-texture.jpg');

/** Line/anchor colors for the wood surface. The overlay darkens the wood substantially, so the
 * lines need to be LIGHT to read against it — dark-on-darkened-wood was low-contrast. */
const LINE_ON_WOOD = '#F0E6D2';
const NODE_RING_ON_WOOD = 'rgba(240,230,210,0.32)';
const NODE_DOT_ON_WOOD = '#2E1D13';

/** "Stone" piece theme — classic black-and-ivory stones, deliberately kept off the cyan/coral accent palette used by "Pulse". */
const STONE_TOP: Record<'P1' | 'P2', string> = { P1: '#FFFDF7', P2: '#3A3A3C' };
const STONE_BASE: Record<'P1' | 'P2', string> = { P1: '#EDE7DA', P2: '#1C1C1E' };
const STONE_RIM: Record<'P1' | 'P2', string> = { P1: '#C9BFA6', P2: '#000000' };
const STONE_MARK: Record<'P1' | 'P2', string> = { P1: '#8A7F63', P2: '#5A5A5C' };

/** "Pulse" piece theme — a genuine light tint (not the base color at partial opacity) so the sphere reads as glossy, not flat. */
const PULSE_TOP: Record<'P1' | 'P2', string> = { P1: '#C9F7F5', P2: '#FFE3D2' };

interface Props { state: GameState; size: number; reducedMotion?: boolean; capturingPosition?: PositionId | null; invalidPosition?: PositionId | null; onPositionPress(position: PositionId): void }

function coordinate(id: PositionId, size: number) {
  const [gx,gy] = BOARD_COORDINATES[id];
  const scale = size / SVG_SIZE;
  return { x: (PAD + gx * GRID) * scale, y: (PAD + gy * GRID) * scale };
}

/** Small restrained anchor: thin outer ring + solid center dot — the board lines stay the primary read, not 24 outlined circles. */
function EmptyNode({ legal, reducedMotion }: { legal: boolean; reducedMotion: boolean }) {
  const pulse = useState(() => new RNAnimated.Value(0))[0];
  useEffect(() => {
    if (!legal || reducedMotion) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const animation = RNAnimated.loop(RNAnimated.sequence([
      RNAnimated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      RNAnimated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [legal, pulse, reducedMotion]);
  return (
    <View style={styles.nodeWrap}>
      <View style={[styles.nodeRing, legal && styles.nodeRingLegal]} />
      <RNAnimated.View
        style={[
          styles.nodeDot,
          legal && styles.nodeDotLegal,
          legal && !reducedMotion && {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.08] }) }],
          },
        ]}
      />
    </View>
  );
}

function Piece({ player, selected, capturable, capturing=false, muted=false, millCelebration=false, winnerCelebration=false, justPlaced=false, reducedMotion=false, theme='classic' }: { player:'P1'|'P2'; selected:boolean; capturable:boolean;capturing?:boolean;muted?:boolean;millCelebration?:boolean;winnerCelebration?:boolean;justPlaced?:boolean; reducedMotion?:boolean;theme?:'classic'|'slate' }) {
  const color = player === 'P1' ? T.p1 : T.p2;
  const isStone = theme === 'slate';
  const gradientColors: [string, string, string] = isStone
    ? [STONE_TOP[player], STONE_BASE[player], STONE_RIM[player]]
    : [PULSE_TOP[player], color, player === 'P1' ? T.p1Dark : T.p2Dark];
  const markBorderColor = isStone ? STONE_MARK[player] : (player === 'P1' ? '#092226' : '#361713');
  // A thin, low-opacity dark edge (not a painted color outline) keeps the boundary crisp against
  // the wood without reading as a "cheap outlined circle" — selection still gets its own white ring.
  const pieceBorderColor = selected ? '#FFF' : 'rgba(0,0,0,0.28)';
  const [celebrationScale]=useState(()=>new RNAnimated.Value(1));
  const [celebrationGlow]=useState(()=>new RNAnimated.Value(0));
  const [actionScale]=useState(()=>new RNAnimated.Value(justPlaced&&!reducedMotion?.82:1));
  const [actionOpacity]=useState(()=>new RNAnimated.Value(1));
  const [capturePulse]=useState(()=>new RNAnimated.Value(0));
  useEffect(()=>{
    if((!millCelebration&&!winnerCelebration)||reducedMotion)return;
    celebrationScale.setValue(1);celebrationGlow.setValue(0);
    RNAnimated.parallel([
      RNAnimated.sequence([
        RNAnimated.timing(celebrationScale,{toValue:1.2,duration:170,useNativeDriver:true}),
        RNAnimated.spring(celebrationScale,{toValue:1,damping:7,stiffness:180,useNativeDriver:true}),
      ]),
      RNAnimated.sequence([
        RNAnimated.timing(celebrationGlow,{toValue:1,duration:150,useNativeDriver:true}),
        RNAnimated.delay(420),
        RNAnimated.timing(celebrationGlow,{toValue:0,duration:300,useNativeDriver:true}),
      ]),
    ]).start();
  },[celebrationGlow,celebrationScale,millCelebration,reducedMotion,winnerCelebration]);
  useEffect(()=>{
    if(reducedMotion){actionScale.setValue(1);return;}
    if(justPlaced)RNAnimated.sequence([RNAnimated.timing(actionScale,{toValue:1.035,duration:180,useNativeDriver:true}),RNAnimated.spring(actionScale,{toValue:1,damping:9,stiffness:220,useNativeDriver:true})]).start();
  },[actionScale,justPlaced,reducedMotion]);
  useEffect(()=>{
    if(!capturing)return;
    if(reducedMotion){RNAnimated.timing(actionOpacity,{toValue:0,duration:140,useNativeDriver:true}).start();return;}
    RNAnimated.parallel([RNAnimated.sequence([RNAnimated.timing(actionScale,{toValue:1.06,duration:100,useNativeDriver:true}),RNAnimated.timing(actionScale,{toValue:.75,duration:230,useNativeDriver:true})]),RNAnimated.sequence([RNAnimated.delay(120),RNAnimated.timing(actionOpacity,{toValue:0,duration:210,useNativeDriver:true})])]).start();
  },[actionOpacity,actionScale,capturing,reducedMotion]);
  useEffect(()=>{
    if(!capturable||capturing||reducedMotion){capturePulse.stopAnimation();capturePulse.setValue(0);return;}
    const animation=RNAnimated.loop(RNAnimated.sequence([
      RNAnimated.timing(capturePulse,{toValue:1,duration:620,useNativeDriver:true}),
      RNAnimated.timing(capturePulse,{toValue:0,duration:620,useNativeDriver:true}),
    ]));
    animation.start();
    return ()=>animation.stop();
  },[capturable,capturing,reducedMotion,capturePulse]);
  const sparkOpacity=actionOpacity.interpolate({inputRange:[0,.4,1],outputRange:[0,1,0]});
  return <Animated.View entering={reducedMotion?undefined:ZoomIn.duration(180)} exiting={reducedMotion?undefined:ZoomOut.duration(120)} style={[styles.shadow,muted&&styles.muted,selected&&styles.selectedShadow,capturable&&styles.capturable]}>
    {selected&&<View pointerEvents="none" style={[styles.selectedHalo,{backgroundColor:`${color}2E`,borderColor:`${color}66`}]}/>}
    <RNAnimated.View style={{opacity:actionOpacity,transform:[{scale:actionScale}]} }><RNAnimated.View style={{transform:[{scale:celebrationScale}]}}><RNAnimated.View pointerEvents="none" style={[styles.millBurst,{borderColor:color,opacity:celebrationGlow,transform:[{scale:celebrationGlow.interpolate({inputRange:[0,1],outputRange:[.7,1.35]})}]}]}/>{capturable&&<RNAnimated.View pointerEvents="none" style={[styles.captureRing,capturing&&styles.captureRingActive,!capturing&&!reducedMotion&&{opacity:capturePulse.interpolate({inputRange:[0,1],outputRange:[.55,1]}),transform:[{scale:capturePulse.interpolate({inputRange:[0,1],outputRange:[1,1.08]})}]}]}/>}<LinearGradient colors={gradientColors} start={{x:0.28,y:0.12}} end={{x:0.75,y:1}} style={[styles.piece,{borderColor:pieceBorderColor}]}><View style={styles.pieceGlossOuter}/><View style={styles.pieceGlossInner}/><View style={[player === 'P1' ? styles.p1Mark : styles.p2Mark,{borderColor:markBorderColor}]}/></LinearGradient></RNAnimated.View></RNAnimated.View>{capturing&&!reducedMotion&&<View pointerEvents="none" style={styles.sparks}><RNAnimated.View style={[styles.spark,{opacity:sparkOpacity,transform:[{translateX:actionOpacity.interpolate({inputRange:[0,1],outputRange:[-11,0]})},{translateY:actionOpacity.interpolate({inputRange:[0,1],outputRange:[-8,0]})}]}]}/><RNAnimated.View style={[styles.spark,{opacity:sparkOpacity,transform:[{translateX:actionOpacity.interpolate({inputRange:[0,1],outputRange:[12,0]})},{translateY:actionOpacity.interpolate({inputRange:[0,1],outputRange:[-4,0]})}]}]}/><RNAnimated.View style={[styles.spark,{opacity:sparkOpacity,transform:[{translateX:actionOpacity.interpolate({inputRange:[0,1],outputRange:[4,0]})},{translateY:actionOpacity.interpolate({inputRange:[0,1],outputRange:[12,0]})}]}]}/></View>}</Animated.View>;
}

function MovingPiece({from,to,size,player,reducedMotion,theme,onDone}:{from:PositionId;to:PositionId;size:number;player:'P1'|'P2';reducedMotion:boolean;theme:'classic'|'slate';onDone():void}){
  const [progress]=useState(()=>new RNAnimated.Value(reducedMotion?1:0));
  const a=coordinate(from,size),b=coordinate(to,size);
  useEffect(()=>{if(reducedMotion){onDone();return;}RNAnimated.timing(progress,{toValue:1,duration:280,useNativeDriver:true}).start(({finished})=>{if(finished)onDone();});},[onDone,progress,reducedMotion]);
  const translateX=progress.interpolate({inputRange:[0,1],outputRange:[a.x-b.x,0]});const translateY=progress.interpolate({inputRange:[0,1],outputRange:[a.y-b.y,0]});
  return <RNAnimated.View pointerEvents="none" style={[styles.moving,{left:b.x-20,top:b.y-20,transform:[{translateX},{translateY}]}]}><Piece player={player} selected={false} capturable={false} reducedMotion theme={theme}/></RNAnimated.View>;
}

/** A thin point of light travels the completed mill segment once — the "premium event" cue for forming a mill. */
function MillLightTravel({from,to,size,color,onDone}:{from:PositionId;to:PositionId;size:number;color:string;onDone():void}){
  const [progress]=useState(()=>new RNAnimated.Value(0));
  const a=coordinate(from,size),b=coordinate(to,size);
  useEffect(()=>{RNAnimated.timing(progress,{toValue:1,duration:380,useNativeDriver:true}).start(({finished})=>{if(finished)onDone();});},[onDone,progress]);
  const translateX=progress.interpolate({inputRange:[0,1],outputRange:[a.x-b.x,0]});
  const translateY=progress.interpolate({inputRange:[0,1],outputRange:[a.y-b.y,0]});
  const opacity=progress.interpolate({inputRange:[0,.12,.85,1],outputRange:[0,1,1,0]});
  return <RNAnimated.View pointerEvents="none" style={[styles.millLight,{left:b.x-5,top:b.y-5,backgroundColor:color,shadowColor:color,opacity,transform:[{translateX},{translateY}]}]}/>;
}

/** Brief horizontal shake on an illegal tap — subtle rejection feedback, on top of the existing red ring flash. */
function ShakeWrapper({invalid,reducedMotion,children}:{invalid:boolean;reducedMotion:boolean;children:React.ReactNode}){
  const shakeX=useState(()=>new RNAnimated.Value(0))[0];
  useEffect(()=>{
    if(!invalid||reducedMotion)return;
    shakeX.setValue(0);
    RNAnimated.sequence([
      RNAnimated.timing(shakeX,{toValue:-5,duration:40,useNativeDriver:true}),
      RNAnimated.timing(shakeX,{toValue:5,duration:70,useNativeDriver:true}),
      RNAnimated.timing(shakeX,{toValue:-4,duration:70,useNativeDriver:true}),
      RNAnimated.timing(shakeX,{toValue:0,duration:60,useNativeDriver:true}),
    ]).start();
  },[invalid,reducedMotion,shakeX]);
  // Explicit centering matters here: selectableRing/invalidRing are absolutely positioned with
  // no top/left of their own, relying on the parent's alignItems/justifyContent to center them
  // over the piece/node — without it they default toward the top-left of this wrapper's box
  // instead of centering on the anchor, which is what was reading as "pieces off-position".
  return <RNAnimated.View style={{alignItems:'center',justifyContent:'center',transform:[{translateX:shakeX}]}}>{children}</RNAnimated.View>;
}

export const MillsBoard = memo(function MillsBoard({ state, size, reducedMotion=false, capturingPosition=null, invalidPosition=null, onPositionPress }: Props) {
  const legal = useMemo(() => new Set(getVisibleLegalDestinations(state)), [state]);
  const selectable = useMemo(() => new Set(getSelectablePieces(state)), [state]);
  const capturable = useMemo(() => new Set(getCapturablePieces(state)), [state]);
  const completed = useMemo(() => new Set(state.lastCompletedMills), [state.lastCompletedMills]);
  const completedLines = useMemo(() => MILL_LINES.filter(line => completed.has(line.join('-'))), [completed]);
  const celebratedPositions = useMemo(() => {
    const positions = new Set<PositionId>();
    completedLines.forEach(line => line.forEach(id => positions.add(id)));
    return positions;
  }, [completedLines]);
  const moveKey=state.lastMove?.from?`${state.lastMove.from}-${state.lastMove.to}-${state.turnNumber}`:null;
  const [completedMoveKey,setCompletedMoveKey]=useState<string|null>(null);
  const moving=Boolean(moveKey&&!reducedMotion&&completedMoveKey!==moveKey&&state.lastMove?.from&&state.board[state.lastMove.to]);
  const millKey=completedLines.length?`${state.lastCompletedMills.join('|')}-${state.turnNumber}`:null;
  const [playedMillKey,setPlayedMillKey]=useState<string|null>(null);
  const showMillLight=Boolean(millKey&&!reducedMotion&&playedMillKey!==millKey);
  const [dimOpacity]=useState(()=>new RNAnimated.Value(0));
  useEffect(()=>{
    if(!state.result){dimOpacity.setValue(0);return;}
    if(reducedMotion){dimOpacity.setValue(.16);return;}
    RNAnimated.timing(dimOpacity,{toValue:.16,duration:320,useNativeDriver:true}).start();
  },[state.result,reducedMotion,dimOpacity]);
  return (
    <View style={[styles.board,{width:size,height:size}]} accessibilityLabel="Nine Men's Morris board">
      {/* Clipped independently of the outer `board` container (which stays overflow:'visible' so
       * piece halos/capture rings near the edge aren't cut off) — Image's own borderRadius
       * clipping isn't reliable enough on Android on its own, which was letting the wood bleed
       * past the rounded corners into a visible strip below the board. */}
      <View pointerEvents="none" style={styles.boardSurface}>
        <Image source={BOARD_WOOD} resizeMode="cover" style={styles.boardMaterial}/>
        <View style={styles.boardOverlay}/>
        <View style={styles.boardLight}/>
        <View style={styles.innerFrame}/>
      </View>
      <Svg width={size} height={size} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="boardVignette" cx="50%" cy="50%" r="72%">
            <Stop offset="55%" stopColor="#000000" stopOpacity={0}/>
            <Stop offset="100%" stopColor="#000000" stopOpacity={0.16}/>
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={SVG_SIZE} height={SVG_SIZE} fill="url(#boardVignette)"/>
        <Rect x={PAD} y={PAD} width={600} height={600} fill="none" stroke={LINE_ON_WOOD} strokeOpacity={0.85} strokeWidth={4.2}/>
        <Rect x={PAD+100} y={PAD+100} width={400} height={400} fill="none" stroke={LINE_ON_WOOD} strokeOpacity={0.8} strokeWidth={3.4}/>
        <Rect x={PAD+200} y={PAD+200} width={200} height={200} fill="none" stroke={LINE_ON_WOOD} strokeOpacity={0.8} strokeWidth={3.4}/>
        <Line x1={PAD+300} y1={PAD} x2={PAD+300} y2={PAD+200} stroke={LINE_ON_WOOD} strokeOpacity={0.8} strokeWidth={3.4}/>
        <Line x1={PAD+300} y1={PAD+400} x2={PAD+300} y2={PAD+600} stroke={LINE_ON_WOOD} strokeOpacity={0.8} strokeWidth={3.4}/>
        <Line x1={PAD} y1={PAD+300} x2={PAD+200} y2={PAD+300} stroke={LINE_ON_WOOD} strokeOpacity={0.8} strokeWidth={3.4}/>
        <Line x1={PAD+400} y1={PAD+300} x2={PAD+600} y2={PAD+300} stroke={LINE_ON_WOOD} strokeOpacity={0.8} strokeWidth={3.4}/>
        {completedLines.map(line => { const a=BOARD_COORDINATES[line[0]], b=BOARD_COORDINATES[line[2]]; return <Line key={line.join()} x1={PAD+a[0]*100} y1={PAD+a[1]*100} x2={PAD+b[0]*100} y2={PAD+b[1]*100} stroke={T.mill} strokeWidth={10} opacity={.7}/>; })}
      </Svg>
      {POSITION_IDS.map(id => {
        const {x,y}=coordinate(id,size); const player=state.board[id]; const isLegal=legal.has(id); const isSelectable=selectable.has(id); const canCapture=capturable.has(id); const selected=state.selectedPosition===id;
        const label = `${id.toUpperCase()}, ${player ? `${state.settings.playerNames[player]} piece` : 'empty'}${isLegal?', legal destination':''}${canCapture?', can be captured':''}`;
        const invalid=invalidPosition===id;
        return <Pressable key={id} onPress={()=>onPositionPress(id)} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected,disabled:Boolean(state.result)}} hitSlop={2} style={[styles.target,{left:x-24,top:y-24}]}>
          <ShakeWrapper invalid={invalid} reducedMotion={reducedMotion}>
            {!player && <EmptyNode legal={isLegal} reducedMotion={reducedMotion}/>}
            {player&&!(moving&&state.lastMove?.to===id) && <Piece player={player} selected={selected} capturable={canCapture} capturing={capturingPosition===id} muted={(state.capturePending&&!canCapture&&!celebratedPositions.has(id))||(state.result?.type==='win'&&player!==state.result.winner)} millCelebration={celebratedPositions.has(id)&&!moving} winnerCelebration={state.result?.type==='win'&&player===state.result.winner} justPlaced={state.lastMove?.from===null&&state.lastMove.to===id} reducedMotion={reducedMotion} theme={state.settings.pieceTheme}/>}
            {isSelectable&&!selected&&!canCapture&&<View style={styles.selectableRing}/>}
            {invalid&&<View pointerEvents="none" style={styles.invalidRing}/>}
          </ShakeWrapper>
        </Pressable>;
      })}
      {moving&&state.lastMove?.from&&state.board[state.lastMove.to]&&<MovingPiece key={moveKey!} from={state.lastMove.from} to={state.lastMove.to} size={size} player={state.board[state.lastMove.to]!} reducedMotion={reducedMotion} theme={state.settings.pieceTheme} onDone={()=>setCompletedMoveKey(moveKey)}/>}
      {showMillLight&&completedLines.map(line => <MillLightTravel key={`${millKey}-${line.join()}`} from={line[0]} to={line[2]} size={size} color={T.mill} onDone={()=>setPlayedMillKey(millKey)}/>)}
      <RNAnimated.View pointerEvents="none" style={[styles.resultDim,{opacity:dimOpacity}]}/>
    </View>
  );
});

const styles=StyleSheet.create({
  board:{alignSelf:'center',borderRadius:28,borderWidth:1.5,borderColor:'rgba(140,95,58,.4)',overflow:'visible',shadowColor:'#000',shadowOffset:{width:0,height:12},shadowOpacity:.4,shadowRadius:20,elevation:10},
  boardSurface:{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:27,overflow:'hidden'},
  boardMaterial:{position:'absolute',left:0,right:0,top:0,bottom:0},
  /** Kept light on purpose — this used to sit at 58% opacity, which was the "black overlay" the
   * wood was disappearing under. It only needs to be dark enough for the ivory lines to read. */
  /** Cooler and slightly deeper than a flat warm brown — desaturates the wood's orange toward a
   * richer walnut/espresso tone rather than reading as pine, without going back to a heavy overlay. */
  boardOverlay:{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(9,10,14,.2)'},
  boardLight:{position:'absolute',left:10,right:10,top:9,height:'44%',borderRadius:22,backgroundColor:'rgba(255,255,255,.03)'},innerFrame:{position:'absolute',left:7,right:7,top:7,bottom:7,borderRadius:21,borderWidth:1,borderColor:'rgba(255,235,210,.08)'}, target:{position:'absolute',width:48,height:48,alignItems:'center',justifyContent:'center'},
  resultDim:{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:27,backgroundColor:'#000'},
  nodeWrap:{width:10,height:10,alignItems:'center',justifyContent:'center'},
  nodeRing:{position:'absolute',width:10,height:10,borderRadius:5,borderWidth:1,borderColor:NODE_RING_ON_WOOD},
  nodeRingLegal:{borderColor:'rgba(55,213,208,.4)',backgroundColor:'rgba(55,213,208,.05)'},
  nodeDot:{width:6,height:6,borderRadius:3,backgroundColor:NODE_DOT_ON_WOOD},
  nodeDotLegal:{backgroundColor:T.p1,shadowColor:T.p1,shadowOpacity:.35,shadowRadius:3},
  shadow:{width:40,height:40,borderRadius:20,shadowColor:'#000',shadowOffset:{width:0,height:7},shadowOpacity:.55,shadowRadius:7,elevation:7},muted:{opacity:.45},selectedShadow:{shadowOpacity:.78,shadowRadius:9,transform:[{scale:1.04},{translateY:-2}]}, capturable:{shadowColor:T.danger,shadowOpacity:.85,shadowRadius:9},
  selectedHalo:{position:'absolute',left:-6,top:-6,width:52,height:52,borderRadius:26,borderWidth:1},
  piece:{width:40,height:40,borderRadius:20,borderWidth:1.25,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  /** Two nested soft-edged ellipses fake a blurred specular highlight — a real lens blur isn't available without Skia. */
  pieceGlossOuter:{position:'absolute',top:5,left:6,width:16,height:11,borderRadius:8,backgroundColor:'rgba(255,255,255,.22)'},
  pieceGlossInner:{position:'absolute',top:6,left:8,width:8,height:5.5,borderRadius:4,backgroundColor:'rgba(255,255,255,.6)'},
  p1Mark:{width:10,height:10,borderRadius:5,borderWidth:2,borderColor:'#092226'}, p2Mark:{width:9,height:9,transform:[{rotate:'45deg'}],borderWidth:2,borderColor:'#361713'},
  selectableRing:{position:'absolute',width:47,height:47,borderRadius:24,borderWidth:1.5,borderColor:'rgba(255,255,255,.72)'},millBurst:{position:'absolute',left:-5,top:-5,width:50,height:50,borderRadius:25,borderWidth:2,backgroundColor:'rgba(255,255,255,.07)'},captureRing:{position:'absolute',left:-6,top:-6,width:52,height:52,borderRadius:26,borderWidth:2,borderColor:T.danger,backgroundColor:'rgba(255,92,101,.08)'},captureRingActive:{borderWidth:3},invalidRing:{position:'absolute',width:52,height:52,borderRadius:26,borderWidth:2,borderColor:T.danger,backgroundColor:'rgba(255,92,101,.09)'},sparks:{position:'absolute',left:16,top:16,width:6,height:6,alignItems:'center',justifyContent:'center'},spark:{position:'absolute',width:4,height:4,borderRadius:2,backgroundColor:'#FFB1A6'},
  moving:{position:'absolute',width:40,height:40,zIndex:20},
  millLight:{position:'absolute',width:10,height:10,borderRadius:5,shadowOpacity:.95,shadowRadius:8,zIndex:25},
});
