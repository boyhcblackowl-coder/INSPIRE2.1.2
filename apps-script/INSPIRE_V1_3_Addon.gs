/* =========================================================
   INSPIRE V1.3 ADD-ON
   Add this as a NEW .gs file in the existing Apps Script project.
   Do NOT replace login/session/security functions in Code.gs.
   Requires existing helpers from INSPIRE V5:
   requireSession_, rows_, sheet_, id_, audit_, clean_, formatDate_
   ========================================================= */

function getEmployeeCenterData(sessionToken) {
  var s = requireSession_(sessionToken);
  var emp = s.employee;
  var role = String(emp.ROLE || 'USER').toUpperCase();
  var division = String(emp.DIVISION || '').toUpperCase();
  var outlet = String(emp.OUTLET || '').toUpperCase();

  var resources = rows_('Employee_Resources')
    .filter(function(r){ return String(r.ENABLED || '').toUpperCase() === 'TRUE'; })
    .filter(function(r){ return inspireScopeAllowed_(r.ALLOWED_ROLES, role); })
    .filter(function(r){ return inspireScopeAllowed_(r.ALLOWED_DIVISIONS, division); })
    .filter(function(r){ return inspireScopeAllowed_(r.ALLOWED_OUTLETS, outlet); })
    .sort(function(a,b){ return Number(a.SORT_ORDER || 999) - Number(b.SORT_ORDER || 999); })
    .map(function(r){
      return {
        id: r.RESOURCE_ID || '',
        category: r.CATEGORY || 'EMPLOYEE_RESOURCES',
        title: r.TITLE || '',
        description: r.DESCRIPTION || '',
        icon: r.ICON || '🔗',
        contentTitle: r.CONTENT_TITLE || r.TITLE || '',
        contentBody: r.CONTENT_BODY || '',
        primaryActionLabel: r.PRIMARY_ACTION_LABEL || '',
        primaryUrl: r.PRIMARY_URL || '',
        secondaryActionLabel: r.SECONDARY_ACTION_LABEL || '',
        secondaryUrl: r.SECONDARY_URL || '',
        videoTitle: r.VIDEO_TITLE || '',
        videoUrl: r.VIDEO_URL || ''
      };
    });

  return {
    profile: {
      employeeId: emp.EMPLOYEE_ID || '',
      name: emp.NAME || '',
      email: emp.EMAIL || '',
      division: emp.DIVISION || '',
      outlet: emp.OUTLET || '',
      position: emp.POSITION || '',
      photoUrl: emp.PHOTO_URL || '',
      status: emp.STATUS || '',
      joinDate: emp.JOIN_DATE || '',
      role: role
    },
    resources: resources
  };
}

function getCommunityData(sessionToken) {
  var s = requireSession_(sessionToken);
  var emp = s.employee;
  var email = String(emp.EMAIL || '').toLowerCase();

  var posts = rows_('Posts')
    .filter(function(p){ return String(p.STATUS || '').toUpperCase() === 'PUBLISHED'; });

  var likes = rows_('Likes');
  var comments = rows_('Comments')
    .filter(function(c){ return String(c.STATUS || '').toUpperCase() === 'VISIBLE'; });

  var postLikes = {};
  var likedByMe = {};
  likes.forEach(function(l){
    if (String(l.ITEM_TYPE || '').toUpperCase() !== 'POST') return;
    var id = String(l.ITEM_ID || '');
    postLikes[id] = (postLikes[id] || 0) + 1;
    if (String(l.USER_EMAIL || '').toLowerCase() === email) likedByMe[id] = true;
  });

  var top = {}, replies = {};
  comments.forEach(function(c){
    var postId = String(c.POST_ID || '');
    var parent = String(c.PARENT_COMMENT_ID || '');
    if (parent) {
      if (!replies[parent]) replies[parent] = [];
      replies[parent].push(c);
    } else {
      if (!top[postId]) top[postId] = [];
      top[postId].push(c);
    }
  });

  return {
    posts: posts
      .sort(function(a,b){ return String(b.CREATED_AT || '').localeCompare(String(a.CREATED_AT || '')); })
      .map(function(p){
        var id = String(p.POST_ID || '');
        var cmts = (top[id] || []).map(function(c){
          var cid = String(c.COMMENT_ID || '');
          return {
            id: cid,
            userName: c.USER_NAME || 'sOWLdier',
            comment: c.COMMENT || '',
            createdAt: c.CREATED_AT || '',
            replies: (replies[cid] || []).map(function(r){
              return {
                id: r.COMMENT_ID || '',
                userName: r.USER_NAME || 'sOWLdier',
                comment: r.COMMENT || '',
                createdAt: r.CREATED_AT || ''
              };
            })
          };
        });

        return {
          id: id,
          authorName: p.AUTHOR_NAME || 'Black Owl',
          division: p.DIVISION || '',
          category: p.CATEGORY || '',
          title: p.TITLE || '',
          body: p.BODY || '',
          imageUrl: p.IMAGE_URL || '',
          eventDate: p.EVENT_DATE || '',
          pinned: String(p.PINNED || '').toUpperCase() === 'TRUE',
          createdAt: p.CREATED_AT || '',
          mediaType: p.MEDIA_TYPE || '',
          mediaUrl: p.MEDIA_URL || '',
          mediaTitle: p.MEDIA_TITLE || '',
          likeCount: postLikes[id] || 0,
          likedByMe: Boolean(likedByMe[id]),
          commentCount: cmts.reduce(function(total,c){ return total + 1 + (c.replies || []).length; },0),
          comments: cmts
        };
      })
  };
}

