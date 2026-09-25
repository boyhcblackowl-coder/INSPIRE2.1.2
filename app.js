var data=null, token='', activeRoute='home', lastLoginPin='', employeeCenterCache=null, communityCache=null, learningCache=null;
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
  activeRoute=r;
  qa('[data-r]').forEach(function(x){x.classList.toggle('active',x.getAttribute('data-r')===r)});
  if(r==='home'){q('#content').innerHTML=home()}
  else if(r==='employee'){renderEmployeeCenter()}
  else if(r==='community'){renderCommunity()}
  else if(r==='learning'){renderLearning()}
  else{q('#content').innerHTML=modulePage(r)}
  window.scrollTo(0,0)
}
function home(){
  var first=(data.user.name||'sOWLdier').split(' ')[0];
  var metrics=(data.metrics||[]).slice(0,3).map(function(m){return '<div class="card metric"><span>'+esc(m.METRIC)+'</span><strong>'+esc(m.VALUE)+'</strong></div>'}).join('');
  return '<div class="hero"><div class="eyebrow" style="color:#D7B97C">THE DIGITAL HOME OF sOWLdiers</div><h1>Hi, '+esc(first)+'! 👋</h1><p>One login for connection, learning, employee services, culture, and growth at Black Owl.</p></div>'
   +(data.forcePinChange?'<div class="notice">🔐 You are using a temporary PIN. Please create your personal PIN from Profile.</div>':'')
   +(metrics?'<div class="grid">'+metrics+'</div>':'')
   +'<div class="page-head" style="margin-top:25px"><div class="eyebrow">YOUR INSPIRE</div><h1>Everything in one place</h1><p>INSPIRE 2.1 — Employee, Community & Learning Pilot.</p></div><div class="grid">'
   +data.menus.filter(function(m){return m.route!=='home'}).map(function(m){return '<button class="card module-card" style="text-align:left" onclick="go(\''+arg(m.route)+'\')"><div class="icon">'+esc(m.icon)+'</div><h3>'+esc(m.label)+'</h3><p>'+esc(m.description||'INSPIRE module')+'</p></button>'}).join('')
   +'</div>'
}
function modulePage(r){
  var m=data.menus.find(function(x){return x.route===r})||{label:r,icon:'🦉',description:'INSPIRE module'};
  return '<div class="page-head"><div class="eyebrow">INSPIRE V4</div><h1>'+esc(m.icon)+' '+esc(m.label)+'</h1><p>'+esc(m.description||'')+'</p></div><div class="card" style="text-align:center;padding:34px"><div style="font-size:36px">'+esc(m.icon)+'</div><h2>Gateway connected.</h2><p class="muted">This module will be migrated after the V4 mobile pilot passes.</p></div>'
}


/* =========================================================
   EMPLOYEE CENTER V1.3
   ========================================================= */

async function renderEmployeeCenter(){
  var root=q('#content');
  root.innerHTML=loadingBlock_('EMPLOYEE CENTER','My Black Owl','Loading your Employee Center…');

  try{
    if(!employeeCenterCache) employeeCenterCache=await server('getEmployeeCenterData',token);
    root.innerHTML=employeeCenterPage_(employeeCenterCache);
  }catch(e){
    handle(e);
    root.innerHTML=errorBlock_('EMPLOYEE CENTER','Unable to load Employee Center',e,'employeeCenterCache=null;renderEmployeeCenter()');
  }
}

