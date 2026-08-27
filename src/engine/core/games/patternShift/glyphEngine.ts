import type { GlyphArc, GlyphEdge, GlyphFamily, GlyphNode, MutationStrength, PatternDefinition, Vec2 } from './types';

const FAMILY_PLAN:GlyphFamily[]=['network','network','circuit','network','orbital','network','circuit','network','orbital','circuit','network','orbital','network'];
const q=(n:number)=>Math.round(n*1000)/1000;
const angle=(n:number)=>q(((n%(Math.PI*2))+Math.PI*2)%(Math.PI*2));
const rng=(seed:number)=>{let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)|0;let v=Math.imul(s^(s>>>15),1|s);v^=v+Math.imul(v^(v>>>7),61|v);return((v^(v>>>14))>>>0)/4294967296;};};
const clone=(g:PatternDefinition):PatternDefinition=>({...g,nodes:g.nodes.map(n=>({...n})),edges:g.edges.map(e=>({...e})),arcs:g.arcs.map(a=>({...a,center:{...a.center}}))});

export function unlockedGlyphFamilies(_level:number):GlyphFamily[]{return['network','orbital','circuit'];}
export function familyForRound(seed:number,index:number,_level:number):GlyphFamily{return FAMILY_PLAN[(index+(seed%3===0?2:0))%FAMILY_PLAN.length];}

const kinds=(count:number,seed:number,hubIndex?:number):GlyphNode['kind'][]=>Array.from({length:count},(_,i)=>i===hubIndex?'hub':((seed+i*3)%5===0?'diamond':(seed+i)%3===0?'ring':i===count-1?'terminal':'filled'));
const makeNodes=(positions:Vec2[],seed:number,hubIndex?:number):GlyphNode[]=>{const r=rng(seed),nodeKinds=kinds(positions.length,seed,hubIndex);return positions.map((p,i)=>({id:`n${i}`,x:q(p.x+(r()-.5)*.018),y:q(p.y+(r()-.5)*.018),kind:nodeKinds[i],salient:i===positions.length-1||i===hubIndex}));};
const edge=(id:string,from:number,to:number,kind:GlyphEdge['kind']='straight',salient=false):GlyphEdge=>({id,from:`n${from}`,to:`n${to}`,kind,salient});

function network(seed:number,complexity:number):PatternDefinition{
  const variant=seed%3,count=Math.min(7,Math.max(4,3+Math.ceil(complexity/2)));let positions:Vec2[],edges:GlyphEdge[],hub=1;
  if(variant===0){positions=[{x:.5,y:.5},{x:.5,y:.24},{x:.23,y:.5},{x:.77,y:.5},{x:.36,y:.76},{x:.75,y:.76},{x:.24,y:.25}];hub=0;edges=[edge('e0',0,1),edge('e1',0,2),edge('e2',0,3),edge('e3',0,4,'curved',true),edge('e4',3,5),edge('e5',2,6)];}
  else if(variant===1){positions=[{x:.2,y:.3},{x:.45,y:.3},{x:.45,y:.55},{x:.72,y:.55},{x:.45,y:.8},{x:.76,y:.26},{x:.2,y:.72}];hub=2;edges=[edge('e0',0,1),edge('e1',1,2),edge('e2',2,3),edge('e3',2,4),edge('e4',1,5,'curved',true),edge('e5',4,6)];}
  else{positions=[{x:.25,y:.25},{x:.5,y:.42},{x:.76,y:.25},{x:.5,y:.68},{x:.22,y:.73},{x:.78,y:.72},{x:.5,y:.15}];hub=1;edges=[edge('e0',0,1),edge('e1',1,2),edge('e2',1,3,'curved'),edge('e3',3,4),edge('e4',3,5,'straight',true),edge('e5',1,6)];}
  const nodes=makeNodes(positions.slice(0,count),seed,hub);const ids=new Set(nodes.map(n=>n.id));return normalizeGlyph({id:`p-${seed}-network`,seed,family:'network',nodes,edges:edges.filter(e=>ids.has(e.from)&&ids.has(e.to)),arcs:[],rotation:0,mirrorX:false,mirrorY:false,complexity});
}