function togglePostLike(sessionToken, postId) {
  var s = requireSession_(sessionToken);
  var emp = s.employee;
  var email = String(emp.EMAIL || '').toLowerCase();
  postId = clean_(postId || '', 120);

  if (!postId) throw new Error('Post ID is required.');

  var sh = sheet_('Likes');
  var values = sh.getDataRange().getValues();
  if (values.length < 1) throw new Error('Likes sheet is not configured.');

  var h = values[0].map(String);
  var iType = h.indexOf('ITEM_TYPE');
  var iItem = h.indexOf('ITEM_ID');
  var iEmail = h.indexOf('USER_EMAIL');

  for (var i = values.length - 1; i >= 1; i--) {
    if (
      String(values[i][iType] || '').toUpperCase() === 'POST' &&
      String(values[i][iItem] || '') === postId &&
      String(values[i][iEmail] || '').toLowerCase() === email
    ) {
      sh.deleteRow(i + 1);
      audit_(emp.EMPLOYEE_ID, 'UNLIKE_POST', postId, '');
      return {liked:false};
    }
  }

  sh.appendRow([
    id_('LIKE'),
    'POST',
    postId,
    emp.EMAIL || '',
    new Date()
  ]);
  audit_(emp.EMPLOYEE_ID, 'LIKE_POST', postId, '');
  return {liked:true};
}

function addPostComment(sessionToken, postId, comment) {
  var s = requireSession_(sessionToken);
  var emp = s.employee;
  postId = clean_(postId || '', 120);
  comment = clean_(comment || '', 600);
  if (!postId || !comment) throw new Error('Post and comment are required.');

  var id = id_('CMT');
  sheet_('Comments').appendRow([
    id,
    postId,
    '',
    emp.EMAIL || '',
    emp.NAME || emp.EMPLOYEE_ID || 'sOWLdier',
    comment,
    new Date(),
    'VISIBLE'
  ]);
  audit_(emp.EMPLOYEE_ID, 'COMMENT_POST', postId, id);
  return {commentId:id};
}

function addCommentReply(sessionToken, postId, parentCommentId, comment) {
  var s = requireSession_(sessionToken);
  var emp = s.employee;
  postId = clean_(postId || '', 120);
  parentCommentId = clean_(parentCommentId || '', 120);
  comment = clean_(comment || '', 600);

  if (!postId || !parentCommentId || !comment) {
    throw new Error('Post, parent comment, and reply are required.');
  }

  var id = id_('CMT');
  sheet_('Comments').appendRow([
    id,
    postId,
    parentCommentId,
    emp.EMAIL || '',
    emp.NAME || emp.EMPLOYEE_ID || 'sOWLdier',
    comment,
    new Date(),
    'VISIBLE'
  ]);
  audit_(emp.EMPLOYEE_ID, 'REPLY_COMMENT', parentCommentId, id);
  return {commentId:id};
}

