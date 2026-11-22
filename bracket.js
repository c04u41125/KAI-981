const API='https://kai981-km-bot.kai981-km-bot.workers.dev/api/brackets',REGISTRATION_API='https://beyblade-x-registration-202611.c04u41125.chatgpt.site/api/public-schedules';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),registrationSchedule=params.get('registrationSchedule'),id=registrationSchedule||params.get('id')||params.get('s');
const requestUrl=path=>registrationSchedule?REGISTRATION_API+'/'+encodeURIComponent(registrationSchedule)+path:API+path;
if(id)document.body.classList.add('viewing-bracket');
let token=new URLSearchParams(location.hash.slice(1)).get('edit')||'',data=null,busy=false,editing=false,loading=false,fitMode=true,scale=1,deleted=false,activePhase=0;
// 憑證只存當前分頁的 sessionStorage，不放查詢字串、公開連結或 localStorage。
try{if(token){sessionStorage.setItem('bracket-edit-'+id,token);history.replaceState(null,'',location.pathname+location.search);}else token=sessionStorage.getItem('bracket-edit-'+id)||'';}catch{history.replaceState(null,'',location.pathname+location.search);}
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function status(text){$('status').textContent=text;}
async function api(path='',body){const r=await fetch(requestUrl(path),{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(15000)});const value=await r.json();if(!r.ok){const error=Error(value.error||'讀取失敗');error.code=value.code;throw error;}return value;}
function ensureBracketExtras(){
 if(!$('phase-tabs')){const tabs=el('div',undefined,'phase-tabs');tabs.id='phase-tabs';tabs.hidden=true;$('meta').after(tabs);}
 if(!$('standings')){const standings=el('section',undefined,'standings');standings.id='standings';standings.hidden=true;$('viewport').after(standings);}
 let note=$('format-note');if(!note){note=document.querySelector('#tournament > p.hint:last-child')||el('p');note.id='format-note';note.classList.add('hint');if(!note.isConnected)$('tournament').append(note);}
 if(!$('phase-styles')){const style=el('style');style.id='phase-styles';style.textContent='.phase-tabs{display:flex;gap:8px;overflow:auto;padding:10px 0}.phase-tab{white-space:nowrap}.phase-tab.is-active{background:#e52238;border-color:#e52238}.round.round-robin .match:after{display:none}#champion.is-tie{background:#4d4321;color:#ffe898}.standings{margin:16px 0;padding:18px;border:1px solid #414141;border-radius:6px;background:#131313}.standings h3{margin:0 0 12px}.standings table{border-collapse:collapse;width:min(100%,600px);text-align:left}.standings th,.standings td{padding:9px 12px;border-bottom:1px solid #303030}.standings .tied td:last-child{color:#ffbdc4}';document.head.append(style);}
}
function schedulePhases(){if(Array.isArray(data.phases)&&data.phases.length)return data.phases;return [{name:data.title,type:'bracket',rounds:data.rounds,roundLabels:data.roundLabels||[]}];}
function renderStandings(phase){
 const holder=$('standings');holder.replaceChildren();holder.hidden=true;
 if(data.format!=='adult-three-pools-round-robin'||phase.type!=='round-robin')return;
 const matches=phase.rounds.flatMap(round=>Array.isArray(round)?round:(round.matches||[]));const stats=new Map();
 for(const match of matches){for(const player of [match.a,match.b])if(player&&!stats.has(player.id))stats.set(player.id,{player,played:0,wins:0});if(match.done&&match.winner&&match.a&&match.b){stats.get(match.a.id).played++;stats.get(match.b.id).played++;stats.get(match.winner.id).wins++;}}
 if(!stats.size)return;const rows=[...stats.values()].sort((a,b)=>b.wins-a.wins||a.player.id-b.player.id);const table=document.createElement('table'),head=document.createElement('thead'),body=document.createElement('tbody'),headRow=document.createElement('tr');
 for(const label of ['選手','已賽','勝場'])headRow.append(el('th',label));head.append(headRow);
 for(const [index,row] of rows.entries()){const tr=document.createElement('tr');tr.append(el('td','#'+row.player.id+' '+row.player.name),el('td',String(row.played)),el('td',String(row.wins)));if(index>0&&row.wins===rows[0].wins)tr.className='tied';body.append(tr);}
 table.append(head,body);holder.append(el('h3','總決賽即時戰績'),table);const complete=matches.length===3&&matches.every(match=>match.done),leaders=rows.filter(row=>row.wins===rows[0].wins),champ=$('champion');champ.classList.remove('is-tie');
 if(complete&&leaders.length===1){champ.hidden=false;champ.textContent='CHAMPION / 冠軍　'+leaders[0].player.name;}else if(complete){champ.hidden=false;champ.classList.add('is-tie');champ.textContent='總決賽戰績平手 · 請主辦方確認名次';}holder.hidden=false;
}
function render(){
 const phases=schedulePhases();activePhase=Math.min(activePhase,phases.length-1);$('tournament').hidden=false;$('title').textContent=data.title;$('mode').textContent=data.canEdit?'ADMIN / 管理員編輯':'LIVE / 公開觀賽';
 const formatLabel=data.format==='adult-three-pools-round-robin'?'三組各 16 人單淘汰 · 組冠軍三人循環賽':data.players.length===16?'16 人單淘汰':'單淘汰';
 $('meta').textContent=(data.published?data.players.length+' 位選手':'尚未發布 · 設定參賽名單')+' · '+formatLabel+' · 更新 '+new Date(data.updated*1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})+' · 每 10 秒更新';
 $('delete-bracket').hidden=!data.canEdit;$('edit-roster').hidden=Boolean(registrationSchedule)||!data.canEdit||!data.published;$('setup').hidden=Boolean(registrationSchedule)||!(data.canEdit&&(!data.published||editing));if(!$('setup').hidden&&!$('name').value)$('name').value=data.title;$('share').disabled=!data.published;$('board').replaceChildren();
 const champion=$('champion');champion.hidden=true;champion.classList.remove('is-tie');if(data.format!=='adult-three-pools-round-robin'){const final=data.rounds.at(-1)?.[0];champion.hidden=!final?.winner;if(final?.winner)champion.textContent='CHAMPION / 冠軍　'+final.winner.name;}
 const tabs=$('phase-tabs');tabs.replaceChildren();tabs.hidden=phases.length<2;phases.forEach((item,index)=>{const button=el('button',item.name,'phase-tab'+(index===activePhase?' is-active':''));button.type='button';button.setAttribute('aria-pressed',String(index===activePhase));button.onclick=()=>{activePhase=index;render();};tabs.append(button);});
 const phase=phases[activePhase]||phases[0],rounds=phase.rounds||[];$('format-note').textContent=phase.type==='round-robin'?'三位組冠軍各進行兩場對戰；全部完成後依勝場判定。若勝場平手，系統不會自行推定，請主辦方確認。':data.format==='adult-three-pools-round-robin'?'成人組 48 人依抽號分為 A、B、C 組，各 16 人單淘汰；各組冠軍晉級總決賽。':'管理員點選勝者晉級；對戰結果即時更新。';
 rounds.forEach((round,r)=>{const roundMatches=Array.isArray(round)?round:(round.matches||[]),roundLabel=phase.roundLabels?.[r]||(!Array.isArray(round)?round.name:'第 '+(r+1)+' 輪'),col=el('section',undefined,'round'+(phase.type==='round-robin'?' round-robin':''));col.append(el('h3',roundLabel+' / '+roundMatches.length+' 場'));const matches=el('div',undefined,'matches');
  roundMatches.forEach((m,i)=>{const card=el('article',undefined,'match');card.append(el('small','場次 '+(m.matchNumber||i+1)+(m.bye?' · 輪空晉級':m.done?' · 已完成':' · 等待對戰')));for(const side of ['a','b']){const player=m[side],clickable=data.canEdit&&m.ready&&!m.bye,line=el(clickable?'button':'div',undefined,'player'+(player&&m.winner?.id===player.id?' win':''));line.append(el('span',player?'#'+player.id+' '+player.name:m.ready?'輪空':'待前場勝者'),el('b',player&&m.winner?.id===player.id?'✓':''));if(clickable){line.title='點選 '+player.name+' 晉級';line.disabled=busy;line.onclick=async()=>{if(m.winner?.id===player.id)return;if(m.winner&&!confirm('改判勝者？受影響的後續結果會清除。'))return;await save({action:'winner',key:m.key,winner:player.id});};}card.append(line);}if(data.canEdit&&m.score&&!m.bye){const undo=el('button','取消此場晉級','undo');undo.onclick=async()=>{if(confirm('清除此場與受影響的後續結果？'))await save({action:'winner',key:m.key,clear:true});};card.append(undo);}matches.append(card);});col.append(matches);$('board').append(col);});
 renderStandings(phase);requestAnimationFrame(resizeBoard);
}
async function load(silent=false){if(deleted||loading||busy||editing)return;loading=true;try{if(!id){$('landing').hidden=false;const list=await api();$('events').replaceChildren();for(const e of list.brackets){const a=el('a',undefined,'event');a.href='/KAI-981/b/?s='+encodeURIComponent(e.short_code);a.append(el('p','SINGLE ELIMINATION'),el('h3',e.title),el('p','觀看對戰表 →'));$('events').append(a);}status(list.brackets.length?'選擇賽程即可觀看。':'目前尚無已發布賽程。');}else{const latest=await api(registrationSchedule?'':'/'+encodeURIComponent(id));if(deleted)return;if(!data||latest.version!==data.version||latest.canEdit!==data.canEdit){data=latest;render();}status('已連線 · '+new Date().toLocaleTimeString('zh-TW')+' 同步成功'+(token&&!latest.canEdit?'；編輯授權已失效，請私訊 Bot 重新授權。':''));}}catch(e){if(e.code==='BRACKET_DELETED'){showDeleted();return;}status('同步失敗：'+e.message+(data?'。畫面保留上次資料，稍後自動重試。':''));}finally{loading=false;}}
async function save(body){if(busy)return false;busy=true;document.body.setAttribute('aria-busy','true');try{data=await api(registrationSchedule?'':'/'+id,{...body,version:data.version});editing=false;render();status('已儲存，觀眾將於下一次同步看到結果。');return true;}catch(e){if(e.code==='BRACKET_DELETED')showDeleted();else status(e.message);return false;}finally{busy=false;document.body.removeAttribute('aria-busy');document.querySelectorAll('#board button').forEach(b=>b.disabled=false);}}




function showDeleted(){
 deleted=true;editing=false;data=null;token='';
 try{sessionStorage.removeItem('bracket-edit-'+id);}catch{}
 $('tournament').hidden=true;$('board').replaceChildren();
 status('此賽程已刪除。');
 const link=el('a','返回公開賽程');link.href=registrationSchedule?'https://beyblade-x-registration-202611.c04u41125.chatgpt.site/schedule':'/KAI-981/bracket.html';$('status').append(document.createTextNode(' '),link);
}
$('delete-bracket').onclick=async()=>{
 if(busy||!data?.canEdit)return;
 if(!confirm('確定刪除「'+data.title+'」？公開列表及觀賽連結將停止顯示此賽程，無法在網頁復原。'))return;
 busy=true;$('delete-bracket').disabled=true;
 try{await api(registrationSchedule?'':'/'+id,{action:'delete',version:data.version});showDeleted();}
 catch(e){if(e.code==='BRACKET_DELETED')showDeleted();else status(e.message);}
 finally{busy=false;$('delete-bracket').disabled=false;}
};