function orbital(seed:number,complexity:number):PatternDefinition{
  const r=rng(seed),satellites=Math.min(5,Math.max(3,2+Math.ceil(complexity/2))),ringCount=Math.min(3,1+Math.floor(complexity/3));
  const nodes:GlyphNode[]=[{id:'n0',x:.5,y:.5,kind:'hub',salient:true}],edges:GlyphEdge[]=[],arcs:GlyphArc[]=[];
  for(let i=0;i<ringCount;i++){const radius=.21+i*.115,start=r()*Math.PI*2,sweep=Math.PI*(1.3+r()*.42);arcs.push({id:`a${i}`,center:{x:.5,y:.5},radius,startAngle:q(start),sweepAngle:q(sweep),ring:(i+1) as 1|2|3,salient:i===ringCount-1});}
  for(let i=0;i<satellites;i++){const a=(Math.PI*2*i/satellites)+r()*.22,ring=i%ringCount,radius=.21+ring*.115;nodes.push({id:`n${i+1}`,x:q(.5+Math.cos(a)*radius),y:q(.5+Math.sin(a)*radius),kind:i===satellites-1?'diamond':i%2?'ring':'filled',salient:i===satellites-1});edges.push({id:`e${i}`,from:'n0',to:`n${i+1}`,kind:'straight',salient:i===satellites-1});}
  return normalizeGlyph({id:`p-${seed}-orbital`,seed,family:'orbital',nodes,edges,arcs,rotation:0,mirrorX:false,mirrorY:false,complexity});
}

function circuit(seed:number,complexity:number):PatternDefinition{
  const variant=seed%3,count=Math.min(7,Math.max(4,3+Math.ceil(complexity/2)));let positions:Vec2[],pairs:[number,number][];
  if(variant===0){positions=[{x:.18,y:.24},{x:.48,y:.24},{x:.48,y:.5},{x:.77,y:.5},{x:.48,y:.77},{x:.18,y:.77},{x:.78,y:.25}];pairs=[[0,1],[1,2],[2,3],[2,4],[4,5],[1,6]];}
  else if(variant===1){positions=[{x:.2,y:.3},{x:.4,y:.3},{x:.4,y:.62},{x:.68,y:.62},{x:.68,y:.82},{x:.82,y:.3},{x:.2,y:.78}];pairs=[[0,1],[1,2],[2,3],[3,4],[1,5],[2,6]];}
  else{positions=[{x:.2,y:.2},{x:.2,y:.5},{x:.46,y:.5},{x:.46,y:.76},{x:.78,y:.76},{x:.78,y:.28},{x:.48,y:.28}];pairs=[[0,1],[1,2],[2,3],[3,4],[2,6],[6,5]];}
  const nodes=makeNodes(positions.slice(0,count),seed);nodes.forEach((n,i)=>{if(i>0&&i<count-1)n.kind='junction';});const ids=new Set(nodes.map(n=>n.id));const edges=pairs.map(([a,b],i)=>edge(`e${i}`,a,b,'orthogonal',i===pairs.length-1)).filter(e=>ids.has(e.from)&&ids.has(e.to));
  return normalizeGlyph({id:`p-${seed}-circuit`,seed,family:'circuit',nodes,edges,arcs:[],rotation:0,mirrorX:false,mirrorY:false,complexity});
}

const GENERATORS:Record<GlyphFamily,(seed:number,complexity:number)=>PatternDefinition>={network,orbital,circuit};
export function generateGlyph(seed:number,complexity:number,family:GlyphFamily):PatternDefinition{for(let attempt=0;attempt<12;attempt++){const glyph=GENERATORS[family](seed+attempt*7919,complexity);if(validateStructuralGlyph(glyph).valid)return{...glyph,id:`p-${seed}-${family}`,seed};}throw new Error(`Unable to generate valid ${family} glyph for seed ${seed}`);}

