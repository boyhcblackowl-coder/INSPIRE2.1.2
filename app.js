var data=null, token='', activeRoute='home', lastLoginPin='';
var TOKEN_KEY='inspire_session_v4', CLIENT_KEY='inspire_client_key_v4';

function q(s){return document.querySelector(s)}
function qa(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
function apiUrl(){return String((window.INSPIRE_CONFIG||{}).API_URL||'').replace(/\/+$/,'')}

async function server(action){
  var args=Array.prototype.slice.call(arguments,1);
  var url=apiUrl();
  if(!url || url.indexOf('PASTE_')===0) throw new Error('API gateway belum dikonfigurasi.');

  var res;
  try{
    res=await fetch(url,{
      method:'POST',
      mode:'cors',
      credentials:'omit',
      cache:'no-store',
      headers:{'Content-Type':'text/plain;charset=UTF-8'},
      body:JSON.stringify({action:action,args:args})
    });
  }catch(err){
    throw new Error('Gateway unreachable. Open the Worker URL directly to test it.');
  }

  var txt=await res.text(),payload;
  try{payload=JSON.parse(txt)}
  catch(_){throw new Error('Gateway returned a non-JSON response (HTTP '+res.status+').')}

  if(!res.ok || !payload.ok) throw new Error(payload.error||('Gateway error '+res.status));
  return payload.data;
}

document.addEventListener('DOMContentLoaded',boot);
async function boot(){
  ensureClient();
  if(!apiUrl() || apiUrl().indexOf('PASTE_')===0){
    q('#loading').classList.add('hidden');
    q('#login').classList.remove('hidden');
    q('#apiWarning').classList.remove('hidden');
    return;
  }

  await checkGateway();

  token=localStorage.getItem(TOKEN_KEY)||'';
  if(!token){showLogin();return}
  try{await loadApp()}catch(e){clearSession();showLogin()}
}

async function checkGateway(){
  var box=q('#gatewayStatus');
  try{
    var res=await fetch(apiUrl()+'?health=1',{
      method:'GET',
      mode:'cors',
      credentials:'omit',
      cache:'no-store'
    });
    var txt=await res.text(),p=JSON.parse(txt);
    if(p&&p.ok){
      if(box){box.innerHTML='🟢 Gateway connected · '+esc(p.version||'V4.1');box.style.color='#4D6B3C'}
    }else{
      if(box){box.innerHTML='🔴 Gateway responded but is not ready.';box.style.color='#B4232D'}
    }
  }catch(e){
    if(box){box.innerHTML='🔴 Gateway unreachable from this browser.';box.style.color='#B4232D'}
  }
}
function ensureClient(){
  var k=localStorage.getItem(CLIENT_KEY);
  if(!k){k='DEV-'+Date.now()+'-'+Math.random().toString(36).slice(2,12);localStorage.setItem(CLIENT_KEY,k)}
  return k
}
function showLogin(){
  q('#loading').classList.add('hidden');q('#app').classList.add('hidden');q('#login').classList.remove('hidden');
  setTimeout(function(){q('#employeeId').focus()},50)
}
async function doLogin(){
  var id=q('#employeeId').value.trim().toUpperCase(),pin=q('#pin').value.trim(),b=q('#loginBtn'),e=q('#loginError');
  e.textContent='';
  if(!id||!pin){e.textContent='Enter Employee ID and PIN.';return}
  b.disabled=true;b.textContent='Signing in…';
  try{
    var r=await server('login',id,pin,navigator.userAgent.substring(0,280),ensureClient());
    token=r.token;lastLoginPin=pin;localStorage.setItem(TOKEN_KEY,token);
    await loadApp();if(r.forcePinChange)openForcedPin()
  }catch(x){e.textContent=cleanErr(x.message)}
  finally{b.disabled=false;b.textContent='Enter INSPIRE'}
}
async function loadApp(){
  data=await server('getAppData',token);
  q('#loading').classList.add('hidden');q('#login').classList.add('hidden');q('#app').classList.remove('hidden');
  renderShell();go('home');
  if(data.forcePinChange&&!lastLoginPin)toast('Temporary PIN active. Open Profile → Change PIN.')
}
function renderShell(){
  var u=data.user,ini=initials(u.name);
  q('#avatar').textContent=ini;q('#mobileAvatar').textContent=ini;q('#profileName').textContent=u.name;
  q('#profileRole').textContent=(u.division||u.outlet||'')+' · '+u.role;
  q('#sideMenu').innerHTML=data.menus.map(function(m){
    return '<button class="menu" data-r="'+esc(m.route)+'" onclick="go(\''+arg(m.route)+'\')"><span>'+esc(m.icon)+'</span>'+esc(m.label)+'</button>'
  }).join('');
  var core=['home','community','epiic','boss'],arr=data.menus.filter(function(m){return core.indexOf(m.route)>=0}).slice(0,4);
  q('#bottomNav').innerHTML=arr.map(function(m){
    return '<button class="bottom-item" data-r="'+esc(m.route)+'" onclick="go(\''+arg(m.route)+'\')"><span>'+esc(m.icon)+'</span>'+esc(m.label)+'</button>'
  }).join('')+'<button class="bottom-item" onclick="moreMenu()"><span>•••</span>More</button>'
}
function go(r){
  activeRoute=r;qa('[data-r]').forEach(function(x){x.classList.toggle('active',x.getAttribute('data-r')===r)});
  q('#content').innerHTML=r==='home'?home():modulePage(r);window.scrollTo(0,0)
}
function home(){
  var first=(data.user.name||'sOWLdier').split(' ')[0];
  var metrics=(data.metrics||[]).slice(0,3).map(function(m){return '<div class="card metric"><span>'+esc(m.METRIC)+'</span><strong>'+esc(m.VALUE)+'</strong></div>'}).join('');
  return '<div class="hero"><div class="eyebrow" style="color:#D7B97C">THE DIGITAL HOME OF sOWLdiers</div><h1>Hi, '+esc(first)+'! 👋</h1><p>One login for connection, learning, employee services, culture, and growth at Black Owl.</p></div>'
   +(data.forcePinChange?'<div class="notice">🔐 You are using a temporary PIN. Please create your personal PIN from Profile.</div>':'')
   +(metrics?'<div class="grid">'+metrics+'</div>':'')
   +'<div class="page-head" style="margin-top:25px"><div class="eyebrow">YOUR INSPIRE</div><h1>Everything in one place</h1><p>INSPIRE V4 Pilot — GitHub PWA + secure gateway.</p></div><div class="grid">'
   +data.menus.filter(function(m){return m.route!=='home'}).map(function(m){return '<button class="card module-card" style="text-align:left" onclick="go(\''+arg(m.route)+'\')"><div class="icon">'+esc(m.icon)+'</div><h3>'+esc(m.label)+'</h3><p>'+esc(m.description||'INSPIRE module')+'</p></button>'}).join('')
   +'</div>'
}
function modulePage(r){
  var m=data.menus.find(function(x){return x.route===r})||{label:r,icon:'🦉',description:'INSPIRE module'};
  return '<div class="page-head"><div class="eyebrow">INSPIRE V4</div><h1>'+esc(m.icon)+' '+esc(m.label)+'</h1><p>'+esc(m.description||'')+'</p></div><div class="card" style="text-align:center;padding:34px"><div style="font-size:36px">'+esc(m.icon)+'</div><h2>Gateway connected.</h2><p class="muted">This module will be migrated after the V4 mobile pilot passes.</p></div>'
}
function moreMenu(){
  var core=['home','community','epiic','boss'],arr=data.menus.filter(function(m){return core.indexOf(m.route)<0});
  openModal('<div class="eyebrow">INSPIRE</div><h2>More</h2>'+arr.map(function(m){return '<button class="secondary full" style="margin:5px 0;text-align:left" onclick="closeModal();go(\''+arg(m.route)+'\')">'+esc(m.icon)+' &nbsp; '+esc(m.label)+'</button>'}).join(''))
}
function openProfile(){
  var u=data.user;
  openModal('<div style="text-align:center"><span class="avatar" style="width:58px;height:58px;font-size:19px">'+initials(u.name)+'</span><h2>'+esc(u.name)+'</h2><div class="muted" style="font-size:12px">'+esc(u.employeeId)+'</div></div>'
  +'<div class="info"><span>Division</span><strong>'+esc(u.division||'-')+'</strong></div>'
  +'<div class="info"><span>Outlet</span><strong>'+esc(u.outlet||'-')+'</strong></div>'
  +'<div class="info"><span>Position</span><strong>'+esc(u.position||'-')+'</strong></div>'
  +'<div class="info"><span>Role</span><strong>'+esc(u.role)+'</strong></div>'
  +'<div class="install"><strong>📱 INSPIRE V4 PWA</strong><br>'+esc(installText())+'</div>'
  +'<button class="secondary full" onclick="openChangePin()">Change PIN</button>'
  +'<button class="primary full" style="margin-top:8px" onclick="doLogout()">Log out</button>')
}
function openForcedPin(){
  openModal('<div class="eyebrow">FIRST LOGIN</div><h2>Create your personal PIN</h2><p class="muted">Replace your temporary PIN with a new 6-digit PIN.</p><label>New PIN</label><input id="newPin" type="password" inputmode="numeric" maxlength="6"><label>Confirm new PIN</label><input id="confirmPin" type="password" inputmode="numeric" maxlength="6"><button class="primary full" style="margin-top:14px" onclick="saveForcedPin()">Set New PIN</button>');
  q('.close').style.display='none'
}
async function saveForcedPin(){
  var n=q('#newPin').value.trim(),c=q('#confirmPin').value.trim();if(n!==c){toast('PIN confirmation does not match.');return}
  try{await server('changePin',token,lastLoginPin,n);lastLoginPin='';closeModal();toast('PIN updated.');await loadApp()}catch(e){handle(e)}
}
function openChangePin(){
  openModal('<div class="eyebrow">SECURITY</div><h2>Change PIN</h2><label>Current PIN</label><input id="oldPin" type="password" inputmode="numeric" maxlength="6"><label>New PIN</label><input id="newPin" type="password" inputmode="numeric" maxlength="6"><label>Confirm new PIN</label><input id="confirmPin" type="password" inputmode="numeric" maxlength="6"><button class="primary full" style="margin-top:14px" onclick="savePin()">Update PIN</button>')
}
async function savePin(){
  var o=q('#oldPin').value.trim(),n=q('#newPin').value.trim(),c=q('#confirmPin').value.trim();if(n!==c){toast('PIN confirmation does not match.');return}
  try{await server('changePin',token,o,n);closeModal();toast('PIN updated.');await loadApp()}catch(e){handle(e)}
}
async function doLogout(){try{await server('logout',token)}catch(e){}clearSession();closeModal();showLogin()}
function clearSession(){token='';data=null;lastLoginPin='';localStorage.removeItem(TOKEN_KEY)}
function togglePin(){var x=q('#pin'),b=x.nextElementSibling;x.type=x.type==='password'?'text':'password';b.textContent=x.type==='password'?'Show':'Hide'}
function installText(){return /iphone|ipad|ipod/i.test(navigator.userAgent)?'Safari → Share → Add to Home Screen.':'Chrome → menu ⋮ → Add to Home screen / Install app.'}
function openModal(h){q('#modalBody').innerHTML=h;q('#modal').classList.remove('hidden')}
function closeModal(){q('#modal').classList.add('hidden');q('#modalBody').innerHTML=''}
function toast(m){var x=q('#toast');x.textContent=m;x.classList.remove('hidden');clearTimeout(window._t);window._t=setTimeout(function(){x.classList.add('hidden')},2800)}
function handle(e){var m=e&&e.message?e.message:String(e);if(m.indexOf('SESSION_EXPIRED')>=0){clearSession();closeModal();showLogin();toast('Session expired. Please sign in again.')}else toast(cleanErr(m))}
function cleanErr(m){return String(m||'Something went wrong.').replace(/^Exception:\s*/,'')}
function initials(n){var p=String(n||'S').trim().split(/\s+/);return (p[0].charAt(0)+(p.length>1?p[p.length-1].charAt(0):'')).toUpperCase()}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function arg(v){return String(v==null?'':v).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,' ')}