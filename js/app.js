const TYPE_PT={normal:'Normal',fire:'Fogo',water:'Água',electric:'Elétrico',grass:'Planta',ice:'Gelo',fighting:'Lutador',poison:'Veneno',ground:'Terra',flying:'Voador',psychic:'Psíquico',bug:'Inseto',rock:'Pedra',ghost:'Fantasma',dragon:'Dragão',steel:'Aço',dark:'Sombrio',fairy:'Fada'};
const TYPE_COLOR={normal:'#a8a77a',fire:'#ee8130',water:'#6390f0',electric:'#f7d02c',grass:'#7ac74c',ice:'#96d9d6',fighting:'#c22e28',poison:'#a33ea1',ground:'#e2bf65',flying:'#a98ff3',psychic:'#f95587',bug:'#a6b91a',rock:'#b6a136',ghost:'#735797',dragon:'#6f35fc',steel:'#b7b7ce',dark:'#705746',fairy:'#d685ad'};
const STAT_PT=['HP','Ataque','Defesa','Atq. Esp.','Def. Esp.','Velocidade'];
const HABITAT_PT={cave:'Caverna','forest':'Floresta',grassland:'Campo','mountain':'Montanha','rare':'Raro','rough-terrain':'Terreno acidentado','sea':'Mar','urban':'Urbano','waters-edge':'Beira d\'água'};
const IMG='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const PER_PAGE=24;
const state={mode:'catalog',query:'',type:'',desc:false,page:1,list:[],id:null,cur:1,tab:'info',shiny:false,compare:[]};
const $=selector=>document.querySelector(selector);
const view=$('#view');
const pad=n=>'#'+String(n).padStart(3,'0');
const ico=name=>`<svg class="ic"><use href="#i-${name}"/></svg>`;
const pretty=s=>s.charAt(0).toUpperCase()+s.slice(1).replace(/-/g,' ');
const art=(id,shiny)=>`${IMG}other/official-artwork/${shiny?'shiny/':''}${id}.png`;
const badge=t=>`<span class="tp" style="background:${TYPE_COLOR[t]}">${TYPE_PT[t]||t}</span>`;
const has=(key,id)=>Store.get(key,[]).includes(id);
const toggle=(key,id)=>{const list=Store.get(key,[]);const i=list.indexOf(id);i<0?list.push(id):list.splice(i,1);Store.set(key,list);return i<0};
const beep=(freq=660)=>{
if(Store.get('mute',false))return;
try{const ctx=beep.ctx||(beep.ctx=new AudioContext());const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='square';osc.frequency.value=freq;gain.gain.value=.04;osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.08)}catch(e){}
};
const errorBox=()=>{view.innerHTML='<div class="msg">Não foi possível conectar à PokéAPI. Verifique sua internet e <button data-act="reload">tente novamente</button>.</div>'};
const skeleton=(n=12)=>'<div class="grid">'+'<div class="card sk"></div>'.repeat(n)+'</div>';
const filtered=()=>{
const q=state.query.trim().toLowerCase().replace('#','');
const list=state.list.filter(p=>
(!q||(/^\d+$/.test(q)?p.id===+q:p.name.includes(q)))&&
(!state.type||p.types.includes(state.type))&&
(state.mode!=='favs'||has('fav',p.id))&&
(state.mode!=='caught'||has('caught',p.id)));
return state.desc?list.reverse():list;
};
const card=p=>`<article class="card" data-act="open" data-id="${p.id}" tabindex="0">
<div class="flags"><span>${has('fav',p.id)?`<em class="gold">${ico('star')}</em>`:''}</span><span>${has('shiny',p.id)?`<em class="gold">${ico('spark')}</em>`:''}</span><span>${has('caught',p.id)?ico('ball'):''}</span></div>
<img loading="lazy" src="${IMG}${p.id}.png" alt="${p.name}">
<small>${pad(p.id)}</small><h3>${pretty(p.name)}</h3><div>${p.types.map(badge).join('')}</div></article>`;
const renderList=()=>{
$('#tools').style.display='flex';
const list=filtered();
const pages=Math.max(1,Math.ceil(list.length/PER_PAGE));
state.page=Math.min(state.page,pages);
const slice=list.slice((state.page-1)*PER_PAGE,state.page*PER_PAGE);
const total=Store.get('caught',[]).length;
const head=state.mode==='caught'?`<div class="prog"><b>${total}/151 capturados · ${(total/151*100).toFixed(1)}%</b><div class="bar"><span style="width:${total/151*100}%"></span></div></div>`:'';
view.innerHTML=head+(slice.length?`<div class="grid">${slice.map(card).join('')}</div>`:'<div class="msg">Nenhum Pokémon encontrado.</div>')+
`<div class="pager"><button data-act="page" data-d="-1" ${state.page<=1?'disabled':''}>◀</button><span>${state.page} / ${pages}</span><button data-act="page" data-d="1" ${state.page>=pages?'disabled':''}>▶</button></div>`;
};
const statBars=(stats,other)=>stats.map((v,i)=>`<div class="st"><span>${STAT_PT[i]}</span><div class="bar"><span style="--w:${Math.min(v/180*100,100)}%"></span></div><b class="${other&&v>other[i]?'win':''}">${v}</b></div>`).join('')+`<div class="st"><span>Total</span><div></div><b>${stats.reduce((a,b)=>a+b,0)}</b></div>`;
const evoNode=node=>`<div class="evo"><div class="en" data-act="open" data-id="${node.id}" tabindex="0"><img loading="lazy" src="${IMG}${node.id}.png" alt=""><small>${pad(node.id)}</small><b>${pretty(node.name)}</b></div>${node.kids.length?`<div class="kids">${node.kids.map(k=>`<div class="kid"><span class="arrow">➜<small>${k.method||'—'}</small></span>${evoNode(k)}</div>`).join('')}</div>`:''}</div>`;
const tabInfo=(p,s)=>`<div class="two"><div>
<p class="muted">${s.genus}</p>
<dl><dt>Altura</dt><dd>${p.height} m</dd><dt>Peso</dt><dd>${p.weight} kg</dd><dt>Exp. base</dt><dd>${p.xp}</dd><dt>Habitat</dt><dd>${s.habitat?HABITAT_PT[s.habitat]||pretty(s.habitat):'Não informado'}</dd></dl>
<h4>Habilidades</h4>${p.abilities.map(a=>`<div class="ab"><b>${pretty(a.name)}${a.hidden?' (oculta)':''}</b><small>${a.text} <em>(EN)</em></small></div>`).join('')}</div>
<div><h4>Estatísticas</h4>${statBars(p.stats)}</div></div>`;
const tabEvo=(p,s)=>`<div class="chain">${evoNode(s.chain)}</div><p class="muted">Clique em um Pokémon para abrir sua ficha.</p>`;
const tabFun=(p,s)=>`<dl><dt>Taxa de captura</dt><dd>${s.capture}/255</dd><dt>Grupos de ovos</dt><dd>${s.eggs.map(pretty).join(', ')}</dd><dt>Amizade base</dt><dd>${s.happiness}</dd><dt>Crescimento</dt><dd>${pretty(s.growth)}</dd><dt>Lendário</dt><dd>${s.legendary?'Sim':'Não'}</dd></dl>
<h4>Entradas da Pokédex</h4>${s.texts.map(t=>`<blockquote><b>${pretty(t.game)}</b>${t.lang==='en'?' (EN)':''}<br>${t.text}</blockquote>`).join('')||'<p class="muted">Sem entradas.</p>'}
<p class="muted">Dados oficiais extraídos da PokéAPI.</p>`;
const preview=id=>{
const p=state.list[id-1];
if(!p)return;
state.cur=id;
const shiny=state.shiny;
if(shiny&&!has('shiny',id))toggle('shiny',id);
const img=$('#pvimg');
img.classList.remove('flip');void img.offsetWidth;img.classList.add('flip');
img.onerror=()=>{img.onerror=null;img.src=`${IMG}${shiny?'shiny/':''}${id}.png`};
img.src=art(id,shiny);
img.alt=p.name;
$('#pvnum').textContent=pad(id);
$('#pvname').textContent=pretty(p.name);
$('#pvtypes').innerHTML=p.types.map(badge).join('');
$('#pvform').textContent=shiny?'Forma: Shiny':'Forma: Normal';
$('#pvcmp').innerHTML=`<button data-act="setform" data-s="0" class="${shiny?'':'on'}"><img src="${IMG}${id}.png" alt="">Normal</button><button data-act="setform" data-s="1" class="${shiny?'on':''}"><img src="${IMG}shiny/${id}.png" alt="">Shiny</button>`;
const detailShiny=$('#dshiny');
if(detailShiny)detailShiny.innerHTML=`${ico('spark')} ${shiny?'Ver normal':'Ver shiny'}`;
document.querySelector('.pill.red').classList.toggle('on',shiny);
$('#pv').classList.toggle('shiny',shiny);
$('#bfav').classList.toggle('on',has('fav',id));
$('#bcatch').classList.toggle('on',has('caught',id));
$('#bcatch').innerHTML=has('caught',id)?`${ico('check')} CAPTURADO`:`${ico('ball')} CAPTURAR`;
const total=Store.get('caught',[]).length;
$('#status').textContent=`${pad(id)} · ${total}/151 CAPTURADOS · ${(total/151*100).toFixed(1)}%`;
};
const animateBars=()=>requestAnimationFrame(()=>view.querySelectorAll('.bar span[style*="--w"]').forEach(el=>el.style.width=el.style.getPropertyValue('--w')));
const renderDetail=async id=>{
state.id=id;mark();preview(id);$('#tools').style.display='none';
view.innerHTML='<div class="card sk big"></div>';
try{
const [p,s]=await Promise.all([Api.pokemon(id),Api.species(id)]);
if(state.id!==id)return;
const tabs={info:tabInfo,evo:tabEvo,fun:tabFun};
view.innerHTML=`<div class="bar2"><button data-act="back">${ico('back')} Catálogo</button><button id="dshiny" data-act="shiny">${ico('spark')} ${state.shiny?'Ver normal':'Ver shiny'}</button><button data-act="cmp">${ico('scale')} Comparar</button></div><div class="pane"><small>${pad(id)}</small><h2>${pretty(p.name)}</h2>${p.types.map(badge).join('')}<hr>${tabs[state.tab](p,s)}</div>`;
animateBars();
}catch(e){console.error(e);errorBox()}
};
const renderCompare=async()=>{
$('#tools').style.display='none';
if(state.compare.length<2){view.innerHTML=`<div class="msg">Abra a ficha de um Pokémon e use "⚖ Comparar" em dois deles.<br>Selecionados: ${state.compare.map(pad).join(', ')||'nenhum'}</div>`;return}
view.innerHTML=skeleton(2);
try{
const [a,b]=await Promise.all(state.compare.map(Api.pokemon));
const col=(p,o)=>`<div class="cmpcol"><img src="${art(p.id)}" alt=""><h3>${pretty(p.name)}</h3><div>${p.types.map(badge).join('')}</div><p>${p.height} m · ${p.weight} kg</p>${statBars(p.stats,o.stats)}</div>`;
view.innerHTML=`<div class="cmp">${col(a,b)}${col(b,a)}</div><div class="bar2"><button data-act="clearcmp">Limpar comparação</button></div>`;
animateBars();
}catch(e){errorBox()}
};
const mark=()=>{
document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',state.id===null&&b.dataset.mode===state.mode));
document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',state.id!==null&&b.dataset.tab===state.tab));
};
const go=mode=>{state.mode=mode;state.page=1;state.id=null;mark();mode==='compare'?renderCompare():renderList()};
const wrap=n=>((n-1+151)%151)+1;
const refresh=()=>{preview(state.cur);if(state.id===null&&state.mode!=='compare')renderList()};
const actions={
mode:el=>{beep(520);go(el.dataset.mode)},
open:el=>{beep(780);state.shiny=false;renderDetail(+el.dataset.id)},
step:el=>{beep(600);state.shiny=false;renderDetail(wrap(state.cur+ +el.dataset.d))},
view:()=>{beep(780);renderDetail(state.cur)},
random:()=>{beep(780);state.shiny=false;renderDetail(1+Math.floor(Math.random()*151))},
find:()=>{beep(520);go('catalog');$('#q').focus()},
back:()=>go(state.mode==='compare'?'catalog':state.mode),
page:el=>{state.page+=+el.dataset.d;renderList()},
order:el=>{state.desc=!state.desc;el.textContent=state.desc?'↓ 151→1':'↑ 1→151';renderList()},
jump:()=>{const n=+$('#jump').value;if(n>=1&&n<=151)actions.open({dataset:{id:n}})},
setform:el=>{beep(990);state.shiny=el.dataset.s==='1';preview(state.cur)},
shiny:()=>{beep(990);state.shiny=!state.shiny;preview(state.cur)},
tab:el=>{beep(520);state.tab=el.dataset.tab;renderDetail(state.cur)},
fav:()=>{beep(880);toggle('fav',state.cur);refresh()},
caught:()=>{beep(880);toggle('caught',state.cur);refresh()},
cmp:()=>{const id=state.cur;beep(700);state.compare=[...state.compare.filter(x=>x!==id),id].slice(-2);if(state.compare.length===2)go('compare');else $('#status').textContent='COMPARAR: ESCOLHA O 2º POKÉMON'},
clearcmp:()=>{state.compare=[];renderCompare()},
sound:el=>{const mute=!Store.get('mute',false);Store.set('mute',mute);el.innerHTML=ico(mute?'soff':'son')},
reload:()=>location.reload()
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(el&&actions[el.dataset.act])actions[el.dataset.act](el)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-act]'))e.target.click();if(e.key==='Enter'&&e.target.id==='jump')actions.jump()});
$('#q').addEventListener('input',e=>{state.query=e.target.value;state.page=1;if(state.id===null&&state.mode!=='compare')renderList()});
$('#type').addEventListener('change',e=>{state.type=e.target.value;state.page=1;renderList()});
const start=async()=>{
$('#snd').innerHTML=ico(Store.get('mute',false)?'soff':'son');
view.innerHTML=skeleton();
const minimum=new Promise(r=>setTimeout(r,2400));
try{
state.list=await Api.catalog();
const types=[...new Set(state.list.flatMap(p=>p.types))].sort();
$('#type').insertAdjacentHTML('beforeend',types.map(t=>`<option value="${t}">${TYPE_PT[t]||t}</option>`).join(''));
preview(1);await minimum;go('catalog');
}catch(e){await minimum;errorBox()}
$('#splash').classList.add('hide');
};
start();