export type GlyphBounds={minX:number;minY:number;maxX:number;maxY:number;width:number;height:number;occupancy:number};
export function glyphBounds(g:PatternDefinition):GlyphBounds{let minX=1,minY=1,maxX=0,maxY=0;for(const n of g.nodes){minX=Math.min(minX,n.x);maxX=Math.max(maxX,n.x);minY=Math.min(minY,n.y);maxY=Math.max(maxY,n.y);}for(const a of g.arcs){minX=Math.min(minX,a.center.x-a.radius);maxX=Math.max(maxX,a.center.x+a.radius);minY=Math.min(minY,a.center.y-a.radius);maxY=Math.max(maxY,a.center.y+a.radius);}const width=maxX-minX,height=maxY-minY;return{minX,minY,maxX,maxY,width,height,occupancy:Math.max(width,height)};}
export function normalizeGlyph(g:PatternDefinition,target=.74):PatternDefinition{const b=glyphBounds(g);if(!b.occupancy)return g;const scale=target/b.occupancy,cx=(b.minX+b.maxX)/2,cy=(b.minY+b.maxY)/2,map=(v:Vec2)=>({x:q(.5+(v.x-cx)*scale),y:q(.5+(v.y-cy)*scale)});return{...g,nodes:g.nodes.map(n=>({...n,...map(n)})),arcs:g.arcs.map(a=>({...a,center:map(a.center),radius:q(a.radius*scale)}))};}

function pairKey(a:string,b:string){return[a,b].sort().join('~');}
export function isConnected(g:PatternDefinition):boolean{if(!g.nodes.length)return false;const seen=new Set([g.nodes[0].id]),queue=[g.nodes[0].id];while(queue.length){const id=queue.shift()!;for(const e of g.edges){const next=e.from===id?e.to:e.to===id?e.from:undefined;if(next&&!seen.has(next)){seen.add(next);queue.push(next);}}}return seen.size===g.nodes.length;}
type Segment={a:Vec2;b:Vec2;edge:GlyphEdge};
function edgeSegments(g:PatternDefinition,e:GlyphEdge):Segment[]{const from=g.nodes.find(n=>n.id===e.from),to=g.nodes.find(n=>n.id===e.to);if(!from||!to||e.kind==='curved')return[];if(e.kind==='straight')return[{a:from,b:to,edge:e}];const horizontalFirst=Math.abs(to.x-from.x)>=Math.abs(to.y-from.y),bend=horizontalFirst?{x:to.x,y:from.y}:{x:from.x,y:to.y};return[{a:from,b:bend,edge:e},{a:bend,b:to,edge:e}];}
function pointSegmentDistance(p:Vec2,s:Segment):number{const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(p.x-s.a.x,p.y-s.a.y);const t=Math.max(0,Math.min(1,((p.x-s.a.x)*dx+(p.y-s.a.y)*dy)/l2));return Math.hypot(p.x-(s.a.x+t*dx),p.y-(s.a.y+t*dy));}
function intersects(a:Segment,b:Segment):boolean{const cross=(p:Vec2,q:Vec2,r:Vec2)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x),d1=cross(a.a,a.b,b.a),d2=cross(a.a,a.b,b.b),d3=cross(b.a,b.b,a.a),d4=cross(b.a,b.b,a.b);return d1*d2<-.00001&&d3*d4<-.00001;}
export function validateStructuralGlyph(g:PatternDefinition):{valid:boolean;reasons:string[]}{const reasons:string[]=[],ids=new Set(g.nodes.map(n=>n.id));if(g.nodes.length<4)reasons.push('too-few-nodes');if(g.edges.length<3)reasons.push('too-few-edges');if(g.edges.some(e=>!ids.has(e.from)||!ids.has(e.to)||e.from===e.to))reasons.push('invalid-edge-reference');if(new Set(g.edges.map(e=>pairKey(e.from,e.to))).size!==g.edges.length)reasons.push('duplicate-edge');if(!isConnected(g))reasons.push('disconnected');for(let i=0;i<g.nodes.length;i++)for(let j=i+1;j<g.nodes.length;j++)if(Math.hypot(g.nodes[i].x-g.nodes[j].x,g.nodes[i].y-g.nodes[j].y)<.1)reasons.push('nodes-too-close');const segments=g.edges.flatMap(e=>edgeSegments(g,e));for(const segment of segments)for(const node of g.nodes)if(node.id!==segment.edge.from&&node.id!==segment.edge.to&&pointSegmentDistance(node,segment)<.035)reasons.push('edge-through-node');let crossings=0;for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++)if(![segments[i].edge.from,segments[i].edge.to].some(id=>id===segments[j].edge.from||id===segments[j].edge.to)&&intersects(segments[i],segments[j]))crossings++;if(crossings>1)reasons.push('excessive-crossings');const b=glyphBounds(g);if(b.occupancy<.67||b.occupancy>.8)reasons.push('poor-occupancy');if(g.nodes.some(n=>n.x<.08||n.x>.92||n.y<.08||n.y>.92))reasons.push('out-of-bounds');return{valid:reasons.length===0,reasons:[...new Set(reasons)]};}

