var data=null, token='', activeRoute='home', lastLoginPin='', employeeCenterCache=null, communityCache=null, bossCache=null, learningCache=null, handbookCache=null, handbookActiveChapter='';
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
  else if(r==='boss'){renderBoss()}
  else if(r==='learning'){renderLearning()}
  else{q('#content').innerHTML=modulePage(r)}
  window.scrollTo(0,0)
}
function home(){
  var fullName=(data.user.name||'sOWLdier').trim();
  var metrics=(data.metrics||[]).slice(0,3).map(function(m){
    return '<div class="card metric"><span>'+esc(m.METRIC)+'</span><strong>'+esc(m.VALUE)+'</strong></div>'
  }).join('');

  return '<div class="hero"><div class="eyebrow" style="color:#D7B97C">THE DIGITAL HOME OF sOWLdiers</div>'+
    '<h1>Hi, '+esc(fullName)+'! 👋</h1>'+
    '<p>One login for connection, learning, employee services, culture, and growth at Black Owl.</p></div>'+
    (data.forcePinChange?'<div class="notice">🔐 You are using a temporary PIN. Please create your personal PIN from Profile.</div>':'')+
    (metrics?'<div class="grid">'+metrics+'</div>':'')+

    '<div class="page-head home-section-head"><div class="eyebrow">DISCOVER BLACK OWL</div>'+
      '<h1>Know the journey. Live the culture.</h1>'+
      '<p>Get to know Black Owl, our direction, and the values behind the way we work.</p></div>'+
    '<div class="home-feature-grid">'+
      '<button class="home-feature-card about-card" onclick="openAboutUs()">'+
        '<div class="home-feature-icon">🦉</div>'+
        '<div><div class="eyebrow">ABOUT US</div><h3>Black Owl Indonesia</h3>'+
        '<p>Vision, mission, and the EPIIC values that guide every sOWLdier.</p></div><span class="feature-arrow">›</span>'+
      '</button>'+
      officialInstagramCard_()+
    '</div>'+

    '<div class="page-head home-section-head"><div class="eyebrow">YOUR INSPIRE</div><h1>Everything in one place</h1>'+
      '<p>Employee services, community, learning, culture, and growth.</p></div>'+
    '<div class="grid">'+
      data.menus.filter(function(m){return m.route!=='home'}).map(function(m){
        return '<button class="card module-card" style="text-align:left" onclick="go(\''+arg(m.route)+'\')">'+
          '<div class="icon">'+esc(m.icon)+'</div><h3>'+esc(m.label)+'</h3><p>'+esc(m.description||'INSPIRE module')+'</p></button>'
      }).join('')+
    '</div>';
}

function openAboutUs(){
  q('#content').innerHTML=
    '<button class="back-link" onclick="go(\'home\')">‹ Back to Home</button>'+
    '<section class="about-hero">'+
      '<div class="eyebrow">ABOUT BLACK OWL</div>'+
      '<h1>Creating the finest and innovative lifestyle experiences.</h1>'+
      '<p>Kami percaya bahwa setiap langkah besar dimulai dari kolaborasi yang kuat. INSPIRE menghadirkan informasi, aktivitas, serta pencapaian yang menjadi bagian dari perjalanan kita sebagai satu tim. Mari terus berkolaborasi, berbagi semangat, dan bangga menjadi bagian dari perjalanan ini.</p>'+
    '</section>'+
    '<section class="vision-mission-grid">'+
      '<div class="about-info-card"><div class="eyebrow">VISI</div><h2>Menjadi Pemimpin di Bidang Industri <em>Lifestyle</em></h2></div>'+
      '<div class="about-info-card"><div class="eyebrow">MISI</div><h2>Menciptakan Pengalaman untuk Tamu yang Luar Biasa dan Inovatif</h2></div>'+
    '</section>'+
    '<div class="page-head section-gap"><div class="eyebrow">CORE VALUES</div><h1>EPIIC</h1>'+
      '<p>The values behind how we work, collaborate, and serve.</p></div>'+
    '<section class="epiic-grid">'+
      epiicCard_('E','Excellence','Selalu mengedepankan kualitas dan hasil terbaik.')+
      epiicCard_('P','Persistence','Terus maju dan pantang menyerah menghadapi tantangan.')+
      epiicCard_('I','Integrity','Menjunjung kejujuran dan konsistensi dalam setiap tindakan.')+
      epiicCard_('I','Innovative','Berpikir kreatif dan berani menciptakan hal baru.')+
      epiicCard_('C','Customer Centric','Menghadirkan pengalaman terbaik bagi setiap pelanggan.')+
    '</section>'+
    officialInstagramFull_();
  window.scrollTo(0,0);
}