function employeeCenterPage_(d){
  var p=d.profile||{}, resources=d.resources||[];
  var photo=p.photoUrl
    ? '<img class="ec-photo" src="'+esc(p.photoUrl)+'" alt="'+esc(p.name)+'">'
    : '<div class="ec-photo ec-photo-fallback">'+initials(p.name)+'</div>';

  return '<section class="ec-profile-card"><div class="ec-profile-top">'+photo+
    '<div class="ec-profile-copy"><div class="eyebrow">MY PROFILE</div><h1>'+esc(p.name||'sOWLdier')+'</h1>'+
    '<p>'+esc(p.position||'-')+'</p><div class="ec-tags"><span>'+esc(p.division||'-')+'</span><span>'+esc(p.outlet||'-')+
    '</span><span class="ec-status">'+esc(p.status||'-')+'</span></div></div></div></section>'+
    '<div class="page-head section-gap"><div class="eyebrow">MY EMPLOYMENT</div><h2>Employment Information</h2></div>'+
    '<section class="ec-info-grid">'+
      ecInfo_('Employee ID',p.employeeId,'🪪')+ecInfo_('Email',p.email,'✉️')+
      ecInfo_('Division',p.division,'🏢')+ecInfo_('Outlet / Location',p.outlet,'📍')+
      ecInfo_('Position',p.position,'💼')+ecInfo_('Join Date',p.joinDate||'-','📆')+
      ecInfo_('INSPIRE Role',p.role,'🔐')+
      '<button class="ec-info-card" onclick="openChangePin()"><div class="ec-info-icon">🔑</div><div><span>Account Security</span><strong>Change INSPIRE PIN</strong></div></button>'+
    '</section>'+
    '<div class="page-head section-gap"><div class="eyebrow">EMPLOYEE RESOURCES</div><h2>Everything you need in one place</h2><p>Policies, forms, benefits, and internal directory.</p></div>'+
    '<section class="ec-resource-grid">'+resources.map(ecResourceCard_).join('')+'</section>';
}

function ecInfo_(label,value,icon){
  return '<div class="ec-info-card"><div class="ec-info-icon">'+esc(icon)+'</div><div><span>'+esc(label)+'</span><strong>'+esc(value||'-')+'</strong></div></div>';
}

function ecResourceCard_(r){
  return '<button class="ec-resource-card" onclick="openEmployeeResourceDetail(\''+arg(r.id||'')+'\')">'+
    '<div class="ec-resource-icon">'+esc(r.icon||'🔗')+'</div><div class="ec-resource-content"><h3>'+esc(r.title||'Resource')+
    '</h3><p>'+esc(r.description||'')+'</p></div><div class="ec-resource-arrow">›</div></button>';
}

function openEmployeeResourceDetail(id){
  var list=(employeeCenterCache&&employeeCenterCache.resources)||[];
  var r=list.find(function(x){return String(x.id)===String(id)});
  if(!r){toast('Resource not found.');return}

  var actions='';
  if(r.primaryActionLabel) actions+=resourceActionButton_(r.primaryActionLabel,r.primaryUrl,true);
  if(r.secondaryActionLabel) actions+=resourceActionButton_(r.secondaryActionLabel,r.secondaryUrl,false);

  q('#content').innerHTML='<button class="back-link" onclick="renderEmployeeCenter()">‹ Back to Employee Center</button>'+
    '<section class="detail-card"><div class="detail-icon">'+esc(r.icon||'🔗')+'</div><div class="eyebrow">EMPLOYEE RESOURCE</div>'+
    '<h1>'+esc(r.contentTitle||r.title||'Resource')+'</h1><p class="detail-lead">'+esc(r.description||'')+'</p>'+
    '<div class="detail-body">'+formatBody_(r.contentBody||'')+'</div>'+
    renderMediaPlayer_(r.videoTitle||'',r.videoUrl||'','video')+
    (actions?'<div class="detail-actions">'+actions+'</div>':'')+'</section>';
  window.scrollTo(0,0)
}

function resourceActionButton_(label,url,primary){
  var cls=primary?'primary':'secondary';
  if(!String(url||'').trim()) return '<button class="'+cls+'" onclick="toast(\''+arg(label)+' is being prepared.\')">'+esc(label)+'</button>';
  return '<button class="'+cls+'" onclick="openExternal_(\''+arg(url)+'\')">'+esc(label)+'</button>';
}


/* =========================================================
   COMMUNITY PILOT
   ========================================================= */

async function renderCommunity(force){
  var root=q('#content');
  root.innerHTML=loadingBlock_('COMMUNITY','sOWLdiers Community','Loading community feed…');

  try{
    if(force||!communityCache) communityCache=await server('getCommunityData',token);
    root.innerHTML=communityPage_(communityCache);
  }catch(e){
    handle(e);
    root.innerHTML=errorBlock_('COMMUNITY','Unable to load Community',e,'communityCache=null;renderCommunity(true)');
  }
}

