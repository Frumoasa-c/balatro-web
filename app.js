/* A standalone, browser-first rules prototype inspired by the GBA project's round/hand structure. */
const SUITS = [{symbol:'♠', name:'黑桃', red:false}, {symbol:'♥', name:'红桃', red:true}, {symbol:'♣', name:'梅花', red:false}, {symbol:'♦', name:'方块', red:true}];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VALUE = Object.fromEntries(RANKS.map((rank, i) => [rank, i + 2]));
const HANDS = [
  {name:'高牌', chips:5, mult:1}, {name:'对子', chips:10, mult:2}, {name:'两对', chips:20, mult:2},
  {name:'三条', chips:30, mult:3}, {name:'顺子', chips:30, mult:4}, {name:'同花', chips:35, mult:4},
  {name:'葫芦', chips:40, mult:4}, {name:'四条', chips:60, mult:7}, {name:'同花顺', chips:100, mult:8}
];
const JOKERS = [
  {id:'joker', name:'小丑', text:'+4 倍率', cost:4, apply: c => c.mult += 4},
  {id:'greedy', name:'贪婪小丑', text:'每张方块 +3 倍率', cost:5, apply: c => c.mult += c.cards.filter(x=>x.suit===3).length*3},
  {id:'lusty', name:'好色小丑', text:'每张红桃 +3 倍率', cost:5, apply: c => c.mult += c.cards.filter(x=>x.suit===1).length*3},
  {id:'wrathful', name:'愤怒小丑', text:'每张黑桃 +3 倍率', cost:5, apply: c => c.mult += c.cards.filter(x=>x.suit===0).length*3},
  {id:'gluttonous', name:'暴食小丑', text:'每张梅花 +3 倍率', cost:5, apply: c => c.mult += c.cards.filter(x=>x.suit===2).length*3},
  {id:'jolly', name:'欢乐小丑', text:'打出对子时 +8 倍率', cost:5, apply: c => {if(c.hand.name==='对子') c.mult+=8}},
  {id:'zany', name:'疯狂小丑', text:'打出三条时 +12 倍率', cost:5, apply: c => {if(c.hand.name==='三条') c.mult+=12}},
  {id:'sly', name:'狡猾小丑', text:'打出对子时 +50 筹码', cost:5, apply: c => {if(c.hand.name==='对子') c.chips+=50}},
  {id:'raised', name:'举拳小丑', text:'每张打出的牌 +4 筹码', cost:5, apply: c => c.chips += c.cards.length*4},
  {id:'banner', name:'旗帜', text:'每次剩余弃牌 +30 筹码', cost:5, apply: c => c.chips += c.discards*30}
];
let state;
const $ = s => document.querySelector(s);
const clone = value => JSON.parse(JSON.stringify(value));
function makeDeck(){ return SUITS.flatMap((_,s)=>RANKS.map(rank=>({rank,suit:s,id:`${rank}-${s}`}))); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; }
function newRun(){ state={ante:1, stage:0, money:4, deck:shuffle(makeDeck()), discard:[], hand:[], selected:[], jokers:[], hands:4, discards:3, score:0, target:300, status:'选牌后打出。', screen:'round', shop:[]}; drawTo(8); save(); render(); }
function drawTo(n){ while(state.hand.length<n){ if(!state.deck.length){state.deck=shuffle(state.discard);state.discard=[];} const card=state.deck.pop(); if(!card)break; state.hand.push(card); } sortHandDescending(); }
function getHand(cards){
  const values=cards.map(c=>RANK_VALUE[c.rank]).sort((a,b)=>a-b), counts={}; cards.forEach(c=>counts[c.rank]=(counts[c.rank]||0)+1);
  const groups=Object.values(counts).sort((a,b)=>b-a), flush=cards.length===5&&cards.every(c=>c.suit===cards[0].suit);
  const unique=[...new Set(values)]; const straight=cards.length===5&&unique.length===5&&((unique[4]-unique[0]===4)||JSON.stringify(unique)==='[2,3,4,5,14]');
  if(flush&&straight)return HANDS[8]; if(groups[0]===4)return HANDS[7]; if(groups[0]===3&&groups[1]===2)return HANDS[6]; if(flush)return HANDS[5]; if(straight)return HANDS[4]; if(groups[0]===3)return HANDS[3]; if(groups[0]===2&&groups[1]===2)return HANDS[2]; if(groups[0]===2)return HANDS[1]; return HANDS[0];
}
function preview(){ const cards=state.hand.filter(c=>state.selected.includes(c.id)); if(!cards.length)return null; const hand=getHand(cards), context={cards,hand,chips:hand.chips+cards.reduce((n,c)=>n+Math.min(10,RANK_VALUE[c.rank]),0),mult:hand.mult,discards:state.discards}; state.jokers.forEach(id=>JOKERS.find(j=>j.id===id).apply(context)); return {...context,total:context.chips*context.mult}; }
function toggle(id){ if(state.screen!=='round')return; if(state.selected.includes(id))state.selected=state.selected.filter(x=>x!==id); else if(state.selected.length<5)state.selected.push(id); else {state.status='最多选择 5 张牌。';} save();render(); }
function play(){ const p=preview(); if(!p||!state.hands)return; state.hands--; state.score+=p.total; const played=state.hand.filter(c=>state.selected.includes(c.id)); state.hand=state.hand.filter(c=>!state.selected.includes(c.id)); state.discard.push(...played); state.selected=[]; state.status=`${p.hand.name}：${p.chips} 筹码 × ${p.mult} 倍率 = +${p.total}`; drawTo(8); if(state.score>=state.target){winBlind();save();render();return;} if(!state.hands){state.screen='lost';state.status='盲注未完成。';} save();render(); }
function discard(){ if(!state.selected.length||!state.discards)return; state.discards--; const thrown=state.hand.filter(c=>state.selected.includes(c.id)); state.hand=state.hand.filter(c=>!state.selected.includes(c.id)); state.discard.push(...thrown); state.selected=[]; drawTo(8); state.status='已弃牌并补回手牌。'; save();render(); }
function winBlind(){ const reward=state.stage===2?5:3; state.money+=reward+Math.min(5,Math.floor(state.money/5)); state.status=`盲注完成！获得 $${reward} 和利息。`; state.screen=state.stage===2?'shop':'next'; state.shop=rollShop(); }
function rollShop(){ return shuffle([...JOKERS]).slice(0,2).map(j=>j.id); }
function nextBlind(){ state.stage++; if(state.stage>2){state.ante++;state.stage=0;} const scale=[300,450,600][state.stage]*Math.pow(2,state.ante-1); Object.assign(state,{hands:4,discards:3,score:0,target:scale,screen:'round',status:`底注 ${state.ante}：新的盲注。`}); drawTo(8);save();render(); }
function openShop(){state.screen='shop';save();render();} function buy(id){const j=JOKERS.find(x=>x.id===id);if(state.money<j.cost){state.status='钱不够。';return render()}if(state.jokers.length>=5){state.status='小丑栏已满。';return render()}state.money-=j.cost;state.jokers.push(id);state.shop=state.shop.filter(x=>x!==id);state.status=`获得 ${j.name}。`;save();render();}
function reroll(){if(state.money<5){state.status='钱不够重掷。';return render()}state.money-=5;state.shop=rollShop();save();render()} function reset(){localStorage.removeItem('balatro-web-demo');newRun();}
function cardMarkup(c){const suit=SUITS[c.suit];return `<button class="card ${suit.red?'red':''} ${state.selected.includes(c.id)?'selected':''}" onclick="toggle('${c.id}')" aria-label="${c.rank}${suit.name}"><span class="rank">${c.rank}</span><span class="suit">${suit.symbol}</span><span class="corner">${c.rank}${suit.symbol}</span></button>`;}
function round(){const p=preview();return `<div class="game"><div class="topbar"><h1>BALATRO · WEB</h1><button class="action" onclick="reset()">重新开始</button></div><section class="board"><div class="stats"><div class="stat">底注<b>${state.ante}-${['小盲注','大盲注','Boss'][state.stage]}</b></div><div class="stat">目标<b>${state.target}</b></div><div class="stat">本轮分数<b>${state.score}</b></div><div class="stat">手数<b>${state.hands}</b></div><div class="stat">弃牌<b>${state.discards}</b></div></div><div class="play-area"><div class="score-zone"><div><div class="subtle">当前牌型</div><div class="hand-name">${p?p.hand.name:'未选择'}</div></div><div class="formula">${p?`${p.chips} × ${p.mult} = ${p.total}`:'—'}<small>基础筹码 + 牌面筹码，随后结算小丑</small></div></div><div><div class="subtle">小丑牌（从左到右结算）</div><div class="joker-row">${state.jokers.length?state.jokers.map(id=>{const j=JOKERS.find(x=>x.id===id);return `<div class="joker"><b>${j.name}</b>${j.text}</div>`}).join(''):'<span class="subtle">暂无小丑；通过盲注后可在商店购买。</span>'}</div></div><div><div class="subtle">手牌 · 可选最多五张</div><div class="cards">${state.hand.map(cardMarkup).join('')}</div></div><div class="message">${state.status}</div><div class="actions"><button class="action play" ${!p||!state.hands?'disabled':''} onclick="play()">打出手牌</button><button class="action discard" ${!state.selected.length||!state.discards?'disabled':''} onclick="discard()">弃牌</button><button class="action" onclick="sortHand()">按点数排序</button></div></div></section></div>`;}
function modal(title,body,buttons){return `<div class="modal-wrap"><section class="modal"><h1>BALATRO · WEB</h1><h2>${title}</h2>${body}<div class="actions">${buttons}</div><div class="legend">这是独立的浏览器规则原型：可完成整轮盲注、购买小丑并持续推进底注。存档自动保存在当前浏览器。</div></section></div>`;}
function render(){if(!state){return newRun()}if(state.screen==='round')$('#app').innerHTML=round();else if(state.screen==='next')$('#app').innerHTML=modal('盲注完成',`<p>${state.status}<br>现金：<b>$${state.money}</b></p>`,`<button class="action play" onclick="openShop()">进入商店</button><button class="action" onclick="nextBlind()">跳过商店</button>`);else if(state.screen==='shop')$('#app').innerHTML=modal('商店',`<p>现金：<b>$${state.money}</b>　最多持有 5 张小丑</p><div class="shop-items">${state.shop.map(id=>{const j=JOKERS.find(x=>x.id===id);return `<article class="shop-item"><h3>${j.name}</h3><p>${j.text}</p><button class="action" onclick="buy('${id}')">购买 $${j.cost}</button></article>`}).join('')||'<p>商品已售罄。</p>'}</div>`,`<button class="action" onclick="reroll()">重掷 $5</button><button class="action play" onclick="nextBlind()">下一个盲注</button>`);else $('#app').innerHTML=modal('本局结束',`<p>未能达到 ${state.target} 分。<br>最终到达：底注 ${state.ante}</p>`,`<button class="action play" onclick="reset()">再来一局</button>`);}
function sortHandDescending(){state.hand.sort((a,b)=>RANK_VALUE[b.rank]-RANK_VALUE[a.rank]||b.suit-a.suit);}
function sortHand(){sortHandDescending();save();render();} function save(){localStorage.setItem('balatro-web-demo',JSON.stringify(state));}
try{state=JSON.parse(localStorage.getItem('balatro-web-demo'))}catch{state=null} render();