function getLearningData(sessionToken) {
  var s = requireSession_(sessionToken);
  var emp = s.employee;
  var role = String(emp.ROLE || 'USER').toUpperCase();
  var division = String(emp.DIVISION || '').toUpperCase();
  var outlet = String(emp.OUTLET || '').toUpperCase();

  var progress = {};
  rows_('Learning_Progress').forEach(function(p){
    if (String(p.EMPLOYEE_ID || '').toUpperCase() !== String(emp.EMPLOYEE_ID || '').toUpperCase()) return;
    progress[String(p.MODULE_ID || '')] = p;
  });

  var modules = rows_('Learning_Modules')
    .filter(function(m){ return String(m.STATUS || '').toUpperCase() === 'PUBLISHED'; })
    .filter(function(m){ return inspireScopeAllowed_(m.ALLOWED_ROLES, role); })
    .filter(function(m){ return inspireScopeAllowed_(m.ALLOWED_DIVISIONS, division); })
    .filter(function(m){ return inspireScopeAllowed_(m.ALLOWED_OUTLETS, outlet); })
    .sort(function(a,b){ return Number(a.SORT_ORDER || 999) - Number(b.SORT_ORDER || 999); })
    .map(function(m){
      var p = progress[String(m.MODULE_ID || '')] || {};
      return {
        id: m.MODULE_ID || '',
        title: m.TITLE || '',
        category: m.CATEGORY || '',
        description: m.DESCRIPTION || '',
        learningObjectives: m.LEARNING_OBJECTIVES || '',
        fileType: m.FILE_TYPE || '',
        fileUrl: m.FILE_URL || '',
        totalPages: m.TOTAL_PAGES || '',
        estimatedMinutes: m.ESTIMATED_MINUTES || '',
        required: String(m.REQUIRED || '').toUpperCase() === 'TRUE',
        progressStatus: p.STATUS || 'NOT_STARTED',
        progressPercent: Number(p.PROGRESS_PERCENT || 0),
        startedAt: p.STARTED_AT || '',
        completedAt: p.COMPLETED_AT || '',
        lastOpenedAt: p.LAST_OPENED_AT || ''
      };
    });

  return {modules:modules};
}

function setLearningProgress(sessionToken, moduleId, percent, status) {
  var s = requireSession_(sessionToken);
  var emp = s.employee;
  moduleId = clean_(moduleId || '', 120);
  percent = Math.max(0, Math.min(100, Number(percent || 0)));
  status = String(status || '').toUpperCase();

  if (['NOT_STARTED','IN_PROGRESS','COMPLETED'].indexOf(status) < 0) {
    status = percent >= 100 ? 'COMPLETED' : percent > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
  }
  if (status === 'COMPLETED') percent = 100;

  var sh = sheet_('Learning_Progress');
  var values = sh.getDataRange().getValues();
  var h = values[0].map(String);
  var iEmp = h.indexOf('EMPLOYEE_ID');
  var iModule = h.indexOf('MODULE_ID');
  var iStatus = h.indexOf('STATUS');
  var iPct = h.indexOf('PROGRESS_PERCENT');
  var iStarted = h.indexOf('STARTED_AT');
  var iCompleted = h.indexOf('COMPLETED_AT');
  var iOpened = h.indexOf('LAST_OPENED_AT');

  var now = new Date();

  for (var i = 1; i < values.length; i++) {
    if (
      String(values[i][iEmp] || '').toUpperCase() === String(emp.EMPLOYEE_ID || '').toUpperCase() &&
      String(values[i][iModule] || '') === moduleId
    ) {
      if (!values[i][iStarted] && percent > 0) values[i][iStarted] = now;
      values[i][iStatus] = status;
      values[i][iPct] = percent;
      values[i][iCompleted] = status === 'COMPLETED' ? now : values[i][iCompleted];
      values[i][iOpened] = now;
      sh.getRange(i + 1, 1, 1, h.length).setValues([values[i]]);
      audit_(emp.EMPLOYEE_ID, 'LEARNING_PROGRESS', moduleId, status + ':' + percent);
      return {status:status, progressPercent:percent};
    }
  }

  sh.appendRow([
    id_('LRNP'),
    emp.EMPLOYEE_ID || '',
    moduleId,
    status,
    percent,
    percent > 0 ? now : '',
    status === 'COMPLETED' ? now : '',
    now
  ]);
  audit_(emp.EMPLOYEE_ID, 'LEARNING_PROGRESS', moduleId, status + ':' + percent);
  return {status:status, progressPercent:percent};
}

function inspireScopeAllowed_(rawScope, currentValue) {
  var raw = String(rawScope || '').trim();
  if (!raw) return true;
  var items = raw.toUpperCase().split('|').map(function(v){return String(v || '').trim();}).filter(Boolean);
  if (!items.length || items.indexOf('ALL') >= 0 || items.indexOf('*') >= 0) return true;
  return items.indexOf(String(currentValue || '').toUpperCase()) >= 0;
}