function epiicCard_(letter,title,body){
  return '<div class="epiic-card"><div class="epiic-letter">'+esc(letter)+'</div><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p></div>';
}

function officialInstagramCard_(){
  return '<div class="home-feature-card social-card">'+
    '<div class="home-feature-icon">📱</div><div class="social-card-copy">'+
      '<div class="eyebrow">STAY CONNECTED</div><h3>Official Black Owl Instagram</h3>'+
      '<p>sOWLdiers, make sure you follow all official Black Owl accounts.</p>'+
      '<div class="social-mini-list">'+
        socialMini_('@journeywithblackowl','https://www.instagram.com/journeywithblackowl/')+
        socialMini_('@blackowl.jkt','https://www.instagram.com/blackowl.jkt/')+
        socialMini_('@blackowl.scbd','https://www.instagram.com/blackowl.scbd/')+
      '</div>'+
      '<button class="text-link" onclick="openAboutUs()">View all official accounts →</button>'+
    '</div></div>';
}

function officialInstagramFull_(){
  return '<div class="page-head section-gap"><div class="eyebrow">STAY CONNECTED</div><h1>Official Black Owl Instagram</h1>'+
    '<p>Follow seluruh akun Instagram official Black Owl untuk update activity, event, campaign, dan perjalanan brand kita.</p></div>'+
    '<section class="social-grid">'+
      socialAccount_('@journeywithblackowl','Black Owl Journey','https://www.instagram.com/journeywithblackowl/')+
      socialAccount_('@blackowl.jkt','Black Owl Jakarta','https://www.instagram.com/blackowl.jkt/')+
      socialAccount_('@blackowl.scbd','Black Owl SCBD','https://www.instagram.com/blackowl.scbd/')+
      socialAccount_('@blackowl.sby','Black Owl Surabaya','https://www.instagram.com/blackowl.sby/')+
      socialAccount_('@blackowl.mdn','Black Owl Medan','https://www.instagram.com/blackowl.mdn/')+
      socialAccount_('@blackowl.banquet','Black Owl Banquet','https://www.instagram.com/blackowl.banquet/')+
    '</section>';
}

function socialMini_(handle,url){
  return '<button onclick="openExternal_(\''+arg(url)+'\')">'+esc(handle)+'</button>';
}

function socialAccount_(handle,label,url){
  return '<button class="social-account-card" onclick="openExternal_(\''+arg(url)+'\')">'+
    '<div class="social-account-icon">◎</div><div><strong>'+esc(handle)+'</strong><span>'+esc(label)+'</span></div><div class="feature-arrow">↗</div></button>';
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
  var profilePhotoUrl=profileImageUrl_(p.photoUrl);
  var photo=profilePhotoUrl
    ? '<div class="ec-photo-wrap"><img class="ec-photo" src="'+esc(profilePhotoUrl)+'" alt="'+esc(p.name)+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="ec-photo ec-photo-fallback" style="display:none">'+initials(p.name)+'</div></div>'
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
    '<div class="page-head section-gap"><div class="eyebrow">EMPLOYEE RESOURCES</div><h2>Everything you need in one place</h2><p>Policies, forms, benefits, directory, and Whistle Blowing System.</p></div>'+
    '<section class="ec-resource-grid">'+resources.map(ecResourceCard_).join('')+'</section>';
}

