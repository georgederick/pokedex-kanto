const Api=(()=>{
const BASE='https://pokeapi.co/api/v2/';
const idOf=url=>+url.split('/').slice(-2)[0];
const fetchJson=async path=>{const res=await fetch(BASE+path);if(!res.ok)throw new Error(res.status);return res.json()};
const cached=async(key,loader)=>{const hit=Store.get(key);if(hit)return hit;const data=await loader();Store.set(key,data);return data};
const method=d=>{
if(!d)return '';
if(d.item)return 'Item: '+d.item.name.replace(/-/g,' ');
if(d.min_level)return 'Nível '+d.min_level;
if(d.trigger.name==='trade')return 'Troca';
if(d.min_happiness)return 'Amizade';
return d.trigger.name.replace(/-/g,' ');
};
const walk=node=>({id:idOf(node.species.url),name:node.species.name,method:method(node.evolution_details[0]),kids:node.evolves_to.map(walk).filter(n=>n.id<=151)});
const catalog=()=>cached('catalog',async()=>{
const list=(await fetchJson('pokemon?limit=151')).results.map((p,i)=>({id:i+1,name:p.name,types:[]}));
const names=(await fetchJson('type')).results.map(t=>t.name).filter(n=>n!=='unknown'&&n!=='shadow'&&n!=='stellar');
await Promise.all(names.map(async n=>{
const t=await fetchJson('type/'+n);
t.pokemon.forEach(e=>{const id=idOf(e.pokemon.url);if(id<=151)list[id-1].types[e.slot-1]=n});
}));
list.forEach(p=>p.types=p.types.filter(Boolean));
return list;
});
const pokemon=id=>cached('p'+id,async()=>{
const p=await fetchJson('pokemon/'+id);
const abilities=await Promise.all(p.abilities.map(async a=>{
const info=await fetchJson('ability/'+a.ability.name);
const text=info.effect_entries.find(e=>e.language.name==='en');
return {name:a.ability.name,hidden:a.is_hidden,text:text?text.short_effect:''};
}));
return {id:p.id,name:p.name,types:p.types.map(t=>t.type.name),height:p.height/10,weight:p.weight/10,xp:p.base_experience,stats:p.stats.map(s=>s.base_stat),abilities};
});
const species=id=>cached('s'+id,async()=>{
const s=await fetchJson('pokemon-species/'+id);
const genus=(s.genera.find(g=>g.language.name==='pt-BR')||s.genera.find(g=>g.language.name==='en')||{}).genus||'';
const seen=new Set();
const texts=[];
['pt-BR','pt','en'].forEach(lang=>s.flavor_text_entries.filter(f=>f.language.name===lang).forEach(f=>{
const text=f.flavor_text.replace(/[\n\f]/g,' ');
if(!seen.has(text)&&texts.length<8){seen.add(text);texts.push({game:f.version.name,lang,text})}
}));
const evo=await fetchJson(s.evolution_chain.url.replace(BASE,''));
return {genus,habitat:s.habitat?s.habitat.name:'',eggs:s.egg_groups.map(e=>e.name),capture:s.capture_rate,happiness:s.base_happiness,growth:s.growth_rate.name,legendary:s.is_legendary,texts,chain:walk(evo.chain)};
});
return {catalog,pokemon,species};
})();