export function strengthForTier(tier:number):MutationStrength{return tier<=2?'obvious':tier<=4?'moderate':tier<=7?'subtle':'precision';}
function terminalNode(g:PatternDefinition,index:number):GlyphNode{const degrees=new Map(g.nodes.map(n=>[n.id,0]));g.edges.forEach(e=>{degrees.set(e.from,(degrees.get(e.from)??0)+1);degrees.set(e.to,(degrees.get(e.to)??0)+1);});const terminals=g.nodes.filter(n=>degrees.get(n.id)===1&&n.kind!=='hub');return terminals[index%Math.max(1,terminals.length)]??g.nodes.at(-1)!;}
function alternateParent(g:PatternDefinition,node:GlyphNode,current:string,index:number):GlyphNode{const options=g.nodes.filter(n=>n.id!==node.id&&n.id!==current).sort((a,b)=>Math.hypot(a.x-node.x,a.y-node.y)-Math.hypot(b.x-node.x,b.y-node.y));return options[index%options.length];}
export function mutateGlyph(source:PatternDefinition,seed:number,strength:MutationStrength,index:number):PatternDefinition{const g=clone(source),terminal=terminalNode(g,index),edgeToTerminal=g.edges.find(e=>e.from===terminal.id||e.to===terminal.id),mode=index%5;let description='One relationship changed',affected=[terminal.id];
  if(mode===0&&edgeToTerminal){const current=edgeToTerminal.from===terminal.id?edgeToTerminal.to:edgeToTerminal.from,next=alternateParent(g,terminal,current,index);if(edgeToTerminal.from===terminal.id)edgeToTerminal.to=next.id;else edgeToTerminal.from=next.id;description='Branch connected to a different node';affected=[edgeToTerminal.id,terminal.id,next.id];}
  else if(mode===1){terminal.kind=terminal.kind==='filled'?'ring':terminal.kind==='ring'?'diamond':'filled';description='Terminal type changed';}
  else if(mode===2&&edgeToTerminal){g.nodes=g.nodes.filter(n=>n.id!==terminal.id);g.edges=g.edges.filter(e=>e.id!==edgeToTerminal.id);description='A complete branch disappeared';affected=[edgeToTerminal.id,terminal.id];}
  else if(mode===3){const magnitude=strength==='obvious'?.18:strength==='moderate'?.12:.08;terminal.x=q(1-terminal.x);terminal.y=q(Math.max(.1,Math.min(.9,terminal.y+(index%2?magnitude:-magnitude))));description='A connected node moved';}
  else if(g.family==='orbital'&&g.arcs.length){const arc=g.arcs[index%g.arcs.length],shift=strength==='obvious'?Math.PI/2:strength==='moderate'?Math.PI/3:Math.PI/5;arc.startAngle=angle(arc.startAngle+shift);description='The ring gap moved';affected=[arc.id];}
  else if(edgeToTerminal){edgeToTerminal.kind=edgeToTerminal.kind==='straight'?'curved':edgeToTerminal.kind==='curved'?'straight':'curved';description='The path direction changed';affected=[edgeToTerminal.id];}
  const normalized=normalizeGlyph({...g,id:`${source.id}-d${index}`,seed:seed+index,mutation:{kind:`structural-${mode}`,description,affectedIds:affected}});
  if(validateStructuralGlyph(normalized).valid)return normalized;
  const fallback=clone(source),fallbackNode=terminalNode(fallback,index);fallbackNode.kind=fallbackNode.kind==='filled'?'ring':fallbackNode.kind==='ring'?'diamond':'filled';return{...fallback,id:`${source.id}-d${index}`,seed:seed+index,mutation:{kind:'terminal-type',description:'Terminal type changed',affectedIds:[fallbackNode.id]}};
}