function profileImageUrl_(url){
  var clean=String(url||'').trim();
  if(!clean)return '';

  var drive=
    clean.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/i) ||
    clean.match(/[?&]id=([^&]+)/i);

  if(drive && drive[1]){
    return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(drive[1])+'&sz=w500';
  }

  return clean;
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
  if(String(id||'').toUpperCase()==='HANDBOOK'){openHandbook();return}
  var list=(employeeCenterCache&&employeeCenterCache.resources)||[];
  var r=list.find(function(x){return String(x.id)===String(id)});
  if(!r){toast('Resource not found.');return}

  var actions='';
  if(r.primaryActionLabel) actions+=resourceActionButton_(r.primaryActionLabel,r.primaryUrl,true);
  if(r.secondaryActionLabel) actions+=resourceActionButton_(r.secondaryActionLabel,r.secondaryUrl,false);

  var dynamicActions=(r.actions||[]).length
    ? '<div class="resource-action-list">'+(r.actions||[]).map(resourceActionCard_).join('')+'</div>'
    : '';

  q('#content').innerHTML='<button class="back-link" onclick="renderEmployeeCenter()">‹ Back to Employee Center</button>'+
    '<section class="detail-card"><div class="detail-icon">'+esc(r.icon||'🔗')+'</div><div class="eyebrow">EMPLOYEE RESOURCE</div>'+
    '<h1>'+esc(r.contentTitle||r.title||'Resource')+'</h1><p class="detail-lead">'+esc(r.description||'')+'</p>'+
    '<div class="detail-body">'+formatBody_(r.contentBody||'')+'</div>'+
    renderMediaPlayer_(r.videoTitle||'',r.videoUrl||'','video')+
    dynamicActions+
    (actions?'<div class="detail-actions">'+actions+'</div>':'')+'</section>';
  window.scrollTo(0,0)
}

function resourceActionCard_(a){
  return '<button class="resource-action-card" onclick="openExternal_(\''+arg(a.url||'')+'\')">'+
    '<div class="resource-action-icon">'+esc(a.icon||'↗')+'</div>'+
    '<div><strong>'+esc(a.label||'Open')+'</strong><span>'+esc(a.description||'')+'</span></div>'+
    '<div class="feature-arrow">↗</div></button>';
}

function resourceActionButton_(label,url,primary){
  var cls=primary?'primary':'secondary';
  if(!String(url||'').trim()) return '<button class="'+cls+'" onclick="toast(\''+arg(label)+' is being prepared.\')">'+esc(label)+'</button>';
  return '<button class="'+cls+'" onclick="openExternal_(\''+arg(url)+'\')">'+esc(label)+'</button>';
}



/* =========================================================
   NATIVE EMPLOYEE HANDBOOK — V1.5
   ========================================================= */

async function openHandbook(force){
  var root=q('#content');
  root.innerHTML=loadingBlock_('EMPLOYEE HANDBOOK','Black Owl Indonesia','Loading Employee Handbook…');

  try{
    if(force||!handbookCache) handbookCache=await server('getEmployeeCenterData',token,'HANDBOOK');
    var chapters=(handbookCache&&handbookCache.chapters)||[];
    if(!handbookActiveChapter && chapters.length) handbookActiveChapter=chapters[0].id;
    root.innerHTML=handbookPage_(handbookCache);
    renderHandbookChapter_(handbookActiveChapter);
  }catch(e){
    handle(e);
    root.innerHTML=errorBlock_('EMPLOYEE HANDBOOK','Unable to load Employee Handbook',e,'handbookCache=null;openHandbook(true)');
  }
}

function handbookPage_(d){
  var meta=(d&&d.meta)||{};
  var chapters=(d&&d.chapters)||[];

  return '<button class="back-link" onclick="renderEmployeeCenter()">‹ Back to Employee Center</button>'+
    '<section class="handbook-hero">'+
      '<div><div class="eyebrow">EMPLOYEE HANDBOOK</div>'+
      '<h1>'+esc(meta.title||'EMPLOYEE HANDBOOK')+'</h1>'+
      '<p>'+esc(meta.company||'BLACK OWL INDONESIA')+' · '+esc(meta.version||'')+
        (meta.effectiveDate?' · Effective '+esc(meta.effectiveDate):'')+'</p></div>'+
      '<div class="handbook-badge">📖</div>'+
    '</section>'+
    '<section class="handbook-layout">'+
      '<aside class="handbook-sidebar">'+
        '<div class="handbook-search"><span>⌕</span><input id="handbookSearch" placeholder="Search handbook…" oninput="searchHandbook_()"></div>'+
        '<div id="handbookSearchResults" class="handbook-search-results hidden"></div>'+
        '<div class="handbook-toc-title">TABLE OF CONTENTS</div>'+
        '<div class="handbook-toc">'+chapters.map(handbookTocButton_).join('')+'</div>'+
        (meta.sourceUrl?'<button class="handbook-source" onclick="openExternal_(\''+arg(meta.sourceUrl)+'\')">Open Original Document ↗</button>':'')+
      '</aside>'+
      '<main id="handbookContent" class="handbook-content"></main>'+
    '</section>';
}