function communityPage_(d){
  var posts=(d&&d.posts)||[];
  return '<div class="page-head"><div class="eyebrow">COMMUNITY</div><h1>sOWLdiers Community</h1>'+
    '<p>Connect, celebrate moments, and join the conversation.</p></div>'+
    (posts.length?'<div class="community-feed">'+posts.map(communityPost_).join('')+'</div>':
      '<div class="card empty-state"><div>💬</div><h2>No posts yet</h2><p>Community posts will appear here.</p></div>');
}

function communityPost_(p){
  var comments=(p.comments||[]);
  var media='';
  if(String(p.mediaType||'').toUpperCase()==='VIDEO' && p.mediaUrl) media=renderMediaPlayer_(p.mediaTitle||p.title,p.mediaUrl,'video');
  else if(p.imageUrl) media='<img class="post-image" src="'+esc(p.imageUrl)+'" alt="'+esc(p.title||'Community post')+'">';

  return '<article class="post-card" id="post-'+esc(p.id)+'">'+
    '<div class="post-meta"><div class="post-author-avatar">'+initials(p.authorName||'BO')+'</div><div><strong>'+esc(p.authorName||'Black Owl')+
    '</strong><span>'+esc(p.division||'')+(p.createdAt?' · '+esc(p.createdAt):'')+'</span></div>'+
    (p.pinned?'<span class="pin-badge">📌 Pinned</span>':'')+'</div>'+
    '<h2>'+esc(p.title||'')+'</h2><p class="post-body">'+esc(p.body||'')+'</p>'+media+
    '<div class="engagement-row"><button class="engage '+(p.likedByMe?'liked':'')+'" onclick="toggleCommunityLike_(\''+arg(p.id)+'\')">❤ <span>'+Number(p.likeCount||0)+'</span></button>'+
    '<button class="engage" onclick="focusComment_(\''+arg(p.id)+'\')">💬 <span>'+Number(p.commentCount||0)+'</span></button></div>'+
    '<div class="comment-compose"><input id="comment-'+esc(p.id)+'" maxlength="600" placeholder="Write a comment…">'+
    '<button class="primary" onclick="submitCommunityComment_(\''+arg(p.id)+'\')">Post</button></div>'+
    '<div class="comments-list">'+comments.map(function(c){return communityComment_(p.id,c)}).join('')+'</div></article>';
}

function communityComment_(postId,c){
  var replies=(c.replies||[]);
  return '<div class="comment-item"><div class="comment-avatar">'+initials(c.userName||'S')+'</div><div class="comment-main">'+
    '<div class="comment-bubble"><strong>'+esc(c.userName||'sOWLdier')+'</strong><p>'+esc(c.comment||'')+'</p></div>'+
    '<div class="comment-tools"><button onclick="showReplyBox_(\''+arg(postId)+'\',\''+arg(c.id)+'\')">Reply</button><span>'+esc(c.createdAt||'')+'</span></div>'+
    '<div id="reply-wrap-'+esc(c.id)+'" class="reply-compose hidden"><input id="reply-'+esc(c.id)+'" maxlength="600" placeholder="Write a reply…">'+
    '<button class="secondary" onclick="submitCommunityReply_(\''+arg(postId)+'\',\''+arg(c.id)+'\')">Reply</button></div>'+
    (replies.length?'<div class="reply-list">'+replies.map(function(r){return '<div class="reply-item"><strong>'+esc(r.userName||'sOWLdier')+'</strong><p>'+esc(r.comment||'')+'</p></div>'}).join('')+'</div>':'')+
    '</div></div>';
}