function semanticParts(g:PatternDefinition):string[]{return[...g.nodes.map(n=>`${n.id}:${q(n.x)},${q(n.y)}:${n.kind}`),...g.edges.map(e=>`${e.id}:${pairKey(e.from,e.to)}:${e.kind}`),...g.arcs.map(a=>`${a.id}:${q(a.center.x)},${q(a.center.y)},${q(a.radius)},${q(a.startAngle)},${q(a.sweepAngle)}`)];}
export function glyphSignature(g:PatternDefinition):string{return`${g.family}|${semanticParts(g).join('|')}`;}
export function structuralDifference(a:PatternDefinition,b:PatternDefinition):number{let score=Math.abs(a.nodes.length-b.nodes.length)*.35+Math.abs(a.edges.length-b.edges.length)*.4+Math.abs(a.arcs.length-b.arcs.length)*.3;for(const n of a.nodes){const other=b.nodes.find(x=>x.id===n.id);if(!other){score+=.4;continue;}if(n.kind!==other.kind)score+=.3;score+=Math.min(.35,Math.hypot(n.x-other.x,n.y-other.y)*3);}for(const e of a.edges){const other=b.edges.find(x=>x.id===e.id);if(!other)score+=.4;else{if(pairKey(e.from,e.to)!==pairKey(other.from,other.to))score+=.45;if(e.kind!==other.kind)score+=.22;}}for(const arc of a.arcs){const other=b.arcs.find(x=>x.id===arc.id);if(!other)score+=.3;else score+=Math.min(.4,Math.abs(arc.startAngle-other.startAngle)/Math.PI*.9+Math.abs(arc.sweepAngle-other.sweepAngle)/Math.PI*.5);}return q(score);}
export function glyphInBounds(g:PatternDefinition):boolean{return validateStructuralGlyph(g).valid;}
export function validateCandidateSet(answer:PatternDefinition,candidates:PatternDefinition[],minimum=.18):boolean{const signatures=candidates.map(glyphSignature);return candidates.filter(c=>c.id===answer.id).length===1&&new Set(signatures).size===candidates.length&&candidates.every(c=>validateStructuralGlyph(c).valid)&&candidates.filter(c=>c.id!==answer.id).every(c=>structuralDifference(answer,c)>=minimum);}

const transformPoint=(v:Vec2,mirror:boolean,rotation:number):Vec2=>{let x=mirror?1-v.x:v.x,y=v.y;if(rotation){const dx=x-.5,dy=y-.5,c=Math.cos(rotation),s=Math.sin(rotation);x=.5+dx*c-dy*s;y=.5+dx*s+dy*c;}return{x:q(x),y:q(y)};};
export function transformGlyph(source:PatternDefinition,kind:'mirror'|'rotation'|'missing',id=`${source.id}-${kind}`):PatternDefinition{if(kind==='missing'){const g=clone(source),node=terminalNode(g,0);g.nodes=g.nodes.filter(n=>n.id!==node.id);g.edges=g.edges.filter(e=>e.from!==node.id&&e.to!==node.id);return normalizeGlyph({...g,id,mutation:{kind:'missing-branch',description:'A complete branch disappeared',affectedIds:[node.id]}});}const mirror=kind==='mirror',rotation=kind==='rotation'?Math.PI/2:0,g=clone(source);g.nodes=g.nodes.map(n=>({...n,...transformPoint(n,mirror,rotation)}));g.arcs=g.arcs.map(a=>({...a,center:transformPoint(a.center,mirror,rotation),startAngle:angle(mirror?Math.PI-a.startAngle:a.startAngle+rotation),sweepAngle:mirror?-a.sweepAngle:a.sweepAngle}));return{...g,id,mutation:{kind,description:mirror?'Structure mirrored horizontally':'Structure rotated 90°',affectedIds:g.nodes.map(n=>n.id)}};}