function handbookTocButton_(ch){
  var active=String(ch.id)===String(handbookActiveChapter)?' active':'';
  return '<button class="handbook-toc-item'+active+'" data-handbook-chapter="'+esc(ch.id)+'" onclick="openHandbookChapter_(\''+arg(ch.id)+'\')">'+
    '<span>'+String(Number(ch.no||0)).padStart(2,'0')+'</span><strong>'+esc(ch.title||'Chapter')+'</strong></button>';
}

function openHandbookChapter_(chapterId){
  handbookActiveChapter=chapterId;
  qa('[data-handbook-chapter]').forEach(function(b){
    b.classList.toggle('active',b.getAttribute('data-handbook-chapter')===chapterId);
  });
  var search=q('#handbookSearch');
  if(search && search.value) search.value='';
  var sr=q('#handbookSearchResults');
  if(sr){sr.classList.add('hidden');sr.innerHTML=''}
  renderHandbookChapter_(chapterId);
  if(window.innerWidth<760){
    var target=q('#handbookContent');
    if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

function renderHandbookChapter_(chapterId, needle){
  var root=q('#handbookContent');
  if(!root)return;
  var chapters=(handbookCache&&handbookCache.chapters)||[];
  var ch=chapters.find(function(x){return String(x.id)===String(chapterId)});
  if(!ch){root.innerHTML='<div class="card">Chapter not found.</div>';return}

  handbookActiveChapter=ch.id;
  root.innerHTML=
    '<article class="handbook-chapter">'+
      '<div class="handbook-chapter-no">CHAPTER '+String(Number(ch.no||0)).padStart(2,'0')+'</div>'+
      '<h1>'+esc(ch.title||'')+'</h1>'+
      '<div class="handbook-divider"></div>'+
      '<div class="handbook-prose">'+(Number(ch.no||0)===3?renderGroomingChapter_(ch.blocks||[],needle||''):renderHandbookBlocks_(ch.blocks||[],needle||''))+'</div>'+
      handbookChapterNav_(ch.no)+
    '</article>';
}


/* =========================================================
   VISUAL GROOMING GUIDE — CHAPTER 03
   Preserves handbook wording; improves presentation only.
   ========================================================= */

function groomingVisualMap_(){
  return {
    'floor-room':[
      {src:'assets/handbook/penampilan-diri/floor-supervisor-expediter.jpg',caption:'Floor & Room — Supervisor / Expediter'},
      {src:'assets/handbook/penampilan-diri/floor-server.jpg',caption:'Floor & Room — Server'}
    ],
    'gro':[
      {src:'assets/handbook/penampilan-diri/gro-staff.jpg',caption:'Guest Relation Officer (GRO)'},
      {src:'assets/handbook/penampilan-diri/gro-supervisor-pa.jpg',caption:'GRO — Supervisor / Personal Assistant'}
    ],
    'cashier':[
      {src:'assets/handbook/penampilan-diri/cashier.jpg',caption:'Cashier'}
    ],
    'bar-shisha':[
      {src:'assets/handbook/penampilan-diri/bartender.jpg',caption:'Bartender'},
      {src:'assets/handbook/penampilan-diri/bar-shisha.jpg',caption:'Bar & Shisha'}
    ],
    'kitchen':[
      {src:'assets/handbook/penampilan-diri/kitchen.jpg',caption:'Kitchen / Steward'}
    ],
    'housekeeping':[
      {src:'assets/handbook/penampilan-diri/housekeeping.jpg',caption:'Housekeeping'}
    ],
    'guard':[
      {src:'assets/handbook/penampilan-diri/guard.jpg',caption:'Guard'}
    ],
    'central-kitchen':[
      {src:'assets/handbook/penampilan-diri/central-kitchen.jpg',caption:'Central Kitchen'}
    ]
  };
}

function groomingSectionKey_(text){
  var t=String(text||'').toLowerCase().replace(/\s+/g,' ').trim();
  t=t.replace(/^\d+[\.\)]\s*/,'');
  if(t.indexOf('floor dan room')===0 || t.indexOf('floor & room')===0)return 'floor-room';
  if(t.indexOf('guest relation officer')===0 || t==='gro')return 'gro';
  if(t.indexOf('cashier')===0)return 'cashier';
  if(t.indexOf('bar & shisha')===0 || t.indexOf('bar dan shisha')===0)return 'bar-shisha';
  if(t.indexOf('central kitchen')===0)return 'central-kitchen';
  if(t.indexOf('kitchen')===0)return 'kitchen';
  if(t.indexOf('housekeeping')===0)return 'housekeeping';
  if(t.indexOf('guard')===0)return 'guard';
  return '';
}

function groomingSectionLabel_(key){
  return {
    'floor-room':'Floor & Room (Service)',
    'gro':'Guest Relation Officer (GRO)',
    'cashier':'Cashier',
    'bar-shisha':'Bar & Shisha',
    'kitchen':'Kitchen',
    'housekeeping':'Housekeeping',
    'guard':'Guard',
    'central-kitchen':'Central Kitchen'
  }[key]||key;
}

function renderGroomingGallery_(key){
  var items=(groomingVisualMap_()[key]||[]);
  if(!items.length)return '';
  return '<div class="grooming-visual-label"><span>VISUAL REFERENCE</span><small>Referensi dari Employee Handbook resmi</small></div>'+
    '<div class="grooming-gallery">'+items.map(function(x){
      return '<figure class="grooming-visual-card">'+
        '<button class="grooming-image-button" onclick="openGroomingImage_(\''+arg(x.src)+'\',\''+arg(x.caption)+'\')" aria-label="Open '+esc(x.caption)+'">'+
          '<img src="'+esc(x.src)+'" alt="'+esc(x.caption)+'" loading="lazy">'+
        '</button>'+
        '<figcaption>'+esc(x.caption)+'</figcaption>'+
      '</figure>';
    }).join('')+'</div>';
}

function openGroomingImage_(src,caption){
  openModal('<div class="grooming-image-modal">'+
    '<div class="eyebrow">VISUAL REFERENCE</div><h2>'+esc(caption||'Penampilan Diri')+'</h2>'+
    '<img src="'+esc(src)+'" alt="'+esc(caption||'Penampilan Diri')+'">'+
    '<p class="muted">Referensi visual dari Employee Handbook Black Owl Indonesia.</p>'+
  '</div>');
}

function scrollGroomingSection_(key){
  var el=document.getElementById('grooming-'+key);
  if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
}

function renderGroomingChapter_(blocks,needle){
  var keys=['floor-room','gro','cashier','bar-shisha','kitchen','housekeeping','guard','central-kitchen'];
  var intro=[];
  var groups={};
  keys.forEach(function(k){groups[k]=[]});
  var current='';

  (blocks||[]).forEach(function(b){
    var text=String(b.text||'').trim();
    if(!text)return;
    var key=groomingSectionKey_(text);
    if(key){
      current=key;
      return;
    }
    if(current)groups[current].push(b);
    else intro.push(b);
  });

  var quickNav='<div class="grooming-quick-wrap">'+
    '<div class="grooming-quick-title"><span>QUICK GUIDE</span><strong>Pilih area kerja</strong></div>'+
    '<div class="grooming-quick-nav">'+keys.map(function(k){
      return '<button onclick="scrollGroomingSection_(\''+k+'\')">'+esc(groomingSectionLabel_(k))+' <span>↓</span></button>';
    }).join('')+'</div>'+
  '</div>';

  var introHtml='<div class="grooming-intro">'+
    '<div class="grooming-intro-icon">✨</div>'+
    '<div><div class="eyebrow">PERSONAL APPEARANCE STANDARD</div>'+
    '<h2>Look neat. Feel confident. Represent Black Owl.</h2>'+
    '<div class="grooming-intro-copy">'+renderHandbookBlocks_(intro,needle||'')+'</div>'+
    '<div class="grooming-note">Visual membantu sebagai referensi. Ketentuan tertulis pada Employee Handbook tetap menjadi acuan utama.</div>'+
    '</div></div>';

  var sections=keys.map(function(k,index){
    var list=groups[k]||[];
    if(!list.length && !(groomingVisualMap_()[k]||[]).length)return '';
    return '<section class="grooming-section" id="grooming-'+k+'">'+
      '<div class="grooming-section-head">'+
        '<span class="grooming-section-no">'+String(index+1).padStart(2,'0')+'</span>'+
        '<div><div class="eyebrow">GROOMING STANDARD</div><h2>'+esc(groomingSectionLabel_(k))+'</h2></div>'+
      '</div>'+
      renderGroomingGallery_(k)+
      '<div class="grooming-rules">'+renderHandbookBlocks_(list,needle||'')+'</div>'+
    '</section>';
  }).join('');

  return quickNav+introHtml+sections;
}


function renderHandbookBlocks_(blocks,needle){
  var html='',listOpen=false;
  (blocks||[]).forEach(function(b){
    var type=String(b.type||'PARAGRAPH').toUpperCase();
    if(type==='CHAPTER')return;

    if(type==='LIST_ITEM'){
      if(!listOpen){html+='<ul>';listOpen=true}
      html+='<li>'+highlightHandbook_(b.text||'',needle)+'</li>';
      return;
    }

    if(listOpen){html+='</ul>';listOpen=false}

    if(type==='SUBHEADING'){
      html+='<h2>'+highlightHandbook_(b.text||'',needle)+'</h2>';
    }else{
      html+='<p>'+highlightHandbook_(b.text||'',needle)+'</p>';
    }
  });
  if(listOpen) html+='</ul>';
  return html;
}

function handbookChapterNav_(currentNo){
  var chapters=(handbookCache&&handbookCache.chapters)||[];
  var idx=chapters.findIndex(function(x){return Number(x.no)===Number(currentNo)});
  var prev=idx>0?chapters[idx-1]:null;
  var next=idx>=0&&idx<chapters.length-1?chapters[idx+1]:null;
  return '<div class="handbook-chapter-nav">'+
    (prev?'<button class="secondary" onclick="openHandbookChapter_(\''+arg(prev.id)+'\')">← '+esc(prev.title)+'</button>':'<span></span>')+
    (next?'<button class="primary" onclick="openHandbookChapter_(\''+arg(next.id)+'\')">'+esc(next.title)+' →</button>':'')+
  '</div>';
}

function searchHandbook_(){
  var input=q('#handbookSearch');
  var box=q('#handbookSearchResults');
  if(!input||!box)return;

  var term=String(input.value||'').trim().toLowerCase();
  if(term.length<2){
    box.classList.add('hidden');
    box.innerHTML='';
    return;
  }

  var hits=[];
  ((handbookCache&&handbookCache.chapters)||[]).forEach(function(ch){
    (ch.blocks||[]).forEach(function(b){
      var text=String(b.text||'');
      if(text.toLowerCase().indexOf(term)>=0){
        hits.push({chapter:ch,block:b,text:text});
      }
    });
  });

  hits=hits.slice(0,40);
  box.classList.remove('hidden');
  box.innerHTML=
    '<div class="handbook-result-count">'+hits.length+(hits.length===40?' top':'')+' result'+(hits.length===1?'':'s')+'</div>'+
    (hits.length?hits.map(function(h){
      return '<button class="handbook-result" onclick="openHandbookSearchResult_(\''+arg(h.chapter.id)+'\',\''+arg(input.value)+'\')">'+
        '<strong>'+String(Number(h.chapter.no||0)).padStart(2,'0')+' · '+esc(h.chapter.title)+'</strong>'+
        '<span>'+esc(handbookExcerpt_(h.text,term))+'</span></button>';
    }).join(''):'<div class="handbook-no-result">No matching handbook content.</div>');
}

function handbookExcerpt_(text,term){
  var raw=String(text||''),low=raw.toLowerCase(),at=low.indexOf(String(term||'').toLowerCase());
  if(at<0)return raw.slice(0,150);
  var start=Math.max(0,at-55),end=Math.min(raw.length,at+String(term||'').length+95);
  return (start>0?'…':'')+raw.slice(start,end)+(end<raw.length?'…':'');
}

function openHandbookSearchResult_(chapterId,term){
  handbookActiveChapter=chapterId;
  qa('[data-handbook-chapter]').forEach(function(b){
    b.classList.toggle('active',b.getAttribute('data-handbook-chapter')===chapterId);
  });
  renderHandbookChapter_(chapterId,term||'');
  var target=q('#handbookContent');
  if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
}

function highlightHandbook_(text,needle){
  var safe=esc(text||'');
  var n=String(needle||'').trim();
  if(!n)return safe;
  try{
    var re=new RegExp('('+escapeRegExp_(n)+')','ig');
    return safe.replace(re,'<mark>$1</mark>');
  }catch(_){return safe}
}

function escapeRegExp_(s){
  var specials='\\\\^$.*+?()[]{}|';
  return String(s||'').split('').map(function(ch){
    return specials.indexOf(ch)>=0?'\\\\'+ch:ch;
  }).join('');
}

/* =========================================================
   COMMUNITY PILOT');
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
  else if(p.imageUrl) media='<img class="post-image" src="'+esc(contentImageUrl_(p.imageUrl))+'" alt="'+esc(p.title||'Community post')+'" loading="lazy">';

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

function contentImageUrl_(url){
  var clean=String(url||'').trim();
  if(!clean)return '';
  var drive=
    clean.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/i) ||
    clean.match(/[?&]id=([^&]+)/i);
  if(drive&&drive[1]) return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(drive[1])+'&sz=w1600';
  return clean;
}

/* =========================================================
   BOSS — BLACK OWL SPORTS SERIES CMS
   Data source: Posts sheet, CATEGORY = BOSS
   ========================================================= */

async function renderBoss(force){
  var root=q('#content');
  root.innerHTML=loadingBlock_('BOSS','Black Owl Sports Series','Loading BOSS activities…');
  try{
    if(force||!bossCache) bossCache=await server('getCommunityData',token);
    root.innerHTML=bossPage_(bossCache);
  }catch(e){
    handle(e);
    root.innerHTML=errorBlock_('BOSS','Unable to load BOSS',e,'bossCache=null;renderBoss(true)');
  }
}

function bossPage_(d){
  var all=(d&&d.posts)||[];
  var events=all.filter(function(p){return String(p.category||'').toUpperCase()==='BOSS'});
  events.sort(function(a,b){
    var ap=a.pinned?1:0,bp=b.pinned?1:0;
    if(ap!==bp)return bp-ap;
    return String(b.eventDate||b.createdAt||'').localeCompare(String(a.eventDate||a.createdAt||''));
  });

  return '<section class="boss-hero">'+
    '<div><div class="eyebrow">BLACK OWL SPORTS SERIES</div><h1>Move together. Go beyond.</h1>'+
    '<p>Aktivitas olahraga, wellbeing, dan employee engagement untuk seluruh sOWLdiers.</p></div>'+
    '<div class="boss-hero-icon">🏃</div></section>'+
    (events.length?'<div class="boss-grid">'+events.map(bossCard_).join('')+'</div>':
      '<div class="card empty-state"><div>🏆</div><h2>No BOSS activity yet</h2><p>Aktivitas yang berstatus PUBLISHED dan CATEGORY = BOSS akan muncul otomatis di sini.</p></div>');
}

function bossCard_(p){
  var img=p.imageUrl?'<img class="boss-card-image" src="'+esc(contentImageUrl_(p.imageUrl))+'" alt="'+esc(p.title||'BOSS activity')+'" loading="lazy">':'';
  var date=p.eventDate?'<div class="boss-date">📅 '+esc(p.eventDate)+'</div>':'';
  var type=String(p.mediaType||'').toUpperCase();
  var action='';
  if(p.mediaUrl){
    if(type==='VIDEO') action='<button class="secondary boss-cta" onclick="openExternal_(\''+arg(p.mediaUrl)+'\')">▶ '+esc(p.mediaTitle||'Watch Video')+'</button>';
    else action='<button class="primary boss-cta" onclick="openExternal_(\''+arg(p.mediaUrl)+'\')">'+esc(p.mediaTitle||'Open Link')+' ↗</button>';
  }
  return '<article class="boss-card">'+
    img+
    '<div class="boss-card-body">'+
      '<div class="boss-card-meta"><span>BOSS</span>'+(p.pinned?'<strong>FEATURED</strong>':'')+'</div>'+
      '<h2>'+esc(p.title||'BOSS Activity')+'</h2>'+
      date+
      '<p>'+esc(p.body||'')+'</p>'+
      action+
    '</div></article>';
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
  var departments=[];
  var periods=[];

  modules.forEach(function(m){
    var dept=String(m.category||'General');
    if(departments.indexOf(dept)<0) departments.push(dept);
    var period=learningPeriod_(m);
    if(period && periods.indexOf(period)<0) periods.push(period);
  });

  departments.sort();
  periods.sort(function(a,b){return learningPeriodKey_(b)-learningPeriodKey_(a)});

  return '<div class="page-head"><div class="eyebrow">LEARNING</div><h1>Operational Learning Library</h1>'+
    '<p>'+modules.length+' learning modules available. Search by topic, department, or training period.</p></div>'+
    '<section class="learning-toolbar">'+
      '<div class="learning-search"><span>⌕</span><input id="learningSearch" placeholder="Search learning module…" oninput="applyLearningFilters_()"></div>'+
      '<select id="learningDeptFilter" onchange="applyLearningFilters_()"><option value="">All Departments</option>'+
        departments.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join('')+
      '</select>'+
      '<select id="learningPeriodFilter" onchange="applyLearningFilters_()"><option value="">All Periods</option>'+
        periods.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join('')+
      '</select>'+
    '</section>'+
    '<div id="learningResultMeta" class="learning-result-meta"></div>'+
    '<div id="learningResults" class="learning-grid">'+modules.map(learningCard_).join('')+'</div>';
}

function learningPeriod_(m){
  var d=String(m.description||'');
  var parts=d.split('•').map(function(x){return x.trim()});
  return parts.length>=3?parts[1]:'';
}

function learningPeriodKey_(period){
  var map={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
  var p=String(period||'').split(/\s+/);
  return Number(p[1]||0)*100+(map[p[0]]||0);
}

function applyLearningFilters_(){
  var modules=(learningCache&&learningCache.modules)||[];
  var search=(q('#learningSearch')&&q('#learningSearch').value||'').toLowerCase().trim();
  var dept=(q('#learningDeptFilter')&&q('#learningDeptFilter').value||'');
  var period=(q('#learningPeriodFilter')&&q('#learningPeriodFilter').value||'');

  var filtered=modules.filter(function(m){
    var hay=[m.title,m.category,m.description,m.fileType].join(' ').toLowerCase();
    if(search && hay.indexOf(search)<0) return false;
    if(dept && String(m.category||'')!==dept) return false;
    if(period && learningPeriod_(m)!==period) return false;
    return true;
  });

  var result=q('#learningResults');
  var meta=q('#learningResultMeta');
  if(meta) meta.textContent=filtered.length+' module'+(filtered.length===1?'':'s')+' shown';
  if(result) result.innerHTML=filtered.length
    ? filtered.map(learningCard_).join('')
    : '<div class="card empty-state"><div>🎓</div><h2>No modules found</h2><p>Try another search or filter.</p></div>';
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
function clearSession(){token='';data=null;lastLoginPin='';employeeCenterCache=null;communityCache=null;bossCache=null;learningCache=null;handbookCache=null;handbookActiveChapter='';localStorage.removeItem(TOKEN_KEY)}
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