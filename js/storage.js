const Store={
get(key,fallback){try{const raw=localStorage.getItem('pk_'+key);return raw?JSON.parse(raw):fallback}catch(e){return fallback}},
set(key,value){try{localStorage.setItem('pk_'+key,JSON.stringify(value))}catch(e){}}
};