async function toggleCommunityLike_(postId){
  try{await server('togglePostLike',token,postId);communityCache=null;await renderCommunity(true)}
  catch(e){handle(e)}
}
function focusComment_(postId){var x=q('#comment-'+CSS.escape(postId));if(x)x.focus()}
async function submitCommunityComment_(postId){
  var x=q('#comment-'+CSS.escape(postId)),v=x?x.value.trim():'';
  if(!v){toast('Write a comment first.');return}
  try{await server('addPostComment',token,postId,v);communityCache=null;await renderCommunity(true)}
  catch(e){handle(e)}
}
function showReplyBox_(postId,commentId){var x=q('#reply-wrap-'+CSS.escape(commentId));if(x)x.classList.toggle('hidden')}
async function submitCommunityReply_(postId,commentId){
  var x=q('#reply-'+CSS.escape(commentId)),v=x?x.value.trim():'';
  if(!v){toast('Write a reply first.');return}
  try{await server('addCommentReply',token,postId,commentId,v);communityCache=null;await renderCommunity(true)}
  catch(e){handle(e)}
}


/* =========================================================
   LEARNING PILOT
   ========================================================= */

async function renderLearning(force){
  var root=q('#content');
  root.innerHTML=loadingBlock_('LEARNING','Learning Hub','Loading your learning modules…');

  try{
    if(force||!learningCache) learningCache=await server('getLearningData',token);
    root.innerHTML=learningPage_(learningCache);
  }catch(e){
    handle(e);
    root.innerHTML=errorBlock_('LEARNING','Unable to load Learning',e,'learningCache=null;renderLearning(true)');
  }
}

function learningPage_(d){
  var modules=(d&&d.modules)||[];
  return '<div class="page-head"><div class="eyebrow">LEARNING</div><h1>Learning Hub</h1>'+
    '<p>Build capability, track progress, and keep Black Owl standards consistent.</p></div>'+
    '<div class="learning-grid">'+modules.map(learningCard_).join('')+'</div>';
}

function learningCard_(m){
  var pct=Number(m.progressPercent||0), status=m.progressStatus||'NOT_STARTED';
  return '<button class="learning-card" onclick="openLearningModule_(\''+arg(m.id)+'\')">'+
    '<div class="learning-icon">🎓</div><div class="learning-copy"><div class="eyebrow">'+esc(m.category||'LEARNING MODULE')+'</div>'+
    '<h3>'+esc(m.title||'Module')+'</h3><p>'+esc(m.description||'')+'</p>'+
    '<div class="learning-meta"><span>'+esc(m.fileType||'MODULE')+(m.totalPages?' · '+esc(m.totalPages)+' pages':'')+'</span><span>'+esc(statusLabel_(status))+'</span></div>'+
    '<div class="progress-track"><span style="width:'+Math.max(0,Math.min(100,pct))+'%"></span></div></div><div class="ec-resource-arrow">›</div></button>';
}

function openLearningModule_(id){
  var list=(learningCache&&learningCache.modules)||[];
  var m=list.find(function(x){return String(x.id)===String(id)});
  if(!m){toast('Module not found.');return}
  var pct=Number(m.progressPercent||0), status=m.progressStatus||'NOT_STARTED';

  q('#content').innerHTML='<button class="back-link" onclick="renderLearning()">‹ Back to Learning</button>'+
    '<section class="detail-card learning-detail"><div class="detail-icon">🎓</div><div class="eyebrow">'+esc(m.category||'LEARNING MODULE')+'</div>'+
    '<h1>'+esc(m.title||'Module')+'</h1><p class="detail-lead">'+esc(m.description||'')+'</p>'+
    '<div class="learning-status-panel"><div><span>Progress</span><strong>'+Math.max(0,Math.min(100,pct))+'%</strong></div>'+
    '<div><span>Status</span><strong>'+esc(statusLabel_(status))+'</strong></div></div>'+
    '<div class="progress-track large"><span style="width:'+Math.max(0,Math.min(100,pct))+'%"></span></div>'+
    (m.learningObjectives?'<div class="detail-body"><strong>Learning Objectives</strong><br>'+formatBody_(m.learningObjectives)+'</div>':'')+
    renderLearningViewer_(m)+
    '<div class="detail-actions">'+
      (status==='NOT_STARTED'?'<button class="primary" onclick="setLearningProgress_(\''+arg(m.id)+'\',10,\'IN_PROGRESS\')">Start Learning</button>':'')+
      (status!=='COMPLETED'?'<button class="primary" onclick="setLearningProgress_(\''+arg(m.id)+'\',100,\'COMPLETED\')">Mark as Completed</button>':
      '<button class="secondary" disabled>✓ Completed</button>')+
    '</div></section>';
  if(status==='NOT_STARTED') setLearningProgress_(m.id,10,'IN_PROGRESS',true);
  window.scrollTo(0,0)
}

function renderLearningViewer_(m){
  if(!m.fileUrl) return '';
  var embed=drivePreviewUrl_(m.fileUrl);
  if(String(m.fileType||'').toUpperCase()==='PDF' && embed){
    return '<div class="learning-viewer"><iframe src="'+esc(embed)+'" title="'+esc(m.title||'Learning module')+'" loading="lazy"></iframe></div>';
  }
  return '<div class="detail-actions"><button class="secondary" onclick="openExternal_(\''+arg(m.fileUrl)+'\')">Open Learning Material</button></div>';
}

async function setLearningProgress_(moduleId,percent,status,silent){
  try{
    await server('setLearningProgress',token,moduleId,percent,status);
    learningCache=null;
    if(!silent){await renderLearning(true);toast(status==='COMPLETED'?'Module completed! 🎉':'Progress updated.')}
  }catch(e){if(!silent)handle(e)}
}

function statusLabel_(s){
  s=String(s||'NOT_STARTED').toUpperCase();
  return s==='COMPLETED'?'Completed':s==='IN_PROGRESS'?'In Progress':'Not Started';
}


/* =========================================================
   SHARED CONTENT HELPERS
   ========================================================= */

function loadingBlock_(eyebrow,title,message){
  return '<div class="page-head"><div class="eyebrow">'+esc(eyebrow)+'</div><h1>'+esc(title)+'</h1></div>'+
    '<div class="card content-loading"><div class="spinner"></div><p>'+esc(message)+'</p></div>';
}
function errorBlock_(eyebrow,title,e,retry){
  return '<div class="page-head"><div class="eyebrow">'+esc(eyebrow)+'</div><h1>'+esc(title)+'</h1></div>'+
    '<div class="card"><p class="muted">'+esc(cleanErr(e&&e.message?e.message:e))+'</p><button class="primary" onclick="'+retry+'">Try Again</button></div>';
}
function formatBody_(body){return esc(body||'').replace(/\r?\n/g,'<br>')}
function openExternal_(url){if(url)window.open(String(url),'_blank','noopener,noreferrer')}
function drivePreviewUrl_(url){
  var m=String(url||'').match(/drive\.google\.com\/file\/d\/([^\/\?]+)/i);
  return m?'https://drive.google.com/file/d/'+m[1]+'/preview':'';
}
function renderMediaPlayer_(title,url,type){
  url=String(url||'').trim();
  if(!url)return '';
  var drive=drivePreviewUrl_(url);
  if(drive) return '<section class="media-block"><div class="media-title">'+esc(title||'Video')+'</div><div class="media-frame"><iframe src="'+esc(drive)+'" title="'+esc(title||'INSPIRE media')+'" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe></div></section>';
  var yt=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/i);
  if(yt) return '<section class="media-block"><div class="media-title">'+esc(title||'Video')+'</div><div class="media-frame"><iframe src="https://www.youtube-nocookie.com/embed/'+esc(yt[1])+'" title="'+esc(title||'INSPIRE media')+'" allowfullscreen loading="lazy"></iframe></div></section>';
  if(/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return '<section class="media-block"><div class="media-title">'+esc(title||'Video')+'</div><video class="media-video" controls playsinline preload="metadata" src="'+esc(url)+'"></video></section>';
  return '<button class="secondary" onclick="openExternal_(\''+arg(url)+'\')">Open '+esc(title||'Media')+'</button>';
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
function clearSession(){token='';data=null;lastLoginPin='';employeeCenterCache=null;communityCache=null;learningCache=null;localStorage.removeItem(TOKEN_KEY)}
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