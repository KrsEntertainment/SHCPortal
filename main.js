/* =====================================================================
   ШКОЛЬНЫЙ ПОРТАЛ — роли: админ, директор, учитель, ученик
   Админ Kai999 / 9086. Данные — localStorage (демо без сервера).
===================================================================== */

/* ---------------- Утилиты ---------------- */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const DAY = 86400000;
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function todayISO(){ const d=new Date(); d.setHours(12,0,0,0); return d.toISOString().slice(0,10); }
function dateISO(offset=0){ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); }
function dtISO(offsetDays=0, hoursAgo=0){ return new Date(Date.now()+offsetDays*DAY-hoursAgo*3600000).toISOString(); }
function dayDiff(iso){ return Math.round((new Date(iso+'T12:00') - new Date(todayISO()+'T12:00'))/DAY); }
const MONTHS=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
function fmtDate(iso){ if(!iso) return '—'; const d=new Date(iso+'T12:00'); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function fmtShort(iso){ const d=new Date(iso+'T12:00'); return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0'); }
function fmtDateTime(iso){ const d=new Date(iso); const diffH=(new Date()-d)/3600000;
  if(diffH<1) return 'только что'; if(diffH<24) return `${Math.floor(diffH)} ч назад`; return fmtDate(iso.slice(0,10)); }
function plural(n,f){ n=Math.abs(n); const a=n%10,b=n%100;
  if(a===1&&b!==11)return f[0]; if(a>=2&&a<=4&&(b<12||b>14))return f[1]; return f[2]; }
function initials(name){ return name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function avg(arr){ if(!arr.length) return null; const v=arr.reduce((a,b)=>a+b,0)/arr.length; return Math.round(v*100)/100; }
function rand(n=6){ return Math.random().toString(36).slice(2,2+n); }

const TRANSLIT={'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
function translit(s){ return (s||'').toLowerCase().split('').map(ch=>TRANSLIT[ch]??ch).join('').replace(/[^a-z]/g,''); }
function genPass(){
  // только строчные буквы без похожих символов (нет i,l,o,0,1) + цифры —
  // такой пароль легко продиктовать и набрать без ошибок регистра
  const L='abcdefghjkmnpqrstuvwxyz', D='23456789';
  const pick=s=>s[Math.floor(Math.random()*s.length)];
  let chars=[pick(L),pick(L),pick(L),pick(L),pick(L),pick(D),pick(D),pick(D)];
  for(let i=chars.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [chars[i],chars[j]]=[chars[j],chars[i]]; }
  return chars.join('');
}
function uniqueLogin(base){ let l=base, i=1; while(loginTaken(l)){ l=base+i; i++; } return l; }
function studentLoginFromName(name){
  const parts=name.trim().split(/\s+/).filter(Boolean);
  const first=parts[1]||parts[0]||'student';
  const sur=parts[0]||'';
  return uniqueLogin(translit(first)+(sur?translit(sur[0]):''));
}
function copyText(text, label){
  const done=()=>toast((label||'Скопировано')+': '+text);
  const fallback=()=>{ const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(e){} ta.remove(); done(); };
  try{ if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done).catch(fallback); else fallback(); }
  catch(e){ fallback(); }
}

const ROLE = {
  admin:   {label:'Администратор', tone:'r-admin'},
  director:{label:'Директор',      tone:'r-director'},
  teacher: {label:'Учитель',       tone:'r-teacher'},
  student: {label:'Ученик',        tone:'r-student'},
};
const DAYS=['Понедельник','Вторник','Среда','Четверг','Пятница'];
const DAYS_SHORT=['Пн','Вт','Ср','Чт','Пт'];
/* расписание звонков: defaultBells() — уроки по 40 минут + перемены */
const ELEM_SUBJECTS=['Математика','Русский язык','Литературное чтение','Окружающий мир'];
/* нечисловые отметки журнала */
const MARKS=[
  {code:'З', name:'Замечание',                     cls:'m-z'},
  {code:'Н', name:'Отсутствие',                     cls:'m-n'},
  {code:'У', name:'Отсутствие по уважительной причине', cls:'m-u'},
  {code:'П', name:'Присутствовал, но не работал',   cls:'m-p'},
  {code:'О', name:'Опоздание',                      cls:'m-o'},
  {code:'АЗ',name:'Академическая задолженность',    cls:'m-az'},
];
const MARK_BY_CODE=Object.fromEntries(MARKS.map(m=>[m.code,m]));
const markName=c=>MARK_BY_CODE[c]?MARK_BY_CODE[c].name:c;

/* ---------------- Иконки ---------------- */
const ICONS={
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.8V20h13V9.8"/><path d="M9.5 20v-6h5v6"/>',
  inbox:'<path d="M4 13v5.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V13"/><path d="M4 13l2.4-7.2A1.5 1.5 0 0 1 7.8 4.7h8.4a1.5 1.5 0 0 1 1.4 1.1L20 13"/><path d="M4 13h4.4l1.2 1.8h4.8l1.2-1.8H20"/>',
  building:'<path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4H14a1.5 1.5 0 0 1 1.5 1.5V21"/><path d="M15.5 9H19A1.5 1.5 0 0 1 20.5 10.5V21"/><path d="M2.5 21h19"/><path d="M7.5 8h3M7.5 11.5h3M7.5 15h3"/>',
  users:'<path d="M15 19.5v-1.7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1.7"/><circle cx="9" cy="7" r="3.2"/><path d="M21 19.5v-1.7a4 4 0 0 0-3-3.85"/><path d="M16 3.3a4 4 0 0 1 0 7.4"/>',
  book:'<path d="M12 6.5C10.4 5.3 8.3 4.5 5.5 4.5H3.5v14h2c2.8 0 4.9.8 6.5 2 1.6-1.2 3.7-2 6.5-2h2v-14h-2c-2.8 0-4.9.8-6.5 2Z"/><path d="M12 6.5v14"/>',
  clipboard:'<rect x="5" y="4.5" width="14" height="17" rx="2"/><path d="M9 4.5a3 3 0 0 1 6 0"/><path d="M9 11h6M9 15h4"/>',
  megaphone:'<path d="M3 11v2a1.5 1.5 0 0 0 1.5 1.5H6l5.5 4v-15L6 9.5H4.5A1.5 1.5 0 0 0 3 11Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
  coins:'<circle cx="12" cy="12" r="8.2"/><path d="M12 7.8v8.4M9.7 10c0-1 .9-1.7 2.3-1.7s2.3.7 2.3 1.7-.9 1.5-2.3 1.7-2.3.7-2.3 1.7.9 1.7 2.3 1.7 2.3-.7 2.3-1.7"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  gift:'<rect x="3.5" y="8" width="17" height="4.5" rx="1"/><path d="M5.5 12.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7.5"/><path d="M12 8V21"/><path d="M12 8C10 4 6.5 4.5 6.5 6.5S9.5 8 12 8Zm0 0c2-4 5.5-3.5 5.5-1.5S14.5 8 12 8Z"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', x:'<path d="M6 6l12 12M18 6 6 18"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  trash:'<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7"/><path d="M10 11v6M14 11v6"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  pencil:'<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l3 3"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.4 7.6-8 9-4.6-1.4-8-4-8-9V6l8-3Z"/><path d="M9 12l2 2 4-4"/>',
  cap:'<path d="M2 9l10-4.5L22 9l-10 4.5L2 9Z"/><path d="M6 11.2V17c0 1.4 2.7 3 6 3s6-1.6 6-3v-5.8"/><path d="M22 9v5"/>',
  chart:'<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
  send:'<path d="M21 4 3 10.5l7 2.5 2.5 7L21 4Z"/><path d="M10 13l4.5-4.5"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-2.3 6.4"/><path d="M20 5v5h-5"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3"/><path d="M12 13v3M9 20h6M10 20l1-4h2l1 4"/>',
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.5"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  arrow:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  play:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5-6-3.5Z"/>',
  flag:'<path d="M6 21V4"/><path d="M6 4h11l-2.5 3.5L17 11H6"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  medal:'<circle cx="12" cy="15" r="6"/><path d="M9 9 6 2h12l-3 7M12 13v4"/>',
  chevron:'<path d="m9 6 6 6-6 6"/>',
  tasks:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 10 2 2 3-3M8 16h8"/>',
  rotate:'<path d="M4 12a8 8 0 1 1 2.3 5.6"/><path d="M4 20v-5h5"/>',
};
const icon=(n,cls='')=>`<svg viewBox="0 0 24 24" class="ic ${cls}">${ICONS[n]||''}</svg>`;

/* ---------------- Тосты и модалки ---------------- */
function toast(msg,type='ok'){
  const t=document.createElement('div');
  t.className=`toast t-${type}`;
  t.innerHTML=`${icon(type==='err'?'x':type==='info'?'info':'check')}<span>${esc(msg)}</span>`;
  $('#toast-root').appendChild(t);
  setTimeout(()=>{t.classList.add('hide'); setTimeout(()=>t.remove(),300);},3400);
}
let modalEl=null;
function openModal({title,body='',footer='',wide=false}){
  closeModal();
  modalEl=document.createElement('div');
  modalEl.className='modal-overlay';
  modalEl.innerHTML=`<div class="modal${wide?' wide':''}">
    <div class="modal-head"><h3>${esc(title)}</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Закрыть">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>
    ${footer?`<div class="modal-foot">${footer}</div>`:''}</div>`;
  $('#modal-root').appendChild(modalEl);
  modalEl.addEventListener('mousedown',e=>{ if(e.target===modalEl) closeModal(); });
  return modalEl;
}
function closeModal(){ if(modalEl){ modalEl.remove(); modalEl=null; } }

/* ---------------- Хранилище. Старт: только админ ---------------- */
const KEY='sp_live_clean_v1';

/* Безопасный доступ к хранилищу:
   1) localStorage — обычный браузер;
   2) window.name — песочница превью (iframe sandbox без allow-same-origin):
      localStorage/cookie/sessionStorage там заблокированы, а window.name
      сохраняется между перезагрузками страницы;
   3) оперативная память — последний запасной вариант.
   Так созданные школы, учителя и ученики не пропадают при перезагрузке превью. */
const Store=(function(){
  let mode='memory', ls=null;
  // 1) пробуем localStorage (обычный браузер)
  try{
    if(typeof window!=='undefined' && window.localStorage){
      const t='__sp_probe_'+Date.now();
      window.localStorage.setItem(t,'1'); window.localStorage.removeItem(t);
      mode='localStorage'; ls=window.localStorage;
    }
  }catch(e){ mode='memory'; }
  // 2) если заблокирован (песочница предпросмотра) — пробуем window.name,
  //    он доступен на запись и переживает перезагрузку страницы в sandbox-iframe
  if(mode!=='localStorage'){
    try{
      if(typeof window!=='undefined' && 'name' in window){
        const savedName=window.name;
        window.name='__sp_probe__';
        if(window.name==='__sp_probe__') mode='window.name';
        window.name=savedName;
      }
    }catch(e){ mode='memory'; }
  }

  // --- хранилище в window.name ---
  const NAME_PREFIX='SP1:';
  const nameBag=Object.create(null);
  function nameRead(){
    try{
      if(mode!=='window.name') return;
      if(typeof window.name!=='string'||!window.name.startsWith(NAME_PREFIX)) return;
      const data=JSON.parse(window.name.slice(NAME_PREFIX.length));
      if(data&&typeof data==='object'&&data.kv&&typeof data.kv==='object'){
        Object.keys(nameBag).forEach(k=>delete nameBag[k]);
        Object.assign(nameBag,data.kv);
      }
    }catch(e){}
  }
  function nameWrite(){
    try{ window.name=NAME_PREFIX+JSON.stringify({kv:nameBag}); }catch(e){}
  }
  const mem=Object.create(null);
  nameRead();

  return {
    mode,
    available: mode==='localStorage',
    persistent: mode==='localStorage'||mode==='window.name',
    get(k){
      try{
        if(mode==='localStorage') return ls.getItem(k);
        if(mode==='window.name') return (k in nameBag?nameBag[k]:null);
        return (k in mem?mem[k]:null);
      }catch(e){ return (k in mem?mem[k]:null); }
    },
    set(k,v){
      try{
        if(mode==='localStorage'){ ls.setItem(k,String(v)); return; }
        if(mode==='window.name'){ nameBag[k]=String(v); nameWrite(); return; }
        mem[k]=String(v);
      }catch(e){ mem[k]=String(v); }
    },
    del(k){
      try{
        if(mode==='localStorage'){ ls.removeItem(k); return; }
        if(mode==='window.name'){ delete nameBag[k]; nameWrite(); return; }
        delete mem[k];
      }catch(e){ delete mem[k]; }
    },
    keys(){
      try{
        if(mode==='localStorage'){ const a=[]; for(let i=0;i<ls.length;i++) a.push(ls.key(i)); return a; }
        if(mode==='window.name') return Object.keys(nameBag);
        return Object.keys(mem);
      }catch(e){ return Object.keys(mem); }
    },
  };
})();
let db;
function seed(){
  return {
    users:[ {id:'u-admin', login:'Kai999', pass:'9086', role:'admin', name:'Кай · Главный администратор'} ],
    schools:[], classes:[], teachings:[], subjects:[], schedule:[], grades:[],
    homework:[], hwDone:[], news:[], transactions:[], rewards:[], purchases:[], emails:[], bells:{},
    cards:[], assigns:[], attempts:[],
  };
}
function save(){ try{ Store.set(KEY, JSON.stringify(db)); }catch(e){} }
function migrate(d){
  ['cards','assigns','attempts','subjects'].forEach(k=>{ if(!Array.isArray(d[k])) d[k]=[]; });
  if(!d.bells||typeof d.bells!=='object') d.bells={};
  return d;
}
function loadDB(){
  try{ const raw=Store.get(KEY); if(raw){ const d=JSON.parse(raw); if(d&&d.users) return migrate(d); } }catch(e){}
  const d=seed(); try{Store.set(KEY, JSON.stringify(d));}catch(e){} return d;
}
db=loadDB();

/* ---------------- Доступ к данным ---------------- */
const byId=(arr,id)=>arr.find(x=>x.id===id);
const userById=id=>byId(db.users,id);
const schoolById=id=>byId(db.schools,id);
const classById=id=>byId(db.classes,id);
const loginTaken=(login,exceptId)=>db.users.some(u=>u.login.toLowerCase()===String(login).toLowerCase()&&u.id!==exceptId);
const schoolUsers=(sid,role)=>db.users.filter(u=>u.schoolId===sid&&u.role===role);
const schoolClasses=sid=>db.classes.filter(c=>c.schoolId===sid);
const byNameRU=(a,b)=>(a.name||'').localeCompare(b.name||'','ru');
const classStudents=cid=>db.users.filter(u=>u.role==='student'&&u.classId===cid).sort(byNameRU);
/* каталог предметов школы (создаёт директор) */
const schoolSubjects=sid=>(db.subjects||[]).filter(s=>s.schoolId===sid).map(s=>s.name)
  .sort((a,b)=>a.localeCompare(b,'ru'));
const schoolSubjectObjs=sid=>(db.subjects||[]).filter(s=>s.schoolId===sid)
  .slice().sort((a,b)=>a.name.localeCompare(b.name,'ru'));
/* предметы, доступные учителю: каталог школы + ранее зарегистрированные */
const usableSubjects=(sid,tid,cid)=>[...new Set([
  ...schoolSubjects(sid),
  ...teacherSubjects(tid,cid),
])].sort((a,b)=>a.localeCompare(b,'ru'));
/* все предметы, встречающиеся в школе (каталог + уже использованные) */
const schoolWideSubjects=sid=>{
  const set=new Set(schoolSubjects(sid));
  const cids=new Set(schoolClasses(sid).map(c=>c.id));
  db.teachings.forEach(t=>{ if(cids.has(t.classId)) set.add(t.subject); });
  db.homework.forEach(h=>{ if(h.schoolId===sid) set.add(h.subject); });
  db.schedule.forEach(l=>{ if(cids.has(l.classId)) set.add(l.subject); });
  return [...set].sort((a,b)=>a.localeCompare(b,'ru'));
};
/* учителя, которые ведут класс */
const teachersOfClass=cid=>[...new Set(
  db.teachings.filter(t=>t.classId===cid).map(t=>t.teacherId)
)].map(userById).filter(Boolean);
function ensureSubjects(sid,names){
  let added=false;
  names.forEach(n=>{ if(!(db.subjects||[]).some(s=>s.schoolId===sid&&s.name.toLowerCase()===n.toLowerCase())){
    db.subjects.push({id:uid('sj-'),schoolId:sid,name:n}); added=true; } });
  return added;
}
const schoolStudents=sid=>db.users.filter(u=>u.role==='student'&&u.schoolId===sid);
const schoolOf=u=>db.schools.find(s=>s.directorId===u.id)||(u.schoolId?schoolById(u.schoolId):null);
const studentGrades=sid=>db.grades.filter(g=>g.studentId===sid);
const isNumericGrade=g=>g&&g.kind!=='mark'&&typeof g.value==='number';
const balance=sid=>db.transactions.filter(t=>t.studentId===sid).reduce((a,t)=>a+t.amount,0);
const avgOf=sid=>avg(studentGrades(sid).filter(isNumericGrade).map(g=>g.value));
const hwIsDone=(hid,sid)=>db.hwDone.some(d=>d.hwId===hid&&d.studentId===sid);
const hwDoneCount=hid=>db.hwDone.filter(d=>d.hwId===hid).length;
const lessonAt=(cid,day,period)=>db.schedule.find(l=>l.classId===cid&&l.day===day&&l.period===period);
const teacherClassIds=tid=>[...new Set(db.teachings.filter(t=>t.teacherId===tid).map(t=>t.classId))];
const teacherSubjects=(tid,cid)=>[...new Set(db.teachings.filter(t=>t.teacherId===tid&&(!cid||t.classId===cid)).map(t=>t.subject))];
const myStudents=tid=>db.users.filter(u=>u.role==='student'&&teacherClassIds(tid).includes(u.classId)).sort(byNameRU);
function gradePill(v){
  if(v==null) return '<span class="badge b-gray">—</span>';
  const cls=v>=4.5?'b-green':v>=3.5?'b-blue':v>=2.5?'b-amber':'b-red';
  return `<span class="badge ${cls}">${v.toFixed(2).replace('.',',')}</span>`;
}
function avatar(u){
  const tone=u.role==='admin'?'r-admin-solid':u.role==='director'?'r-director-solid':u.role==='teacher'?'r-teacher-solid':'r-student-solid';
  return `<span class="avatar ${tone}">${esc(initials(u.name))}</span>`;
}
function emptyBlock(ico,title,sub=''){ return `<div class="empty"><div class="e-ic">${icon(ico)}</div><b>${esc(title)}</b>${sub?esc(sub):''}</div>`; }
function statusBadge(st){
  return st==='approved'?'<span class="badge b-green"><span class="dot"></span>Одобрена</span>':
    st==='pending'?'<span class="badge b-amber"><span class="dot"></span>На рассмотрении</span>':
    '<span class="badge b-red"><span class="dot"></span>Отклонена</span>';
}
function sendEmail(m){ db.emails.push(Object.assign({id:uid('m-'),createdAt:dtISO(0)},m)); }
function defaultRewards(sid){
  return [
    {title:'Пятёрка по предмету',desc:'Учитель ставит оценку «5» за ответ на выбранном уроке.',cost:50},
    {title:'День без домашнего задания',desc:'Освобождение от одного ДЗ по согласованию с учителем.',cost:30},
    {title:'Дополнительная попытка',desc:'Переделать контрольную или самостоятельную работу.',cost:40},
    {title:'Школьный мерч',desc:'Ручка, блокнот или значок с символикой школы.',cost:100},
  ].map(r=>({id:uid('r-'),schoolId:sid,...r}));
}

/* =====================================================================
   СОСТОЯНИЕ, НАВИГАЦИЯ
===================================================================== */
const S={user:null,page:'dashboard',p:{}};
const Act={}, Fm={};
const NAV={
  admin:[
    {page:'dashboard',label:'Обзор',icon:'chart'},
    {page:'applications',label:'Заявки школ',icon:'inbox'},
    {page:'tasks',label:'Задания',icon:'tasks'},
    {page:'schools',label:'Школы',icon:'building'},
    {page:'users',label:'Пользователи',icon:'users'},
  ],
  director:[
    {page:'dashboard',label:'Обзор',icon:'chart'},
    {page:'teachers',label:'Учителя',icon:'users'},
    {page:'subjects',label:'Предметы',icon:'book'},
    {page:'schedule',label:'Расписание',icon:'calendar'},
    {page:'rewards',label:'Награды',icon:'gift'},
    {page:'news',label:'Новости',icon:'megaphone'},
  ],
  teacher:[
    {page:'dashboard',label:'Обзор',icon:'chart'},
    {page:'myclasses',label:'Мои классы',icon:'cap'},
    {page:'journal',label:'Журнал',icon:'book'},
    {page:'homework',label:'Домашние задания',icon:'clipboard'},
    {page:'cards',label:'Карточки',icon:'layers'},
    {page:'news',label:'Новости',icon:'megaphone'},
    {page:'students',label:'Ученики',icon:'users'},
    {page:'coins',label:'Классниксы',icon:'coins'},
    {page:'schedule',label:'Расписание',icon:'calendar'},
  ],
  student:[
    {page:'dashboard',label:'Обзор',icon:'chart'},
    {page:'grades',label:'Мои оценки',icon:'book'},
    {page:'homework',label:'Домашние задания',icon:'clipboard'},
    {page:'cards',label:'Карточки',icon:'layers'},
    {page:'news',label:'Новости',icon:'megaphone'},
    {page:'schedule',label:'Расписание',icon:'calendar'},
    {page:'shop',label:'Магазин наград',icon:'gift'},
  ],
};
function mount(title,html){ $('#page-title').textContent=title; $('#view').innerHTML=html; window.scrollTo({top:0});
  $$('.nav-item').forEach(b=>b.classList.toggle('on',b.dataset.page===S.page)); }
function go(page,p={}){ S.page=page; S.p=p||{}; renderView(); }

/* =====================================================================
   ЭКРАН ВХОДА
===================================================================== */
function showLogin(){
  S.user=null;
  $('#app').classList.add('hidden');
  $('#login').classList.remove('hidden');
  $('.sidebar').classList.remove('open');
  renderLogin();
}
function loginPanel(inner){
  $('#login').innerHTML=`
  <div class="login-aside">
    <div class="login-logo"><span class="logo-dot">🎓</span> Школьный портал</div>
    <div class="login-hero">
      <h1>Единая среда<br/>для школы</h1>
      <p>Заявки школ, расписание, электронный журнал, домашние задания, новости и школьная валюта «Классниксы».</p>
      <div class="login-feats">
        <div class="login-feat"><span class="fi">${icon('shield')}</span><div><b>Админ</b> — одобряет заявки и создаёт школы</div></div>
        <div class="login-feat"><span class="fi">${icon('building')}</span><div><b>Директор</b> — подаёт заявку, получает доступ на почту</div></div>
        <div class="login-feat"><span class="fi">${icon('book')}</span><div><b>Учитель</b> — классы, журнал, ДЗ, новости, Классниксы</div></div>
        <div class="login-feat"><span class="fi">${icon('cap')}</span><div><b>Ученик</b> — оценки, ДЗ, новости и магазин наград</div></div>
      </div>
    </div>
    <div class="login-copy">Демо-версия · данные хранятся в браузере (localStorage)</div>
  </div>
  <div class="login-panel"><div class="login-panel-inner">${inner}</div></div>`;
}
function renderLogin(){
  const mailCount=db.emails.length;
  loginPanel(`
    <h2>Вход в портал</h2>
    <p class="sub">Введите логин и пароль, выданные вашей школой.</p>
    <form class="login-form" data-form="login" id="login-form" autocomplete="off">
      <div class="field"><label>Логин</label>
        <input class="input" name="login" placeholder="например, Kai999" autocomplete="username"
               autocapitalize="off" autocorrect="off" spellcheck="false" required/></div>
      <div class="field"><label>Пароль</label>
        <div style="position:relative">
          <input class="input" name="pass" id="login-pass" type="password" placeholder="••••••••"
               autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false"
               style="padding-right:44px" required/>
          <button type="button" class="icon-btn" data-act="toggle-pass" style="position:absolute;right:6px;top:50%;transform:translateY(-50%)"
                  title="Показать/скрыть пароль">${icon('eye')}</button>
        </div></div>
      <div class="form-error" id="login-err"></div>
      <button class="btn btn-primary" type="submit">${icon('logout')} Войти</button>
    </form>
    <div class="demo-title">Нет доступа?</div>
    <button class="btn btn-primary" style="width:100%;padding:13px" data-act="go-apply">${icon('send')} Подать заявку на школу</button>
    <div style="display:flex;gap:10px;margin-top:10px">
      <button class="btn" style="flex:1" data-act="open-mail">${icon('mail')} Демо-почта${mailCount?` <span class="badge b-amber">${mailCount}</span>`:''}</button>
      <button class="btn btn-ghost btn-sm" data-act="reset-demo" title="Очистить все данные">${icon('refresh','sm')} Сброс</button>
    </div>
    ${Store.mode==='localStorage'?'':`<div class="alert alert-warn">${icon('info')}<div>${Store.mode==='window.name'
      ? 'Открыто во встроенном предпросмотре: данные сохраняются внутри этой вкладки и переживают перезагрузку страницы, но при закрытии вкладки очищаются. Для постоянного хранения откройте портал в отдельной вкладке браузера.'
      : 'Локальное хранилище недоступно: данные действуют только до перезагрузки страницы.'}</div></div>`}
    <div class="demo-note">🔐 Администратор платформы: логин <b>Kai999</b>, пароль <b>9086</b>. Директора получают данные после одобрения заявки, учителя и ученики — от своей школы.</div>`);
}
// Раскладка ЙЦУКЕН -> QWERTY (если логин/пароль случайно набрали в русской раскладке)
const RU_EN={'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']','ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':"'",'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.','ё':'t'};
function fixInput(v){
  v=String(v||'').replace(/[\s\u00A0\u200B-\u200D\uFEFF]/g,'');
  if(/[а-яё]/i.test(v)) v=v.toLowerCase().split('').map(ch=>RU_EN[ch]??ch).join('');
  return v;
}
Fm.login=fd=>{
  const login=fixInput(fd.get('login')).toLowerCase();
  const pass=fixInput(fd.get('pass'));
  const u=db.users.find(x=>x.login.toLowerCase()===login);
  const err=document.querySelector('#login-err');
  const fail=msg=>{
    err.textContent=msg;
    const f=document.querySelector('#login-form'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
  };
  if(!login||!pass){ fail('Введите логин и пароль'); return; }
  if(!u){ fail('Пользователь с таким логином не найден. Проверьте логин или получите данные в школе.'); return; }
  // пароли в портале строчные; сравнение нечувствительно к регистру (спасает от авто-заглавной на телефоне)
  if(u.pass!==pass && u.pass.toLowerCase()!==pass.toLowerCase()){
    fail('Неверный пароль. Нажмите «глазик» справа в поле, чтобы увидеть введённый пароль.'); return;
  }
  enterApp(u);
};
Act['toggle-pass']=()=>{
  const inp=document.querySelector('#login-pass');
  if(!inp)return;
  inp.type=inp.type==='password'?'text':'password';
};
Act['go-apply']=()=>renderApply();
Act['open-mail']=()=>renderMailList();
Act['reset-demo']=()=>{
  if(confirm('Полностью очистить все данные портала (заявки, школы, пользователей)?')){
    try{ Store.keys().forEach(k=>{
      if(/^school_portal_v/i.test(k)||k===KEY||k==='sp_session'||k==='sp_last_app') Store.del(k);
    }); }catch(e){}
    location.reload();
  }
};

/* ----- Публичная заявка директора ----- */
function renderApply(){
  loginPanel(`
    <button class="btn btn-ghost btn-sm" style="margin-bottom:14px;padding-left:0" data-act="back-login">${icon('arrow','sm')} Назад ко входу</button>
    <h2>Заявка на школу</h2>
    <p class="sub">Заполните данные. После одобрения администратором логин и пароль директора придут на указанный email.</p>
    <form data-form="apply-public">
      <div class="field"><label>ФИО директора *</label><input class="input" name="directorName" required placeholder="Иванова Ольга Петровна"/></div>
      <div class="field-row">
        <div class="field"><label>Email для связи *</label><input class="input" type="email" name="email" required placeholder="school@edu.ru"/></div>
        <div class="field"><label>Телефон</label><input class="input" name="phone" placeholder="+7 (___) ___-__-__"/></div>
      </div>
      <div class="field"><label>Планируемое название школы *</label><input class="input" name="name" required placeholder="МАОУ «СОШ № …»"/></div>
      <div class="field-row">
        <div class="field"><label>Город *</label><input class="input" name="city" required/></div>
        <div class="field"><label>Адрес</label><input class="input" name="address"/></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Планируется учеников</label><input class="input" type="number" min="1" name="pupils"/></div>
      </div>
      <div class="field"><label>Комментарий</label><textarea class="input" name="comment" placeholder="Дополнительная информация для администратора"></textarea></div>
      <button class="btn btn-primary" type="submit" style="width:100%;padding:12px">${icon('send')} Отправить заявку</button>
    </form>`);
}
Act['back-login']=()=>renderLogin();
Fm['apply-public']=fd=>{
  const email=fd.get('email').trim();
  const data={
    directorName:fd.get('directorName').trim(),
    email, phone:fd.get('phone').trim()||'—',
    name:fd.get('name').trim(), city:fd.get('city').trim(),
    address:fd.get('address').trim()||'—', pupils:+fd.get('pupils')||null,
    comment:fd.get('comment').trim(),
  };
  // повторная заявка с той же почты заменяет прошлую (ожидающую или отклонённую)
  const old=db.schools.find(s=>!s.directorId && s.email===email && s.status!=='approved');
  if(old){ Object.assign(old,data,{status:'pending',rejectReason:undefined,createdAt:dtISO(0)}); }
  else db.schools.push(Object.assign({id:uid('sch-'),status:'pending',directorId:null,rejectReason:'',createdAt:dtISO(0)},data));
  save();
  Store.set('sp_last_app',email);
  renderApplySent(email);
};
function renderApplySent(email){
  const app=db.schools.find(s=>s.email===email&&s.status==='pending');
  loginPanel(`
    <div style="text-align:center;padding:10px 0">
      <div style="width:72px;height:72px;border-radius:50%;background:var(--emerald-l);display:grid;place-items:center;margin:0 auto 16px;color:var(--emerald)">${icon('send')}</div>
      <h2>Заявка отправлена!</h2>
      <p class="sub">Администратор проверит заявку школы <b>${esc(app?app.name:'')}</b>. После одобрения логин и пароль придут на <b>${esc(email)}</b>.</p>
      <div class="alert alert-info" style="text-align:left;margin-top:18px">${icon('mail')}<div>Это демо: реальные письма не отправляются. Нажмите «Демо-почта» на экране входа — письмо с данными появится там после одобрения.</div></div>
      <div style="display:flex;gap:10px;margin-top:18px">
        <button class="btn btn-primary" style="flex:1" data-act="open-mail">${icon('mail')} Проверить демо-почту</button>
        <button class="btn" style="flex:1" data-act="back-login">На вход</button>
      </div>
    </div>`);
}

/* ----- Демо-почта ----- */
function renderMailList(){
  const list=[...db.emails].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  openModal({title:'📨 Демо-почта (симуляция входящих писем)',wide:true,
    body:`<div class="alert alert-info" style="margin-top:0">${icon('info')}<div>В демо-версии письма с логинами и паролями хранятся локально и заменяют реальную электронную почту.</div></div>
    <div class="lists mail-list">${list.map(m=>`
      <button type="button" class="list-item mail-item" data-act="mail-open" data-id="${m.id}">
        <span class="stat-ico ${m.kind==='reject'?'bg-admin':'bg-teacher'}" style="align-self:flex-start">${icon('mail')}</span>
        <div class="li-main" style="text-align:left">
          <h4>${esc(m.subject)}</h4>
          <div class="li-meta">кому: ${esc(m.to)} · ${fmtDateTime(m.createdAt)}</div>
          <div class="li-desc" style="color:var(--slate-2)">${esc(m.preview||'')}</div>
        </div>
        <span class="ic" style="color:var(--slate-2)">${icon('arrow','sm').replace('class="ic sm"','class="ic"')}</span>
      </button>`).join('')}</div>
    ${list.length?'':emptyBlock('mail','Письма пока не приходили','После одобрения заявки сюда придут логин и пароль директора.')}`,
    footer:`<button type="button" class="btn" data-act="close-modal">Закрыть</button>`});
}
Act['mail-open']=d=>{
  const m=byId(db.emails,d.id); if(!m)return;
  openModal({title:m.subject,wide:true,
    body:`<div class="letter">
      <div class="li-meta" style="margin-bottom:12px">Кому: <b>${esc(m.to)}</b> · ${fmtDate(m.createdAt.slice(0,10))}</div>
      <div class="li-desc" style="white-space:pre-wrap;font-size:14px">${esc(m.body)}</div>
      ${m.login?`<div class="letter-cred">
        <div><span>Логин</span><b class="cred">${esc(m.login)}</b>
          <button type="button" class="icon-btn" data-act="copy" data-text="${esc(m.login)}" data-label="Логин скопирован">${icon('clipboard','sm')}</button></div>
        <div><span>Пароль</span><b class="cred">${esc(m.pass)}</b>
          <button type="button" class="icon-btn" data-act="copy" data-text="${esc(m.pass)}" data-label="Пароль скопирован">${icon('clipboard','sm')}</button></div>
      </div>`:''}
    </div>`,
    footer:`<button type="button" class="btn" data-act="close-modal">Закрыть</button>
      ${m.login?`<button type="button" class="btn btn-primary" data-act="mail-login" data-id="${m.id}">${icon('logout')} Войти по этим данным</button>`:''}`});
};
Act['mail-login']=d=>{
  const m=byId(db.emails,d.id); if(!m||!m.login)return;
  closeModal(); renderLogin();
  const li=document.querySelector('#login-form [name=login]'), pi=document.querySelector('#login-form [name=pass]');
  if(li){li.value=m.login; pi.value=m.pass; pi.focus();}
  toast('Данные подставлены — нажмите «Войти»','info');
};
Act.copy=d=>copyText(d.text,d.label);
Act['close-modal']=()=>closeModal();

function enterApp(u){
  S.user=u; Store.set('sp_session',u.id);
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  renderShell(); go('dashboard');
}
Act.logout=()=>{ Store.del('sp_session'); closeModal(); showLogin(); toast('Вы вышли из портала','info'); };
function renderShell(){
  const u=S.user, nav=NAV[u.role];
  $('#nav').innerHTML=nav.map(n=>`<button type="button" class="nav-item" data-act="nav" data-page="${n.page}">${icon(n.icon)}<span>${n.label}</span></button>`).join('');
  const sch=u.schoolId?schoolById(u.schoolId):schoolOf(u);
  $('#sb-school').textContent=sch?sch.name:'Платформа школ';
  $('#sb-user').innerHTML=`${avatar(u)}<div class="user-mini-meta"><b>${esc(u.name)}</b><span>${ROLE[u.role].label}${u.classId&&classById(u.classId)?' · '+esc(classById(u.classId).name):''}</span></div>`;
  $('#tb-user').innerHTML=`<div class="meta"><b>${esc(u.name)}</b><span>${ROLE[u.role].label}</span></div>${avatar(u)}`;
}
Act.nav=d=>go(d.page);

function renderView(){
  const u=S.user;
  if(u.role==='admin') return pageAdmin();
  if(u.role==='director') return pageDirector();
  if(u.role==='teacher') return pageTeacher();
  return pageStudent();
}

/* =====================================================================
   АДМИН
===================================================================== */
function pageAdmin(){
  if(S.page==='applications') return adminApplications();
  if(S.page==='tasks') return adminTasks();
  if(S.page==='schools') return adminSchools();
  if(S.page==='users') return adminUsers();
  return adminDashboard();
}
function statCard(ico,tone,value,label){
  return `<div class="stat"><span class="stat-ico bg-${tone}">${icon(ico)}</span><div><b>${value}</b><span>${esc(label)}</span></div></div>`;
}
function adminDashboard(){
  const approved=db.schools.filter(s=>s.status==='approved');
  const pending=db.schools.filter(s=>s.status==='pending');
  mount('Обзор',`
    <div class="grid cols-4">
      ${statCard('building','director',approved.length,'подключённых школ')}
      ${statCard('inbox','student',pending.length,'заявок на рассмотрении')}
      ${statCard('book','teacher',db.users.filter(u=>u.role==='teacher').length,'учителей в системе')}
      ${statCard('cap','student',db.users.filter(u=>u.role==='student').length,'учеников в системе')}
    </div>
    <h2 class="section-title">${icon('inbox')} Заявки, ожидающие решения ${pending.length?`<span class="badge b-amber">${pending.length}</span>`:''}</h2>
    ${pending.length?`<div class="grid">${pending.map(applyCard).join('')}</div>`
      :`<div class="card"><div class="empty"><div class="e-ic">📭</div><b>Новых заявок нет</b>Когда директор подаст заявку с экрана входа, она появится здесь.</div></div>`}
    <h2 class="section-title">${icon('shield')} Быстрые действия</h2>
    <div class="grid cols-3">
      <button type="button" class="btn card card-pad quick-card" data-act="nav" data-page="applications"><span class="stat-ico bg-student">${icon('inbox')}</span><b>Разобрать заявки</b><span>Одобрить и создать школу или отклонить</span></button>
      <button type="button" class="btn card card-pad quick-card" data-act="nav" data-page="schools"><span class="stat-ico bg-director">${icon('building')}</span><b>Все школы</b><span>Реестр подключённых школ</span></button>
      <button type="button" class="btn card card-pad quick-card" data-act="nav" data-page="users"><span class="stat-ico bg-teacher">${icon('users')}</span><b>Пользователи</b><span>Все учётные записи платформы</span></button>
    </div>`);
}
function applyCard(s){
  return `<div class="card apply-card">
    <div class="card-head"><h3>${icon('building')} ${esc(s.name)}</h3>${statusBadge(s.status)}</div>
    <div class="card-body">
      <div class="apply-grid">
        <div class="ag"><span>Директор (ФИО)</span><b>${esc(s.directorName||'—')}</b></div>
        <div class="ag"><span>Email</span><b>${esc(s.email)}</b></div>
        <div class="ag"><span>Город</span><b>${esc(s.city)}</b></div>
        <div class="ag"><span>Адрес</span><b>${esc(s.address)}</b></div>
        <div class="ag"><span>Телефон</span><b>${esc(s.phone||'—')}</b></div>
        <div class="ag"><span>Учеников (план)</span><b>${s.pupils||'—'}</b></div>
      </div>
      ${s.comment?`<div class="alert alert-info">${icon('info')}<div><b>Комментарий:</b> ${esc(s.comment)}</div></div>`:''}
      ${s.status==='rejected'?`<div class="alert alert-bad">${icon('x')}<div><b>Причина отказа:</b> ${esc(s.rejectReason||'—')}</div></div>`:''}
      ${s.status==='approved'?`<div class="alert alert-ok">${icon('check')}<div>Школа создана: <b>${esc(s.name)}</b>. Данные для входа директора направлены на ${esc(s.email)}.</div>`:''}
      <div class="li-meta" style="margin:0">Подана: ${fmtDate(s.createdAt.slice(0,10))}</div>
      ${s.status==='pending'?`<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <button type="button" class="btn btn-ok" data-act="approve-start" data-id="${s.id}">${icon('check')} Одобрить и создать школу</button>
        <button type="button" class="btn btn-danger" data-act="reject" data-id="${s.id}">${icon('x')} Отклонить</button>
      </div>`:''}
    </div></div>`;
}
function adminApplications(){
  const pending=db.schools.filter(s=>s.status==='pending');
  const done=db.schools.filter(s=>s.status!=='pending');
  mount('Заявки школ',`
    <div class="toolbar"><h2 class="section-title" style="margin:0">${icon('inbox')} Ожидают решения</h2><span class="sp"></span>
      <span class="badge b-amber">${pending.length} ${plural(pending.length,['заявка','заявки','заявок'])}</span></div>
    ${pending.length?`<div class="grid">${pending.map(applyCard).join('')}</div>`
      :`<div class="card"><div class="empty"><div class="e-ic">✅</div><b>Заявок нет</b></div></div>`}
    <h2 class="section-title">${icon('clock')} История</h2>
    ${done.length?`<div class="grid">${done.map(applyCard).join('')}</div>`
      :`<div class="card">${emptyBlock('clock','История пуста')}</div>`}`);
}
Act['approve-start']=d=>{
  const s=schoolById(d.id); if(!s)return;
  const num=db.schools.filter(x=>/^Школа №/.test(x.name)).length+1;
  openModal({title:'Одобрение заявки и создание школы',wide:true,
    body:`<form data-form="approve-create">
      <input type="hidden" name="id" value="${s.id}"/>
      <div class="alert alert-info" style="margin-top:0">${icon('info')}<div>После создания аккаунта директора логин и пароль будут автоматически направлены на <b>${esc(s.email)}</b> (вкладка «Демо-почта»).</div></div>
      <div class="field"><label>Название школы в системе *</label>
        <input class="input" name="schoolName" required value="Школа № ${num}"/></div>
      <div class="apply-grid">
        <div class="ag"><span>Директор</span><b>${esc(s.directorName)}</b></div>
        <div class="ag"><span>Email</span><b>${esc(s.email)}</b></div>
        <div class="ag"><span>Город</span><b>${esc(s.city)}</b></div>
        <div class="ag"><span>Адрес</span><b>${esc(s.address)}</b></div>
        <div class="ag"><span>Заявленное название</span><b>${esc(s.name)}</b></div>
        <div class="ag"><span>Учеников (план)</span><b>${s.pupils||'—'}</b></div>
      </div>
      <div class="field"><label>Город (можно уточнить)</label><input class="input" name="city" value="${esc(s.city)}"/></div>
      <div class="modal-foot" style="padding:0;border:none">
        <button type="button" class="btn" data-act="close-modal">Отмена</button>
        <button type="submit" class="btn btn-ok">${icon('check')} Создать школу и отправить данные</button>
      </div></form>`});
};
Fm['approve-create']=fd=>{
  const s=schoolById(fd.get('id')); if(!s)return;
  const schoolName=fd.get('schoolName').trim()||s.name;
  const city=fd.get('city').trim()||s.city;
  // аккаунт директора с автогенерацией
  const login=uniqueLogin('director'), pass=genPass();
  const director={id:uid('u-'),login,pass,role:'director',name:s.directorName,email:s.email,schoolId:s.id};
  db.users.push(director);
  Object.assign(s,{name:schoolName,city,status:'approved',directorId:director.id,approvedAt:dtISO(0)});
  db.rewards.push(...defaultRewards(s.id));
  db.news.push({id:uid('n-'),schoolId:s.id,title:'Добро пожаловать в Школьный портал!',
    body:'Школа подключена к порталу. Здесь будут публиковаться новости, объявления и важные даты.',
    authorId:null,authorName:'Администрация школы',createdAt:dtISO(0)});
  sendEmail({to:s.email,kind:'approve',subject:`Школа «${schoolName}» подключена к порталу`,
    preview:`Логин директора: ${login}`,
    login,pass,
    body:`Здравствуйте, ${s.directorName}!\n\nВаша заявка на подключение школы одобрена администратором.\nШкола в системе: ${schoolName} (${city}).\n\nДанные для входа в роли директора:\nЛогин: ${login}\nПароль: ${pass}\n\nВойдите на портал, добавьте учителей и составьте расписание. Письмо содержит конфиденциальные данные — не передавайте его третьим лицам.`});
  save(); closeModal(); renderView();
  credentialsModal({title:'Школа создана — данные директора',name:director.name,role:'director',login,pass,
    email:s.email,intro:`Письмо с этими данными отправлено на <b>${esc(s.email)}</b> и доступно в «Демо-почте» на экране входа. Передавать данные директора повторно можно оттуда.`});
};
Act.reject=d=>{
  const s=schoolById(d.id);
  openModal({title:`Отклонение заявки — ${s.name}`,
    body:`<form data-form="reject-save"><input type="hidden" name="id" value="${s.id}"/>
      <div class="field"><label>Причина отказа (придёт заявителю на почту) *</label>
      <textarea class="input" name="reason" required placeholder="Например: не приложены сканы лицензии…"></textarea></div>
      <div class="modal-foot" style="padding:0;border:none">
        <button type="button" class="btn" data-act="close-modal">Отмена</button>
        <button type="submit" class="btn btn-danger">${icon('x')} Отклонить заявку</button>
      </div></form>`});
};
Fm['reject-save']=fd=>{
  const s=schoolById(fd.get('id')); const reason=fd.get('reason').trim();
  s.status='rejected'; s.rejectReason=reason;
  sendEmail({to:s.email,kind:'reject',subject:`Заявка школы «${s.name}» отклонена`,
    preview:reason,
    body:`Здравствуйте, ${s.directorName||''}!\n\nК сожалению, заявка на подключение школы «${s.name}» отклонена.\nПричина: ${reason}\n\nВы можете исправить замечания и подать заявку повторно с экрана входа в портал.`});
  save(); closeModal(); renderView(); toast('Заявка отклонена, письмо отправлено','err');
};

function adminSchools(){
  mount('Школы',`<div class="card"><div class="table-wrap">
    <table class="tbl"><thead><tr><th>Школа</th><th>Город</th><th>Директор</th><th class="num">Учителя</th><th class="num">Ученики</th><th>Статус</th><th>Подана</th></tr></thead>
    <tbody>${db.schools.map(s=>{ const dir=userById(s.directorId);
      return `<tr><td class="strong">${esc(s.name)}<div style="font-weight:400;font-size:12px;color:var(--slate-2)">${esc(s.address||'')}</div></td>
      <td>${esc(s.city)}</td><td>${dir?esc(dir.name):esc(s.directorName||'—')}</td>
      <td class="num">${schoolUsers(s.id,'teacher').length}</td><td class="num">${schoolStudents(s.id).length}</td>
      <td>${statusBadge(s.status)}</td><td style="white-space:nowrap">${fmtShort(s.createdAt.slice(0,10))}</td></tr>`;}).join('')}
    </tbody></table>
    ${db.schools.length?'':`<div class="empty"><div class="e-ic">🏫</div><b>Школ пока нет</b>Одобрите первую заявку.</div>`}
  </div></div>`);
}
function adminUsers(){
  const others=db.users.filter(u=>u.role!=='admin');
  mount('Пользователи',`<div class="card"><div class="table-wrap">
    <table class="tbl"><thead><tr><th>Пользователь</th><th>Логин</th><th>Роль</th><th>Школа</th><th>Детали</th></tr></thead>
    <tbody>${others.map(u=>{ const sch=u.schoolId?schoolById(u.schoolId):null;
      return `<tr><td><div class="cell-user">${avatar(u)}<b>${esc(u.name)}</b></div></td>
      <td><span class="cred">${esc(u.login)}</span></td>
      <td><span class="badge bg-${u.role}">${ROLE[u.role].label}</span></td>
      <td>${sch?esc(sch.name):'—'}</td>
      <td style="color:var(--slate-2);font-size:12.5px">${u.classId&&classById(u.classId)?'Класс '+esc(classById(u.classId).name):(teacherSubjects(u.id).join(', ')||'—')}</td></tr>`;}).join('')}
      <tr><td><div class="cell-user">${avatar(db.users[0])}<b>${esc(db.users[0].name)}</b></div></td>
      <td><span class="cred">${esc(db.users[0].login)}</span></td><td><span class="badge bg-admin">Администратор</span></td><td colspan="2">Вся платформа</td></tr>
    </tbody></table></div></div>`);
}

/* =====================================================================
   ДИРЕКТОР
===================================================================== */
function pageDirector(){
  if(S.page==='teachers') return directorTeachers();
  if(S.page==='subjects') return directorSubjects();
  if(S.page==='schedule') return directorSchedule();
  if(S.page==='rewards') return directorRewards();
  if(S.page==='news') return newsPage(true);
  return directorDashboard();
}
function directorDashboard(){
  const sch=schoolById(S.user.schoolId);
  const teachers=schoolUsers(sch.id,'teacher'), students=schoolStudents(sch.id), classes=schoolClasses(sch.id);
  const dow=new Date().getDay()-1;
  const todayLessons=db.schedule.filter(l=>l.day===dow);
  mount('Обзор',`
    <div class="welcome" style="background:linear-gradient(120deg,#3730a3,#6366f1)">
      <div><h2>Здравствуйте, ${esc(S.user.name.split(' ').slice(1).join(' ')||S.user.name)}!</h2><p>${esc(sch.name)} · ${esc(sch.city)}</p></div>
      <div class="w-coins"><b>${teachers.length}</b><span>учителей в штате</span></div>
    </div>
    <div class="grid cols-4" style="margin-top:16px">
      ${statCard('users','teacher',teachers.length,'учителей')}
      ${statCard('cap','student',students.length,'учеников')}
      ${statCard('book','director',classes.length,plural(classes.length,['класс','класса','классов']))}
      ${statCard('gift','student',db.rewards.filter(r=>r.schoolId===sch.id).length,'наград в магазине')}
    </div>
    ${teachers.length===0?`<div class="alert alert-warn" style="margin-top:16px">${icon('users')}<div><b>Первый шаг:</b> добавьте учителей в разделе «Учителя». Система сгенерирует им логины и пароли — передайте их сотрудникам.</div></div>`:''}
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card"><div class="card-head"><h3>${icon('calendar')} Расписание на сегодня</h3></div><div class="card-body">
        ${todayLessons.length?scheduleList(todayLessons):emptyBlock('calendar','Сегодня выходной или уроков нет')}</div></div>
      <div class="card"><div class="card-head"><h3>${icon('megaphone')} Последние новости</h3></div><div class="card-body">
        ${(()=>{const n=db.news.filter(x=>x.schoolId===sch.id).slice(-2);
          return n.length?n.map(x=>`<div style="padding:10px 0;border-bottom:1px solid #f1f5f9"><b>${esc(x.title)}</b><div style="font-size:12px;color:var(--slate-2)">${fmtDateTime(x.createdAt)} · ${esc(x.authorName)}</div></div>`).join(''):emptyBlock('megaphone','Новостей пока нет');})()}</div></div>
    </div>`);
}
function scheduleList(lessons){
  return `<div class="lists">${[...lessons].sort((a,b)=>a.period-b.period).map(l=>{ const t=userById(l.teacherId),c=classById(l.classId);
    return `<div class="list-item" style="box-shadow:none;padding:8px 4px">
      <span class="badge b-blue" style="min-width:64px;justify-content:center">${l.period+1} урок<br/>${periodTime(l.schoolId,l.period)[0]}</span>
      <div class="li-main"><b>${esc(l.subject)}</b><div class="li-meta" style="margin:0">${t?esc(t.name):'—'} · ${c?esc(c.name):''}</div></div></div>`;}).join('')}</div>`;
}

function credentialsModal({title,name,login,pass,role,email,intro,againAct,againLabel}){
  const note= role==='director'?'Директор входит с этими данными на экран входа.':
              role==='teacher'?'Передайте логин и пароль учителю лично — он войдёт и зарегистрирует свой класс и предмет.':
              'Передайте логин и пароль ученику (или родителю) лично.';
  openModal({title,body:`
    ${intro?`<div class="alert alert-ok" style="margin-top:0">${icon('check')}<div>${intro}</div></div>`:''}
    ${name?`<div class="field"><label>Пользователь</label><div><b>${esc(name)}</b> <span class="badge bg-${role}">${ROLE[role].label}</span></div></div>`:''}
    <div class="cred-grid">
      <div class="cred-box"><span>Логин</span><b class="cred">${esc(login)}</b>
        <button type="button" class="btn btn-sm" data-act="copy" data-text="${esc(login)}" data-label="Логин скопирован">${icon('clipboard','sm')} Копировать</button></div>
      <div class="cred-box"><span>Пароль</span><b class="cred">${esc(pass)}</b>
        <button type="button" class="btn btn-sm" data-act="copy" data-text="${esc(pass)}" data-label="Пароль скопирован">${icon('clipboard','sm')} Копировать</button></div>
    </div>
    <div class="alert alert-info">${icon('info')}<div>${esc(note)}</div></div>`,
    footer:`${againAct?`<button type="button" class="btn" data-act="${againAct}">${icon('plus')} ${esc(againLabel||'Добавить ещё')}</button>`:''}
      <button type="button" class="btn btn-primary" data-act="close-modal">Готово</button>`});
}

/* ----- Учителя (директор) ----- */
function directorTeachers(){
  const sch=schoolById(S.user.schoolId);
  const list=schoolUsers(sch.id,'teacher');
  mount('Учителя',`
    <div class="alert alert-info">${icon('info')}<div>При добавлении учителя система сам генерирует <b>логин и пароль</b>. Передайте их сотруднику — после входа он зарегистрирует класс и предмет.</div></div>
    <div class="toolbar"><span class="sp"></span>
      <button type="button" class="btn btn-primary" data-act="teacher-add">${icon('plus')} Добавить учителя</button></div>
    <div class="card"><div class="table-wrap">
    <table class="tbl"><thead><tr><th>ФИО</th><th>Предметы / классы</th><th>Логин</th><th>Пароль</th><th></th></tr></thead>
    <tbody>${list.map(t=>{
      const subs=teacherSubjects(t.id); const cls=[...new Set(teacherClassIds(t.id).map(id=>classById(id)?.name))].filter(Boolean);
      return `<tr data-ctx="teacher" data-id="${t.id}" title="ПКМ — действия с учителем">
        <td><div class="cell-user">${avatar(t)}<b>${esc(t.name)}</b>${t.elementary?'<span class="badge b-green">нач. классы</span>':''}</div></td>
        <td>${subs.length?esc(subs.join(', '))+'<div style="font-size:12px;color:var(--slate-2)">'+(cls.join(', ')||'')+'</div>':'<span class="badge b-amber">ожидает регистрации предмета</span>'}</td>
        <td><span class="cred">${esc(t.login)}</span></td>
        <td><span style="display:inline-flex;gap:6px;align-items:center"><span class="cred" data-pass-for="${t.id}" data-secret="${esc(t.pass)}">••••••</span>
          <button type="button" class="icon-btn" style="width:28px;height:28px" data-act="reveal" data-target="${t.id}">${icon('eye','sm')}</button>
          <button type="button" class="icon-btn" style="width:28px;height:28px" data-act="copy" data-text="${esc(t.login)} / ${esc(t.pass)}" data-label="Данные учителя скопированы">${icon('clipboard','sm')}</button></span></td>
        <td><div class="row-actions"><button type="button" class="btn btn-xs btn-ghost" data-act="teacher-del" data-id="${t.id}">${icon('trash','sm')}</button></div></td>
      </tr>`;}).join('')}</tbody></table>
    ${list.length?'':emptyBlock('users','Учителей пока нет','Нажмите «Добавить учителя».')}
    </div></div>`);
}
Act['teacher-add']=()=>openModal({title:'Новый учитель',
  body:`<form data-form="teacher-save">
    <div class="field"><label>ФИО учителя *</label><input class="input" name="name" required placeholder="Иванова Мария Петровна"/></div>
    <div class="alert alert-warn">${icon('info')}<div>Логин и временный пароль сгенерируются автоматически после сохранения.</div></div>
    <div class="modal-foot" style="padding:0;border:none">
      <button type="button" class="btn" data-act="close-modal">Отмена</button>
      <button type="submit" class="btn btn-primary">${icon('check')} Создать учителя</button></div></form>`});
Fm['teacher-save']=fd=>{
  const name=fd.get('name').trim(); if(!name)return;
  const login=uniqueLogin('uchitel'), pass=genPass();
  const t={id:uid('u-'),login,pass,role:'teacher',name,schoolId:S.user.schoolId};
  db.users.push(t); save(); closeModal(); renderView();
  credentialsModal({title:'Учитель добавлен',name,login,pass,role:'teacher',againAct:'teacher-add',againLabel:'Добавить ещё учителя'});
};
Act['teacher-del']=d=>{
  const t=userById(d.id);
  if(!confirm(`Удалить учителя «${t.name}»? Его уроки и регистрация классов также будут удалены.`))return;
  db.users=db.users.filter(u=>u.id!==t.id);
  db.schedule=db.schedule.filter(l=>l.teacherId!==t.id);
  db.teachings=db.teachings.filter(x=>x.teacherId!==t.id);
  save(); renderView(); toast('Учитель удалён','info');
};
Act.reveal=d=>{ const el=document.querySelector(`[data-pass-for="${d.target}"]`);
  if(el) el.textContent=el.textContent==='••••••'?el.dataset.secret:'••••••'; };

/* ----- Предметы школы (создаёт директор) ----- */
function directorSubjects(){
  const sid=S.user.schoolId;
  const subs=schoolSubjectObjs(sid);
  const usedBy=sname=>{ const n={teachers:new Set(),classes:new Set()};
    db.teachings.forEach(t=>{ if(t.subject.toLowerCase()===sname.toLowerCase()&&classById(t.classId)?.schoolId===sid){n.teachers.add(t.teacherId);n.classes.add(t.classId);} });
    db.grades.forEach(g=>{ if(g.subject.toLowerCase()===sname.toLowerCase()){n.teachers.add(g.teacherId);const u=userById(g.studentId);if(u)n.classes.add(u.classId);} });
    return n; };
  mount('Предметы школы',`
    <div class="alert alert-info">${icon('book')}<div>Это школьный каталог предметов. Любой учитель сможет выбрать любой из этих предметов в журнале, при выдаче домашнего задания, в карточках и расписании — независимо от того, какой предмет он ведёт.</div></div>
    <div class="toolbar"><span class="sp"></span>
      <button type="button" class="btn btn-primary" data-act="subj-add">${icon('plus')} Добавить предметы списком</button></div>
    ${subs.length?`<div class="card"><div class="table-wrap"><table class="tbl">
      <thead><tr><th>Предмет</th><th class="num">Учителей ведут</th><th class="num">Классов</th><th></th></tr></thead>
      <tbody>${subs.map(s=>{ const n=usedBy(s.name);
        return `<tr data-ctx="subject" data-id="${s.id}" title="ПКМ — действия с предметом">
          <td><b>${icon('book','sm')} ${esc(s.name)}</b></td>
          <td class="num">${n.teachers.size}</td>
          <td class="num">${n.classes.size}</td>
          <td><div class="row-actions">
            <button type="button" class="btn btn-xs" data-act="subj-edit" data-id="${s.id}">${icon('pencil','sm')} Переименовать</button>
            <button type="button" class="btn btn-xs btn-ghost" data-act="subj-del" data-id="${s.id}">${icon('trash','sm')}</button></div></td>
        </tr>`;}).join('')}</tbody></table></div></div>`
      :`<div class="card">${emptyBlock('book','Предметов пока нет','Добавьте предметы школы: Математика, Русский язык, Физика… Учителя увидят их сразу после создания.')}</div>`}
    <h2 class="section-title">${icon('info')} Как это работает</h2>
    <div class="grid cols-3">
      <div class="card"><div class="card-body"><h4>${icon('book','sm')} Журнал</h4><p class="muted" style="font-size:13px">Учитель выбирает любой предмет школы и ставит по нему оценки и отметки.</p></div></div>
      <div class="card"><div class="card-body"><h4>${icon('clipboard','sm')} Домашние задания</h4><p class="muted" style="font-size:13px">ДЗ выдаётся по любому предмету из каталога.</p></div></div>
      <div class="card"><div class="card-body"><h4>${icon('calendar','sm')} Расписание</h4><p class="muted" style="font-size:13px">В сетке можно назначить любой предмет любому учителю.</p></div></div>
    </div>`);
}
const SUBJECT_HINTS=['Математика','Русский язык','Литература','Иностранный язык','История','Обществознание','География','Биология','Физика','Химия','Информатика','Физическая культура','Изобразительное искусство','Музыка','Технология'];
/* разбор списка из текстового поля: запятая, точка с запятой или перевод строки */
function parseNameList(text){
  return String(text||'').split(/[,;\n]/).map(x=>x.trim().replace(/\s+/g,' ')).filter(Boolean);
}
/* аккуратное написание ФИО: заглавная буква после начала, пробела и дефиса */
const normName=s=>s.trim().replace(/\s+/g,' ').replace(/(^|[\s-])([а-яёa-z])/g,(m,p,c)=>p+c.toUpperCase());
function subjectModal(id){
  const s=id?byId(db.subjects,id):null;
  openModal({title:s?'Переименовать предмет':'Новые предметы',wide:!s,body:`
    <form data-form="subj-save">
      <input type="hidden" name="id" value="${s?s.id:''}"/>
      ${s?`<div class="field"><label>Новое название *</label>
        <input class="input" name="name" required maxlength="60" placeholder="Например, Физика" value="${esc(s.name)}"></div>`
      :`<div class="field"><label>Предметы через запятую *</label>
        <textarea class="input" name="names" rows="5" required placeholder="Русский язык, Математика, Литература, История…"></textarea>
        <div class="field-hint">Можно разделять запятой, точкой с запятой или писать каждый предмет с новой строки. Повторы и уже существующие предметы будут пропущены.</div>
        <div class="hint-chips">${SUBJECT_HINTS.map(n=>`<button type="button" class="chip" data-act="subj-hint" data-name="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div></div>`}
      <div class="modal-foot" style="padding:0;border:none">
        <button type="button" class="btn" data-act="close-modal">Отмена</button>
        <button type="submit" class="btn btn-primary">${icon('check')} ${s?'Сохранить':'Добавить предметы'}</button></div></form>`});
  if(!s){
    const ta=modalEl.querySelector('textarea[name=names]');
    modalEl.querySelectorAll('[data-act=subj-hint]').forEach(b=>b.addEventListener('click',()=>{
      const cur=parseNameList(ta.value).map(x=>x.toLowerCase());
      if(!cur.includes(b.dataset.name.toLowerCase())){
        ta.value=(ta.value.trim().replace(/[,;\s]+$/,'')+(ta.value.trim()?', ':'')+b.dataset.name+', ');
      }
      ta.focus();
    }));
  }
}
Act['subj-add']=()=>subjectModal(null);
Act['subj-edit']=d=>subjectModal(d.id);
Fm['subj-save']=fd=>{
  const id=fd.get('id'), sid=S.user.schoolId;
  if(id){
    const name=fd.get('name').trim().replace(/\s+/g,' ');
    if(!name) return toast('Введите название предмета','err');
    const dup=(db.subjects||[]).some(s=>s.schoolId===sid&&s.id!==id&&s.name.toLowerCase()===name.toLowerCase());
    if(dup) return toast('Такой предмет уже есть в школе','err');
    const s=byId(db.subjects,id); if(!s)return;
    const old=s.name; s.name=name;
    db.teachings.forEach(t=>{if(t.subject===old)t.subject=name;});
    db.grades.forEach(g=>{if(g.subject===old)g.subject=name;});
    db.homework.forEach(h=>{if(h.schoolId===sid&&h.subject===old)h.subject=name;});
    db.cards.forEach(c=>{if(c.subject===old)c.subject=name;});
    db.schedule.forEach(l=>{if(l.schoolId===sid&&l.subject===old)l.subject=name;});
    save(); closeModal(); renderView(); toast('Предмет переименован везде, где он используется');
  }else{
    const names=parseNameList(fd.get('names')).map(n=>n.slice(0,60));
    if(!names.length) return toast('Введите хотя бы один предмет','err');
    const have=new Set((db.subjects||[]).filter(x=>x.schoolId===sid).map(x=>x.name.toLowerCase()));
    const added=[], skipped=[]; const seen=new Set();
    names.forEach(name=>{
      const key=name.toLowerCase();
      if(have.has(key)||seen.has(key)){ skipped.push(name); return; }
      seen.add(key); have.add(key);
      db.subjects.push({id:uid('sj-'),schoolId:sid,name});
      added.push(name);
    });
    if(!added.length){ toast('Все указанные предметы уже есть в школе','err'); return; }
    save(); closeModal(); renderView();
    let msg=`Добавлено ${plural(added.length,['предмет','предмета','предметов'])}: ${added.slice(0,5).join(', ')}${added.length>5?'…':''}`;
    if(skipped.length) msg+=`. Пропущено повторов: ${skipped.length}`;
    toast(msg,'ok');
  }
};
Act['subj-del']=d=>{ const s=byId(db.subjects,d.id); if(!s)return;
  if(!confirm(`Удалить предмет «${s.name}» из каталога?\n\nВыставленные оценки, выданные ДЗ и уроки с этим предметом сохранятся, но выбрать его для новых записей будет нельзя.`))return;
  db.subjects=db.subjects.filter(x=>x.id!==d.id);
  save(); renderView(); toast('Предмет удалён из каталога','info'); };

/* ----- Расписание: звонки, перемены, сетка ----- */
function defaultBells(){
  // уроки по 40 минут, между ними перемены
  return [
    {kind:'lesson', start:'08:30', end:'09:10'},
    {kind:'break',  start:'09:10', end:'09:20', label:'Перемена'},
    {kind:'lesson', start:'09:20', end:'10:00'},
    {kind:'break',  start:'10:00', end:'10:20', label:'Большая перемена'},
    {kind:'lesson', start:'10:20', end:'11:00'},
    {kind:'break',  start:'11:00', end:'11:10', label:'Перемена'},
    {kind:'lesson', start:'11:10', end:'11:50'},
    {kind:'break',  start:'11:50', end:'12:00', label:'Перемена'},
    {kind:'lesson', start:'12:00', end:'12:40'},
    {kind:'break',  start:'12:40', end:'12:50', label:'Перемена'},
    {kind:'lesson', start:'12:50', end:'13:30'},
    {kind:'break',  start:'13:30', end:'13:40', label:'Перемена'},
    {kind:'lesson', start:'13:40', end:'14:20'},
  ];
}
function toMin(t){ const [h,m]=String(t||'0:0').split(':').map(Number); return (h||0)*60+(m||0); }
function toHM(min){ return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`; }
function addMin(t,min){ return toHM(toMin(t)+min); }
function durMin(a,b){ return toMin(b)-toMin(a); }
function getBells(sid){
  if(!db.bells) db.bells={};
  if(!db.bells[sid]) db.bells[sid]=defaultBells();
  return db.bells[sid];
}
function lessonSlots(sid){ return getBells(sid).filter(e=>e.kind==='lesson'); }
function periodTime(sid,i){ const l=lessonSlots(sid)[i]; return l?[l.start,l.end]:['','']; }

function directorSchedule(){
  const classes=schoolClasses(S.user.schoolId);
  if(!classes.length) return mount('Расписание',
    `<div class="card">${emptyBlock('cap','Классы ещё не зарегистрированы','Класс появится, когда учитель зарегистрирует свой класс и предмет в разделе «Мои классы».')}</div>`);
  renderSchedulePage(classes,S.p.class,true);
}
function renderSchedulePage(classes,cid,editable){
  cid=(cid&&classes.some(c=>c.id===cid))?cid:classes[0].id;
  const c=classById(cid);
  mount(editable?'Расписание уроков':'Расписание — '+c.name,`
    <div class="toolbar">
      <div class="chips">${classes.map(k=>
        `<button type="button" class="chip ${k.id===cid?'on':''}" data-act="sched-class" data-id="${k.id}">${esc(k.name)}</button>`).join('')}</div>
      <span class="sp"></span>
      ${editable?`<button type="button" class="btn" data-act="bells-open">${icon('clock')} Время уроков и перемен</button>`:''}
    </div>
    ${scheduleGrid(cid,editable)}
    ${editable?`<div class="alert alert-info" style="margin-top:12px">${icon('info')}<div><b>ЛКМ</b> по ячейке — назначить урок, <b>ПКМ</b> — контекстное меню (изменить/очистить). Раздел «Время уроков и перемен» позволяет сдвинуть звонки, добавить урок (по 40 минут) или перемену.</div></div>`:''}`);
}
Act['sched-class']=d=>go('schedule',{class:d.id});

function scheduleGrid(cid,editable){
  const c=classById(cid), sid=c.schoolId, tl=getBells(sid);
  const todayIdx=(new Date().getDay()+6)%7; // 0=пн
  let lessonIdx=-1;
  const rows=tl.map(e=>{
    if(e.kind==='break'){
      const dur=durMin(e.start,e.end);
      return `<tr class="brk-row">
        <td class="brk-time"><span class="coffee">☕</span><b>${esc(e.label||'Перемена')}</b><small>${e.start}–${e.end} · ${dur} мин</small></td>
        ${DAYS.map((_,day)=>`<td class="brk-cell ${day===todayIdx?'today-col':''}"><div class="brk-line"><span>${esc(e.label||'Перемена')} · ${dur} мин</span></div></td>`).join('')}
      </tr>`;
    }
    lessonIdx++; const p=lessonIdx;
    return `<tr class="les-row">
      <td class="period-cell">${p+1}<small>${e.start}–${e.end}<br>${durMin(e.start,e.end)} мин</small></td>
      ${DAYS.map((_,day)=>{
        const l=lessonAt(cid,day,p), t=l?userById(l.teacherId):null;
        const cls=day===todayIdx?'today-col':'';
        if(!editable&&!l) return `<td class="break ${cls}"></td>`;
        if(!editable) return `<td class="${cls}"><div class="lesson"><b>${esc(l.subject)}</b><span>${esc(t?t.name:'')}</span></div></td>`;
        return `<td class="${cls}" data-act="sched-cell" data-day="${day}" data-period="${p}" data-class="${cid}"
          title="ЛКМ — назначить урок, ПКМ — меню">
          ${l?`<div class="lesson"><b>${esc(l.subject)}</b><span>${esc(t?t.name:'')}</span></div>`:'<span class="lesson-pluss">+</span>'}</td>`;
      }).join('')}
    </tr>`;
  }).join('');
  return `<div class="card"><div class="table-wrap">
    <table class="tbl sched">
      <thead><tr><th>Звонки</th>${DAYS.map((d,i)=>`<th class="${i===todayIdx?'today-col':''}">${DAYS_SHORT[i]}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
}

Act['sched-cell']=d=>{
  const day=+d.day, period=+d.period, cid=d.class;
  const c=classById(cid);
  const cur=lessonAt(cid,day,period);
  const catalog=schoolSubjects(c.schoolId);
  // учителя, доступные для этого класса: связанные через преподавание, а для директора — все учителя школы
  const linked=new Map();
  db.teachings.filter(t=>t.classId===cid).forEach(t=>linked.set(t.teacherId,userById(t.teacherId)));
  if(S.user.role==='director') schoolUsers(c.schoolId,'teacher').forEach(t=>linked.set(t.id,t));
  if(S.user.role==='teacher') linked.set(S.user.id,S.user);
  const groups={};
  [...linked.values()].filter(Boolean).forEach(teacher=>{
    const own=db.teachings.filter(t=>t.classId===cid&&t.teacherId===teacher.id).map(t=>t.subject);
    const subs=[...new Set([...catalog,...own])].sort((a,b)=>a.localeCompare(b,'ru'));
    groups[teacher.id]={teacher,subs};
  });
  const options=Object.values(groups).map(g=>
    `<optgroup label="${esc(g.teacher.name)}${g.teacher.elementary?' · начальные классы':''}">${
      g.subs.map(sub=>{const v=`${g.teacher.id}|${sub}`;
        return `<option value="${v}" ${cur&&cur.teacherId===g.teacher.id&&cur.subject===sub?'selected':''}>${esc(sub)}</option>`;}).join('')}</optgroup>`).join('');
  openModal({title:`Урок · ${DAYS[day]}, ${period+1}-й урок (${classById(cid).name})`,
    body:`<form data-form="sched-save">
      <input type="hidden" name="day" value="${day}"/><input type="hidden" name="period" value="${period}"/><input type="hidden" name="class" value="${cid}"/>
      <div class="field"><label>Предмет и учитель</label>
        <select class="input" name="who" required>
          <option value="">— выбрать —</option>
          <option value="__clear__">— окно (удалить урок) —</option>
          ${options}
        </select></div>
      ${options?'':`<div class="alert alert-warn">${icon('info')}<div>${
        S.user.role==='teacher'
          ?'Директор ещё не создал предметы школы. Откройте раздел «Предметы» у директора, затем вернитесь к расписанию.'
          :'В школе пока нет учителей или предметов. Сначала добавьте учителя в разделе «Учителя» и предметы в разделе «Предметы».'
      }</div></div>`}
      <div class="modal-foot" style="padding:0;border:none">
        <button type="button" class="btn" data-act="close-modal">Отмена</button>
        <button type="submit" class="btn btn-primary" ${options?'':'disabled'}>${icon('check')} Сохранить</button>
      </div></form>`});
};
Fm['sched-save']=fd=>{
  const day=+fd.get('day'),period=+fd.get('period'),cid=fd.get('class'),who=fd.get('who');
  if(!who) return toast('Выберите предмет','err');
  const c=classById(cid);
  db.schedule=db.schedule.filter(l=>!(l.classId===cid&&l.day===day&&l.period===period));
  if(who!=='__clear__'){ const [tid,sub]=who.split('|'), t=userById(tid);
    db.schedule.push({id:uid('l-'),schoolId:c.schoolId,classId:cid,day,period,teacherId:tid,subject:sub}); }
  save(); closeModal(); renderView(); toast(who==='__clear__'?'Ячейка очищена':'Расписание обновлено',who==='__clear__'?'info':'ok');
};

/* Контекстное меню ячейки расписания (ПКМ) */
function scheduleCtx(cell,x,y){
  const d=cell.dataset, l=lessonAt(d.class,+d.day,+d.period);
  ctxMenu(x,y,`
    <div class="ctx-head">${DAYS[+d.day]} · ${+d.period+1}-й урок${l?'<br><span>'+esc(l.subject)+'</span>':''}</div>
    <button type="button" class="ctx-item" data-act="ctx-edit-lesson" data-day="${d.day}" data-period="${d.period}" data-class="${d.class}">${icon('pencil','sm')} ${l?'Изменить урок':'Назначить урок'}</button>
    ${l?`<button type="button" class="ctx-item ctx-danger" data-act="ctx-clear-lesson" data-day="${d.day}" data-period="${d.period}" data-class="${d.class}">${icon('trash','sm')} Очистить ячейку</button>`:''}
    <div class="ctx-sep"></div>
    <button type="button" class="ctx-item" data-act="close-ctx">${icon('x','sm')} Отмена</button>`);
}
Act['ctx-edit-lesson']=d=>{ hideCtx(); Act['sched-cell'](d); };
Act['ctx-clear-lesson']=d=>{
  db.schedule=db.schedule.filter(l=>!(l.classId===d.class&&l.day===+d.day&&l.period===+d.period));
  save(); hideCtx(); renderView(); toast('Ячейка очищена','info');
};

/* ----- Редактор звонков: время уроков, перемены ----- */
Act['bells-open']=()=>{
  const sid=S.user.schoolId;
  openModal({title:'Звонки · уроки и перемены',wide:true,body:`
    <div class="alert alert-info" style="margin-top:0">${icon('clock')}<div>Уроки по умолчанию длятся <b>40 минут</b>. Меняйте время, добавляйте уроки и перемены — расписание всех классов обновится автоматически.</div></div>
    <div id="bell-rows" class="bell-rows"></div>
    <div style="display:flex;gap:10px;margin-top:12px">
      <button type="button" class="btn" id="bell-add-lesson">${icon('plus','sm')} Урок (40 мин)</button>
      <button type="button" class="btn" id="bell-add-break">${icon('plus','sm')} Перемена (10 мин)</button>
    </div>
    <div class="modal-foot" style="padding:14px 0 0;border:none">
      <button type="button" class="btn" data-act="close-modal">Отмена</button>
      <button type="button" class="btn btn-primary" id="bell-save">${icon('check')} Сохранить звонки</button>
    </div>`});
  const list=getBells(sid).map(e=>{
    const cp={...e};
    if(cp.kind==='break') cp._dur=Math.max(1,durMin(cp.start,cp.end));
    return cp;
  });
  const wrap=modalEl.querySelector('#bell-rows');
  function tpl(e,idx){
    if(e.kind==='lesson'){
      const n=list.slice(0,idx+1).filter(x=>x.kind==='lesson').length;
      return `<div class="bell-row" data-idx="${idx}" data-kind="lesson">
        <span class="badge b-blue bell-badge">${n} урок</span>
        <input type="time" class="input bell-start" value="${e.start}" title="Начало урока">
        <span class="bell-dash">–</span>
        <input type="time" class="input bell-end" value="${e.end}" readonly tabindex="-1" title="Урок всегда длится 40 минут">
        <span class="bell-dur">40 мин</span>
        <button type="button" class="icon-btn bell-del" title="Удалить">${icon('trash','sm')}</button>
      </div>`;
    }
    return `<div class="bell-row" data-idx="${idx}" data-kind="break">
      <span class="badge b-amber bell-badge">Перемена</span>
      <input type="time" class="input bell-start" value="${e.start}" readonly tabindex="-1" title="Начало перемены следует за уроком">
      <span class="bell-dash">–</span>
      <input type="time" class="input bell-end" value="${e.end}" title="Конец перемены (задаёт её длительность)">
      <input type="text" class="input bell-label" value="${esc(e.label||'Перемена')}" placeholder="Название" style="max-width:160px">
      <span class="bell-dur">${e._dur||durMin(e.start,e.end)} мин</span>
      <button type="button" class="icon-btn bell-del" title="Удалить">${icon('trash','sm')}</button>
    </div>`;
  }
  function rerender(){ wrap.innerHTML=list.map(tpl).join(''); }
  /* переназначить все времена начиная с idx: урок 40 мин, следующая позиция начинается там, где кончилась предыдущая */
  function syncFrom(idx){
    for(let i=idx;i<list.length;i++){
      const e=list[i];
      if(i>idx) e.start=list[i-1].end;
      if(e.kind==='lesson') e.end=addMin(e.start,40);
      else{
        let dur=+e._dur;
        if(!(dur>0)) dur=/больш/i.test(e.label||'')?20:10;
        e._dur=dur; e.end=addMin(e.start,dur);
      }
    }
    wrap.querySelectorAll('.bell-row').forEach(row=>{
      const i=+row.dataset.idx, e=list[i]; if(!e)return;
      row.querySelector('.bell-start').value=e.start;
      row.querySelector('.bell-end').value=e.end;
      row.querySelector('.bell-dur').textContent=(e.kind==='lesson'?40:e._dur)+' мин';
    });
  }
  function appendEntry(kind){
    const last=list[list.length-1];
    const start=last?last.end:'08:30';
    if(kind==='lesson') list.push({kind:'lesson',start,end:addMin(start,40)});
    else list.push({kind:'break',start,end:addMin(start,10),label:'Перемена',_dur:10});
    rerender(); syncFrom(list.length-1);
    wrap.lastElementChild?.querySelector(kind==='lesson'?'.bell-start':'.bell-end')?.focus();
  }
  modalEl.querySelector('#bell-add-lesson').addEventListener('click',()=>appendEntry('lesson'));
  modalEl.querySelector('#bell-add-break').addEventListener('click',()=>appendEntry('break'));
  wrap.addEventListener('input',e=>{
    const row=e.target.closest('.bell-row'); if(!row)return;
    const idx=+row.dataset.idx, en=list[idx];
    if(e.target.classList.contains('bell-start')){ // сдвиг начала урока — каскад вниз
      if(!/^\d{2}:\d{2}$/.test(e.target.value)) return;
      en.start=e.target.value; syncFrom(idx);
      wrap.querySelectorAll('.bell-row')[idx]?.querySelector('.bell-start')?.focus();
    }else if(e.target.classList.contains('bell-end')){ // меняется длительность перемены
      if(!/^\d{2}:\d{2}$/.test(e.target.value)) return;
      const dur=durMin(en.start,e.target.value);
      if(dur<1) return toast('Перемена должна длиться хотя бы 1 минуту','err');
      en._dur=dur; syncFrom(idx);
    }else if(e.target.classList.contains('bell-label')){
      en.label=e.target.value||'Перемена';
    }
  });
  wrap.addEventListener('click',e=>{
    const del=e.target.closest('.bell-del'); if(!del)return;
    const idx=+del.closest('.bell-row').dataset.idx;
    if(list.filter(x=>x.kind==='lesson').length===1 && list[idx].kind==='lesson') return toast('Должен остаться хотя бы один урок','err');
    list.splice(idx,1); rerender(); if(list.length) syncFrom(Math.min(idx,list.length-1));
  });
  modalEl.querySelector('#bell-save').addEventListener('click',()=>{
    const lessons=list.filter(e=>e.kind==='lesson');
    if(!lessons.length) return toast('Должен быть хотя бы один урок','err');
    for(let i=0;i<list.length;i++){
      const e=list[i];
      if(!e.start||!e.end||durMin(e.start,e.end)<=0) return toast('Проверьте время в строке '+(i+1),'err');
      if(i>0 && toMin(e.start)<toMin(list[i-1].end)) return toast('Время в строке '+(i+1)+' пересекается с предыдущей','err');
    }
    const oldLessonCount=lessonSlots(sid).length;
    db.bells[sid]=list.map(e=>e.kind==='break'
      ?{kind:'break',start:e.start,end:e.end,label:e.label||'Перемена'}
      :{kind:'lesson',start:e.start,end:e.end});
    // если уроков стало меньше — уроки расписания за пределами сетки удаляем
    const newCount=lessonSlots(sid).length;
    if(newCount<oldLessonCount) db.schedule=db.schedule.filter(l=>!(l.schoolId===sid&&l.period>=newCount));
    save(); closeModal(); renderView(); toast('Расписание звонков сохранено','ok');
  });
  rerender();
};

/* ----- Награды ----- */
function directorRewards(){
  const sch=schoolById(S.user.schoolId);
  const rewards=db.rewards.filter(r=>r.schoolId===sch.id);
  mount('Награды для магазина',`
    <div class="alert alert-info">${icon('gift')}<div>Награды видят ученики в «Магазине наград» и покупают их за Классниксы, которые начисляют учителя.</div></div>
    <div class="toolbar"><span class="sp"></span>
      <button type="button" class="btn btn-primary" data-act="reward-add">${icon('plus')} Добавить награду</button></div>
    <div class="reward-grid">${rewards.map(r=>`
      <div class="reward" data-ctx="reward" data-id="${r.id}" title="ПКМ — действия с наградой"><div class="r-ic">🎁</div><h4>${esc(r.title)}</h4><p>${esc(r.desc||'')}</p>
        <div class="r-cost">${r.cost}</div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-sm" style="flex:1" data-act="reward-edit" data-id="${r.id}">${icon('pencil','sm')} Изменить</button>
          <button type="button" class="btn btn-sm btn-ghost" data-act="reward-del" data-id="${r.id}">${icon('trash','sm')}</button>
        </div></div>`).join('')}</div>`);
}
function rewardModal(r){
  openModal({title:r?'Изменить награду':'Новая награда',body:`
    <form data-form="reward-save"><input type="hidden" name="id" value="${r?r.id:''}"/>
      <div class="field"><label>Название *</label><input class="input" name="title" required value="${r?esc(r.title):''}"/></div>
      <div class="field"><label>Описание</label><textarea class="input" name="desc">${r?esc(r.desc||''):''}</textarea></div>
      <div class="field"><label>Стоимость, Классниксы *</label><input class="input" type="number" min="1" name="cost" required value="${r?r.cost:30}"/></div>
      <div class="modal-foot" style="padding:0;border:none">
        <button type="button" class="btn" data-act="close-modal">Отмена</button>
        <button type="submit" class="btn btn-primary">${icon('check')} Сохранить</button></div></form>`});
}
Act['reward-add']=()=>rewardModal(null);
Act['reward-edit']=d=>rewardModal(byId(db.rewards,d.id));
Act['reward-del']=d=>{ if(confirm('Удалить награду? Купленные награды сохранятся.')){
  db.rewards=db.rewards.filter(r=>r.id!==d.id); save(); renderView(); toast('Награда удалена','info'); }};
Fm['reward-save']=fd=>{
  const id=fd.get('id'),title=fd.get('title').trim(),desc=fd.get('desc').trim(),cost=Math.max(1,+fd.get('cost')||1);
  if(id) Object.assign(byId(db.rewards,id),{title,desc,cost});
  else db.rewards.push({id:uid('r-'),schoolId:S.user.schoolId,title,desc,cost});
  save(); closeModal(); renderView(); toast('Награда сохранена');
};

/* =====================================================================
   НОВОСТИ
===================================================================== */
function newsPage(readOnly){
  const u=S.user;
  const list=db.news.filter(n=>n.schoolId===u.schoolId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  mount('Новости школы',`
    ${readOnly?'':`<div class="toolbar"><span class="sp"></span>
      <button type="button" class="btn btn-primary" data-act="news-add">${icon('plus')} Опубликовать новость</button></div>`}
    <div class="lists">${list.map(n=>`
      <div class="list-item news-item" ${(!readOnly&&n.authorId===u.id)?`data-ctx="news" data-id="${n.id}" title="ПКМ — действия с новостью"`:''}><div class="news-bar"></div>
        <span class="stat-ico bg-director" style="align-self:flex-start">${icon('megaphone')}</span>
        <div class="li-main"><h4>${esc(n.title)}</h4>
          <div class="li-meta">${icon('clock','sm')} ${fmtDateTime(n.createdAt)} · ${esc(n.authorName)}</div>
          <div class="li-desc">${esc(n.body)}</div></div>
        ${(!readOnly&&n.authorId===u.id)?`<div class="li-side"><button type="button" class="btn btn-xs btn-ghost" data-act="news-del" data-id="${n.id}">${icon('trash','sm')}</button></div>`:''}
      </div>`).join('')}</div>
    ${list.length?'':emptyBlock('megaphone','Новостей пока нет')}`);
}
Act['news-add']=()=>openModal({title:'Новая новость',body:`
  <form data-form="news-save">
    <div class="field"><label>Заголовок *</label><input class="input" name="title" required maxlength="120"/></div>
    <div class="field"><label>Текст *</label><textarea class="input" name="body" required style="min-height:130px"></textarea></div>
    <div class="modal-foot" style="padding:0;border:none">
      <button type="button" class="btn" data-act="close-modal">Отмена</button>
      <button type="submit" class="btn btn-primary">${icon('megaphone')} Опубликовать</button></div></form>`});
Fm['news-save']=fd=>{
  db.news.push({id:uid('n-'),schoolId:S.user.schoolId,title:fd.get('title').trim(),body:fd.get('body').trim(),
    authorId:S.user.id,authorName:S.user.name,createdAt:dtISO(0)});
  save(); closeModal(); renderView(); toast('Новость опубликована');
};
Act['news-del']=d=>{ if(confirm('Удалить новость?')){ db.news=db.news.filter(n=>n.id!==d.id); save(); renderView(); toast('Новость удалена','info'); }};

/* =====================================================================
   УЧИТЕЛЬ
===================================================================== */
function pageTeacher(){
  if(S.page==='myclasses') return teacherMyClasses();
  if(S.page==='journal') return teacherJournal();
  if(S.page==='homework') return teacherHomework();
  if(S.page==='cards') return teacherCards();
  if(S.page==='news') return newsPage(false);
  if(S.page==='students') return teacherStudents();
  if(S.page==='coins') return teacherCoins();
  if(S.page==='schedule') return teacherSchedule();
  return teacherDashboard();
}
function teacherOnboardingBanner(){
  if(teacherClassIds(S.user.id).length) return '';
  return `<div class="alert alert-warn onboard">${icon('cap')}<div><b>С чего начать:</b> откройте раздел «Мои классы» — зарегистрируйте класс и предмет (или отметьте, что вы учитель начальных классов), затем создайте учеников.</div>
    <button type="button" class="btn btn-sm btn-primary" style="margin-left:auto" data-act="nav" data-page="myclasses">Перейти</button></div>`;
}
function teacherDashboard(){
  const u=S.user;
  const cids=teacherClassIds(u.id);
  const myLessons=db.schedule.filter(l=>l.teacherId===u.id);
  const myHw=db.homework.filter(h=>h.teacherId===u.id&&dayDiff(h.due)>=0);
  const todayLessons=myLessons.filter(l=>l.day===new Date().getDay()-1);
  const lastGrades=db.grades.filter(g=>g.teacherId===u.id).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  mount('Обзор',`
    <div class="welcome" style="background:linear-gradient(120deg,#047857,#10b981)">
      <div><h2>Здравствуйте, ${esc(u.name.split(' ').slice(1).join(' ')||u.name)}!</h2>
      <p>${teacherSubjects(u.id).join(', ')||'предмет ещё не зарегистрирован'} · ${esc(schoolById(u.schoolId).name)}</p></div>
      <div class="w-coins"><b>${myLessons.length}</b><span>уроков в неделю</span></div>
    </div>
    ${teacherOnboardingBanner()}
    <div class="grid cols-4" style="margin-top:16px">
      ${statCard('cap','teacher',cids.length,'классов в работе')}
      ${statCard('users','student',myStudents(u.id).length,'учеников')}
      ${statCard('clipboard','student',myHw.length,'активных ДЗ')}
      ${statCard('coins','student',db.transactions.filter(t=>t.teacherId===u.id).length,'операций с Классниксами')}
    </div>
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card"><div class="card-head"><h3>${icon('calendar')} Сегодня по расписанию</h3></div><div class="card-body">
        ${todayLessons.length?scheduleList(todayLessons):emptyBlock('calendar','Сегодня у вас нет уроков')}</div></div>
      <div class="card"><div class="card-head"><h3>${icon('book')} Последние оценки</h3></div><div class="card-body">
        ${lastGrades.length?`<div class="lists">${lastGrades.map(g=>{const s=userById(g.studentId);
          return `<div class="list-item" style="box-shadow:none;padding:8px 4px;border-color:#f1f5f9">
            ${g.kind==='mark'?`<span class="g-chip xm ${MARK_BY_CODE[g.mark]?MARK_BY_CODE[g.mark].cls:''}">${g.mark}</span>`:`<span class="g-chip grade-${g.value}">${g.value}</span>`}
            <div class="li-main"><b>${s?esc(s.name):'—'}</b><div class="li-meta" style="margin:0">${esc(g.subject)} · ${fmtShort(g.date)}${g.kind==='mark'?' · '+esc(markName(g.mark)):''}</div></div></div>`;}).join('')}</div>`
          :emptyBlock('book','Оценок пока нет')}</div></div>
    </div>`);
}

/* ----- Мои классы: регистрация класса и предмета ----- */
function teacherMyClasses(){
  const u=S.user, classes=schoolClasses(u.schoolId);
  const myCids=teacherClassIds(u.id);
  mount('Мои классы и предметы',`
    ${teacherOnboardingBanner()}
    <div class="toolbar"><span class="sp"></span>
      <button type="button" class="btn btn-primary" data-act="reg-open">${icon('plus')} Зарегистрировать класс и предмет</button></div>
    <div class="grid">${myCids.map(cid=>{ const c=classById(cid); const subs=teacherSubjects(u.id,cid);
      const n=classStudents(cid).length;
      return `<div class="list-item" data-ctx="cls" data-id="${cid}" title="ПКМ — действия с классом">
        <span class="stat-ico bg-teacher" style="align-self:flex-start">${icon('cap')}</span>
        <div class="li-main">
          <h4>${esc(c.name)} ${c.homeroomTeacherId===u.id?'<span class="badge b-green">классный руководитель · начальные классы</span>':''}</h4>
          <div class="chips" style="margin:6px 0">${subs.map(s=>`<span class="chip on" style="cursor:default">${esc(s)}</span>`).join('')}</div>
          <div class="li-meta">${n} ${plural(n,['ученик','ученика','учеников'])} в классе</div>
        </div>
        <div class="li-side">
          <button type="button" class="btn btn-sm" data-act="nav" data-page="journal" data-class="${cid}">${icon('book','sm')} Журнал</button>
          <button type="button" class="btn btn-sm" data-act="student-add-for" data-class="${cid}">${icon('plus','sm')} Добавить учеников</button>
        </div></div>`;}).join('')}</div>
    ${myCids.length?'':`<div class="card">${emptyBlock('cap','Вы ещё не зарегистрировали ни одного класса','Нажмите кнопку выше: укажите класс и предмет, который вы в нём ведёте.')}</div>`}
    ${classes.length&&classes.some(c=>!myCids.includes(c.id))?`<h2 class="section-title">${icon('building')} Другие классы школы</h2>
      <div class="card"><div class="card-body" style="display:flex;gap:10px;flex-wrap:wrap">${classes.filter(c=>!myCids.includes(c.id)).map(c=>
        `<span class="badge b-gray" style="font-size:13px;padding:6px 12px">${esc(c.name)}</span>`).join('')}</div></div>`:''}`);
}
Act['reg-open']=()=>{
  const u=S.user;
  const classes=schoolClasses(u.schoolId);
  const catalog=schoolSubjects(u.schoolId);
  openModal({title:'Регистрация класса и предмета',wide:true,body:`
    <form data-form="reg-save">
      <div class="field"><label>Класс</label>
        <select class="input" name="target" id="reg-target">
          <option value="__new__">➕ Новый класс</option>
          ${classes.map(c=>`<option value="${c.id}">Существующий класс: ${esc(c.name)}${c.homeroomTeacherId?' (есть классный руководитель)':''}</option>`).join('')}
        </select></div>
      <div class="field" id="reg-newname"><label>Название нового класса *</label>
        <input class="input" name="newName" placeholder='Например, 5 «А»'/></div>
      <div class="field"><label>Формат работы</label>
        <div class="seg">
          <button type="button" class="on" data-act="reg-kind" data-kind="subject">📘 Предметник</button>
          <button type="button" data-act="reg-kind" data-kind="elementary">🧸 Учитель начальных классов</button>
        </div>
        <input type="hidden" name="kind" id="reg-kind-input" value="subject"/></div>
      <div class="field" id="reg-subject"><label>Предмет * (из каталога школы)</label>
        ${catalog.length
          ?`<select class="input" name="subject" required>${catalog.map(s=>`<option>${esc(s)}</option>`).join('')}</select>`
          :`<div class="alert alert-warn" style="margin:0">${icon('info')}<div>Директор ещё не создал ни одного предмета. Попросите его открыть раздел «Предметы» и добавить предметы школы.</div></div>`}
      </div>
      <div class="field hidden" id="reg-elem-note"><div class="alert alert-ok" style="margin:0">${icon('check')}<div>Будут зарегистрированы предметы: <b>${ELEM_SUBJECTS.join(', ')}</b> (если каких-то нет в каталоге, они добавятся автоматически), и вы станете классным руководителем класса.</div></div></div>
      <div class="modal-foot" style="padding:0;border:none">
        <button type="button" class="btn" data-act="close-modal">Отмена</button>
        <button type="submit" class="btn btn-primary">${icon('check')} Зарегистрировать</button></div></form>`});
};
Act['reg-kind']=d=>{
  $('#reg-kind-input').value=d.kind;
  modalEl.querySelectorAll('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.kind===d.kind));
  $('#reg-subject').classList.toggle('hidden',d.kind==='elementary');
  $('#reg-elem-note').classList.toggle('hidden',d.kind!=='elementary');
  modalEl.querySelector('[name=subject]').required=d.kind==='subject';
};
Fm['reg-save']=fd=>{
  const u=S.user, target=fd.get('target'), kind=fd.get('kind');
  let cid,c;
  if(target==='__new__'){
    const name=fd.get('newName').trim();
    if(!name) return toast('Введите название класса','err');
    if(schoolClasses(u.schoolId).some(x=>x.name.toLowerCase()===name.toLowerCase())) return toast('Такой класс уже есть в школе','err');
    c={id:uid('c-'),schoolId:u.schoolId,name}; db.classes.push(c); cid=c.id;
  } else { cid=target; c=classById(cid); }
  if(kind==='elementary'){
    if(c.homeroomTeacherId && c.homeroomTeacherId!==u.id) return toast('У этого класса уже есть классный руководитель','err');
    c.homeroomTeacherId=u.id; u.elementary=true;
    ensureSubjects(u.schoolId,ELEM_SUBJECTS);
    const have=new Set(db.teachings.filter(t=>t.teacherId===u.id&&t.classId===cid).map(t=>t.subject));
    ELEM_SUBJECTS.forEach(sub=>{ if(!have.has(sub)) db.teachings.push({id:uid('tc-'),teacherId:u.id,classId:cid,subject:sub}); });
    save(); closeModal(); renderView(); toast(`Вы зарегистрированы как учитель начальных классов в классе ${c.name}`);
  } else {
    const subject=(fd.get('subject')||'').trim();
    if(!subject) return toast('Директор должен сначала создать предметы в разделе «Предметы»','err');
    if(db.teachings.some(t=>t.teacherId===u.id&&t.classId===cid&&t.subject.toLowerCase()===subject.toLowerCase()))
      return toast('Этот предмет уже зарегистрирован в данном классе','err');
    db.teachings.push({id:uid('tc-'),teacherId:u.id,classId:cid,subject});
    if(!u.subject) u.subject=subject;
    save(); closeModal(); renderView(); toast(`Предмет «${subject}» зарегистрирован в классе ${c.name}. Теперь в журнале доступны ВСЕ предметы школы`);
  }
};

/* ----- Журнал ----- */
/* =====================================================================
   ЖУРНАЛ В СТИЛЕ EXCEL: выделение ячеек, ПКМ-меню, клавиши 1-5, стрелки
===================================================================== */
let ctxMenuEl=null;
function hideCtx(){ if(ctxMenuEl){ ctxMenuEl.remove(); ctxMenuEl=null; } sheetMenuCtx=null; }
function ctxMenu(x,y,html){
  if(ctxMenuEl){ ctxMenuEl.remove(); ctxMenuEl=null; } /* без сброса sheetMenuCtx — меню может переоткрываться */
  closeModal();
  ctxMenuEl=document.createElement('div');
  ctxMenuEl.className='ctx-menu';
  ctxMenuEl.innerHTML=html;
  document.body.appendChild(ctxMenuEl);
  const r=ctxMenuEl.getBoundingClientRect();
  const left=Math.max(8,Math.min(x, window.innerWidth-r.width-8));
  const top =Math.max(8,Math.min(y, window.innerHeight-r.height-8));
  ctxMenuEl.style.left=left+'px'; ctxMenuEl.style.top=top+'px';
  requestAnimationFrame(()=>ctxMenuEl.classList.add('show'));
}
document.addEventListener('click',e=>{ if(ctxMenuEl && !e.target.closest('.ctx-menu')) hideCtx(); },true);
document.addEventListener('scroll',hideCtx,true);
window.addEventListener('resize',hideCtx);
Act['close-ctx']=()=>hideCtx();

function avgClass(a){ return a==null?'':a>=4.5?'grade-5':a>=3.5?'grade-4':a>=2.5?'grade-3':a>=1.5?'grade-2':'grade-1'; }

/* 12 учебных дней: от 4 дней назад до будущих дат (уроки можно оценивать заранее) */
function journalDates(n){
  const out=[]; const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-4);
  while(out.length<n){ const dow=d.getDay(); if(dow!==0&&dow!==6) out.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
  return out;
}
/* одна запись ячейки: оценка или отметка */
function entryChip(g){
  if(g.kind==='mark'){ const m=MARK_BY_CODE[g.mark];
    return `<span class="xm ${m?m.cls:''}" title="${esc(markName(g.mark))}">${esc(g.mark)}${g.label?'<i class="xg-dot" title="'+esc(g.label)+'"></i>':''}</span>`; }
  return `<span class="xg grade-bg-${g.value}">${g.value}${g.label?'<i class="xg-dot" title="'+esc(g.label)+'"></i>':''}</span>`;
}
function entryTitle(g){
  if(g.kind==='mark') return g.mark+' — '+markName(g.mark)+(g.label?' · '+g.label:'');
  return String(g.value)+(g.label?' · '+g.label:'');
}

function teacherJournal(){
  const u=S.user;
  const myCids=teacherClassIds(u.id);
  const classes=schoolClasses(u.schoolId).slice().sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  if(!classes.length) return mount('Журнал',`<div class="card">${emptyBlock('cap','В школе пока нет классов',
    'Зарегистрируйте класс и предмет в разделе «Мои классы» — после этого здесь появится журнал.')}</div>
    <div style="text-align:center;margin-top:14px"><button type="button" class="btn btn-primary" data-act="nav" data-page="myclasses">${icon('cap')} К регистрации класса</button></div>`);
  const cid=(S.p.class&&classes.some(c=>c.id===S.p.class))?S.p.class:(myCids[0]||classes[0].id);
  const subs=schoolWideSubjects(u.schoolId);
  if(!subs.length) return mount('Журнал',`<div class="card">${emptyBlock('book','Директор ещё не создал предметы',
    'Каталог предметов школы ведит директор в разделе «Предметы». После этого здесь появится журнал.')}</div>
    <div class="sheet-hint">Отметки: <b>З</b> — замечание, <b>Н</b> — отсутствие, <b>У</b> — ув. причина, <b>П</b> — присутствовал, но не работал, <b>О</b> — опоздание, <b>АЗ</b> — академическая задолженность.</div>`);
  const own=teacherSubjects(u.id,cid);
  const subject=(S.p.subject&&subs.includes(S.p.subject))?S.p.subject:(own[0]||subs[0]);
  S.p={class:cid,subject};
  const dates=journalDates(12), students=classStudents(cid), tIso=todayISO();
  const gradesAt=(sid,date)=>db.grades.filter(g=>g.studentId===sid&&g.date===date&&g.subject===subject);
  const wdOf=iso=>DAYS_SHORT[((new Date(iso+'T12:00').getDay()+6)%7)];
  const classChip=(c)=>{
    const mine=myCids.includes(c.id);
    const teachers=teachersOfClass(c.id).map(t=>t.name.split(' ').slice(0,2).join(' ')).join(', ');
    return `<button type="button" class="chip ${c.id===cid?'on':''} ${mine?'':'chip-other'}"
      data-act="jr-class" data-id="${c.id}" title="${mine?'Вы преподаёте в этом классе':(teachers?'Ведут: '+esc(teachers):'За классом пока не закреплён учитель')}">${esc(c.name)}${mine?'':' <span class="chip-ext">●</span>'}</button>`;
  };
  mount(`Журнал — ${subject}`,
    `<div class="toolbar">
      <div class="chips">${classes.map(classChip).join('')}</div>
      <span class="sp"></span>
      <div class="chips">${subs.map(s=>`<button type="button" class="chip ${s===subject?'on':''} ${own.includes(s)?'':'chip-other'}" data-act="jr-subject" data-id="${cid}" data-subject="${esc(s)}">${esc(s)}${own.includes(s)?'':' <span class="chip-ext">●</span>'}</button>`).join('')}</div>
    </div>
    ${(myCids.includes(cid)&&own.includes(subject))?'':`<div class="alert alert-info" style="margin:0 0 10px">${icon('info')}<div>${myCids.includes(cid)?'':`<b>${esc(classById(cid).name)}</b> — класс других учителей. `}${own.includes(subject)?'':`Предмет <b>«${esc(subject)}»</b> не закреплён за вами в этом классе. `}Оценки и отметки сохранятся от вашего имени и будут видны классному руководителю и ученикам.</div></div>`}
    <div class="sheet-card">
      <div class="sheet-wrap">
        <table class="xsheet" id="grade-sheet">
          <thead><tr>
            <th class="x-num"></th>
            <th class="x-stu">Ученик</th>
            ${dates.map(d=>`<th class="x-date ${d===tIso?'today':''}"><div class="x-dow">${wdOf(d)}</div><div class="x-dnum">${fmtShort(d)}</div></th>`).join('')}
            <th class="x-avg">Ср.</th>
          </tr></thead>
          <tbody>
          ${students.map((s,ri)=>{
            const cells=dates.map(dt=>gradesAt(s.id,dt));
            const a=avg(cells.flat().filter(isNumericGrade).map(g=>g.value));
            return `<tr>
              <td class="x-num">${ri+1}</td>
              <th class="x-stu"><div class="x-stu-in">${avatar(s)}<b>${esc(s.name)}</b></div></th>
              ${cells.map((gs,i)=>`<td class="x-cell ${gs.length?'has-grade':''} ${dates[i]===tIso?'today':''}"
                   tabindex="0" data-student="${s.id}" data-date="${dates[i]}"
                   title="${gs.length?gs.map(entryTitle).join('; '):''}">
                   <div class="x-stack">${gs.slice(0,4).map(entryChip).join('')}${gs.length>4?`<span class="xg-more">+${gs.length-4}</span>`:''}</div></td>`).join('')}
              <td class="x-avg"><span class="avg-pill ${a==null?'b-gray':avgClass(a)}" ${a==null?'style="background:#f1f5f9;color:#94a3b8"':''}>${a==null?'':a.toFixed(2).replace('.',',')}</span></td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
      ${students.length?'':`<div style="position:absolute;inset:0;display:grid;place-items:center;pointer-events:none">${emptyBlock('cap','В классе пока нет учеников','Создайте их в разделе «Ученики».')}</div>`}
    </div>
    <div class="sheet-hint">
      <span><b>ПКМ</b> по ячейке — оценки (5,3,3 / 5/2), тема и отметки З Н У П О АЗ</span>
      <span>Клавиши <b>1–5</b> — быстро добавить оценку</span>
      <span><b>Delete</b> — убрать последнюю запись</span>
      <span><b>←↑→↓</b> — перемещение · ученики по алфавиту</span>
    </div>
    <div class="marks-legend">
      ${MARKS.map(m=>`<span class="lg-item"><span class="xm ${m.cls}" title="${esc(m.name)}">${m.code}</span><span class="muted">${esc(m.name)}</span></span>`).join('')}
    </div>`);
}
Act['jr-class']=d=>go('journal',{class:d.id});
Act['jr-subject']=d=>go('journal',{class:d.id,subject:d.subject});

function selectSheetCell(c){
  if(!c)return;
  document.querySelectorAll('.x-cell.x-selected').forEach(x=>x.classList.remove('x-selected'));
  c.classList.add('x-selected');
}
function reselectCell(sid,date){
  const c=document.querySelector(`.x-cell[data-student="${sid}"][data-date="${date}"]`);
  if(c){ selectSheetCell(c); try{c.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){} }
}
let sheetMenuCtx=null; // {sid,date,x,y,label} — чтобы меню оставалось открытым при добавлении оценок
function gradesAtCell(sid,date){ if(!S.p||!S.p.subject)return [];
  return db.grades.filter(g=>g.studentId===sid&&g.date===date&&g.subject===S.p.subject); }
function reopenSheetMenu(sid,date,label){
  const c=document.querySelector(`.x-cell[data-student="${sid}"][data-date="${date}"]`);
  if(c&&sheetMenuCtx) sheetCellMenu(c,sheetMenuCtx.x,sheetMenuCtx.y,label);
}
function addSheetGrade(sid,date,val,label=''){
  if(!S.p||!S.p.subject)return;
  db.grades.push({id:uid('g-'),kind:'grade',studentId:sid,subject:S.p.subject,teacherId:S.user.id,date,value:val,label:label?String(label).trim().slice(0,80):''});
  save(); renderView(); reselectCell(sid,date);
  reopenSheetMenu(sid,date,label);
  toast(val===1?'Выставлена «1» — стоит обсудить с учеником':`Оценка «${val}» добавлена`, val<=2?'info':'ok');
}
function addSheetMark(sid,date,mark,label=''){
  if(!S.p||!S.p.subject)return;
  db.grades.push({id:uid('g-'),kind:'mark',mark,studentId:sid,subject:S.p.subject,teacherId:S.user.id,date,label:label?String(label).trim().slice(0,80):''});
  save(); renderView(); reselectCell(sid,date);
  reopenSheetMenu(sid,date,label);
  toast(`Отметка «${mark}» — ${markName(mark)}`,'info');
}
function delSheetGrade(gid){
  const g=db.grades.find(x=>x.id===gid); if(!g)return;
  const keepLab=ctxMenuEl?(ctxMenuEl.querySelector('#sheet-label')||{}).value||'':'';
  db.grades=db.grades.filter(x=>x.id!==gid);
  save(); renderView(); reselectCell(g.studentId,g.date);
  if(sheetMenuCtx) reopenSheetMenu(g.studentId,g.date,keepLab);
  toast('Запись удалена','info');
}
function clearSheetCell(sid,date){
  const n=gradesAtCell(sid,date).length;
  db.grades=db.grades.filter(g=>!(g.studentId===sid&&g.date===date&&g.subject===S.p.subject));
  save(); hideCtx(); renderView(); reselectCell(sid,date);
  toast(n>1?`Удалено записей: ${n}`:'Запись удалена','info');
}
Act['sheet-grade']=d=>{ const inp=ctxMenuEl?ctxMenuEl.querySelector('#sheet-label'):null;
  addSheetGrade(d.student,d.date,+d.val,inp?inp.value:''); };
Act['sheet-mark']=d=>{ const inp=ctxMenuEl?ctxMenuEl.querySelector('#sheet-label'):null;
  addSheetMark(d.student,d.date,d.mark,inp?inp.value:''); };
Act['sheet-grade-del']=d=>delSheetGrade(d.gid);
Act['sheet-clear']=d=>clearSheetCell(d.student,d.date);

function sheetCellMenu(cell,x,y,keepLabel=''){
  const sid=cell.dataset.student, date=cell.dataset.date;
  const student=userById(sid);
  const gs=gradesAtCell(sid,date);
  const dow=DAYS_SHORT[((new Date(date+'T12:00').getDay()+6)%7)];
  selectSheetCell(cell);
  sheetMenuCtx={sid,date,x,y};
  ctxMenu(x,y,`
    <div class="ctx-head">${esc(student?student.name:'')}<br><span>${dow} · ${fmtDate(date)} · ${esc(S.p.subject)}</span></div>
    <div class="ctx-label">Тема / описание (необязательно)</div>
    <input type="text" class="input ctx-input" id="sheet-label" maxlength="80" placeholder="Например, Сочинение" value="${esc(keepLabel||'')}"/>
    <div class="ctx-label" style="margin-top:7px">Добавить оценку</div>
    <div class="ctx-grades">
      ${[5,4,3,2,1].map(v=>`<button type="button" class="ctx-grade g${v}" title="${{5:'Отлично',4:'Хорошо',3:'Удовлетворительно',2:'Неудовлетворительно',1:'Единица'}[v]}"
        data-act="sheet-grade" data-student="${sid}" data-date="${date}" data-val="${v}">${v}</button>`).join('')}
    </div>
    <div class="ctx-label" style="margin-top:6px">Отметка</div>
    <div class="ctx-marks">
      ${MARKS.map(m=>`<button type="button" class="ctx-xmark ${m.cls}" title="${esc(m.name)}"
        data-act="sheet-mark" data-student="${sid}" data-date="${date}" data-mark="${m.code}">${m.code}</button>`).join('')}
    </div>
    ${gs.length?`<div class="ctx-sep"></div>
      <div class="ctx-label">Выставлено в этот день — ${gs.length}</div>
      <div class="ctx-gradelist">
        ${gs.map(g=>`<div class="ctx-grow">
            ${entryChip(g)}
            <span class="ctx-grow-label" title="${esc(g.label||'')}">${g.kind==='mark'?esc(markName(g.mark)):esc(g.label||'без темы')}</span>
            <button type="button" class="icon-btn ctx-grow-del" title="Удалить эту запись" data-act="sheet-grade-del" data-gid="${g.id}">${icon('trash','sm')}</button>
          </div>`).join('')}
      </div>
      <div class="ctx-sep"></div>
      <button type="button" class="ctx-item ctx-danger" data-act="sheet-clear" data-student="${sid}" data-date="${date}">${icon('trash','sm')} Очистить все (${gs.length})</button>`
      :'<div class="ctx-sep"></div><div class="ctx-hint">Несколько оценок: 5,3,3 или 5/2. Отметки: З, Н, У, П, О, АЗ.</div>'}`);
  const inp=ctxMenuEl&&ctxMenuEl.querySelector('#sheet-label');
  if(inp){ inp.focus();
    inp.addEventListener('keydown',ev=>{ ev.stopPropagation();
      if(ev.key==='Enter'){ ev.preventDefault(); ctxMenuEl.querySelector('.ctx-grade.g4').click(); }
    });
  }
}

/* мышь: ЛКМ — выбор, двойной клик и ПКМ — меню */
document.addEventListener('click',e=>{
  const c=e.target.closest('.x-cell'); if(c) selectSheetCell(c);
});
document.addEventListener('dblclick',e=>{
  const c=e.target.closest('.x-cell'); if(!c)return;
  const r=c.getBoundingClientRect();
  sheetCellMenu(c,r.left+Math.min(r.width,40),r.top+4);
});
/* единый ПКМ-обработчик для всего портала подключён в блоке контекстных меню */
/* клавиатура журнала */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ hideCtx(); }
  const sel=document.querySelector('.x-cell.x-selected');
  if(!sel||modalEl||ctxMenuEl) return;
  const ae=document.activeElement?document.activeElement.tagName:'';
  if(/INPUT|TEXTAREA|SELECT|OPTION/.test(ae)) return;
  const d=sel.dataset;
  if(['1','2','3','4','5'].includes(e.key)){ e.preventDefault(); addSheetGrade(d.student,d.date,+e.key); return; }
  if(e.key==='Delete'||e.key==='Backspace'||e.key==='0'){ e.preventDefault();
    const gs=gradesAtCell(d.student,d.date);
    if(gs.length) delSheetGrade(gs[gs.length-1].id); return; }
  const rows=[...sel.closest('tbody').querySelectorAll('tr')];
  const ri=rows.indexOf(sel.parentElement);
  const cells=[...sel.parentElement.querySelectorAll('.x-cell')];
  const ci=cells.indexOf(sel);
  let target=null;
  if(e.key==='ArrowLeft') target=cells[ci-1];
  else if(e.key==='ArrowRight') target=cells[ci+1];
  else if(e.key==='ArrowUp'&&ri>0) target=rows[ri-1].querySelectorAll('.x-cell')[ci];
  else if(e.key==='ArrowDown'&&ri<rows.length-1) target=rows[ri+1].querySelectorAll('.x-cell')[ci];
  if(target){ e.preventDefault(); selectSheetCell(target); try{target.scrollIntoView({block:'nearest',inline:'nearest'});}catch(_){} target.focus(); }
});



/* ----- ДЗ ----- */
function dueBadge(iso){ const k=dayDiff(iso);
  if(k<0) return `<span class="badge b-red">Просрочено (${fmtShort(iso)})</span>`;
  if(k===0) return '<span class="badge b-amber">Сегодня сдать</span>';
  if(k===1) return '<span class="badge b-blue">Завтра</span>';
  return `<span class="badge b-gray">до ${fmtDate(iso)}</span>`;
}
function teacherHomework(){
  const u=S.user, myCids=teacherClassIds(u.id);
  const allClasses=schoolClasses(u.schoolId).slice().sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  const cid=(S.p.class&&allClasses.some(c=>c.id===S.p.class))?S.p.class:'';
  const list=db.homework.filter(h=>h.schoolId===u.schoolId&&(!cid||h.classId===cid)).sort((a,b)=>b.due.localeCompare(a.due));
  mount('Домашние задания',`
    <div class="toolbar">
      <div class="chips"><button type="button" class="chip ${!cid?'on':''}" data-act="hw-filter" data-id="">Все классы</button>
        ${allClasses.map(c=>`<button type="button" class="chip ${cid===c.id?'on':''} ${myCids.includes(c.id)?'':'chip-other'}" data-act="hw-filter" data-id="${c.id}" title="${myCids.includes(c.id)?'Ваш класс':'Класс других учителей'}">${esc(c.name)}${myCids.includes(c.id)?'':' <span class="chip-ext">●</span>'}</button>`).join('')}</div>
      <span class="sp"></span>
      <button type="button" class="btn btn-primary" ${allClasses.length?'':'disabled'} data-act="hw-add" ${cid?`data-class="${cid}"`:''}>${icon('plus')} Выдать ДЗ</button></div>
    ${allClasses.length?'':`<div class="alert alert-warn">${icon('cap')}<div>В школе пока нет классов. Зарегистрируйте класс в разделе «Мои классы».</div></div>`}
    <div class="lists">${list.map(h=>{ const c=classById(h.classId), total=classStudents(h.classId).length, done=hwDoneCount(h.id), pct=total?Math.round(done/total*100):0;
      const mine=h.teacherId===u.id;
      return `<div class="list-item ${mine?'':'list-other'}" ${mine?`data-ctx="hw" data-id="${h.id}" title="ПКМ — действия с заданием"`:''}><span class="stat-ico bg-director" style="align-self:flex-start">${icon('clipboard')}</span>
        <div class="li-main">
          <h4>${esc(h.title)} <span class="badge b-blue">${esc(c?c.name:'')}</span> <span class="badge b-gray">${esc(h.subject)}</span> ${dueBadge(h.due)}</h4>
          <div class="li-meta">${icon('clock','sm')} Выдано ${fmtDate(h.createdAt.slice(0,10))} · <b>${esc(h.teacherName||'')}</b>${mine?'':' (другой учитель)'}</div>
          <div class="li-desc">${esc(h.body)}</div>
          <div style="margin-top:8px;max-width:340px"><div class="progress"><i style="width:${pct}%"></i></div>
            <div style="font-size:12px;color:var(--slate-2);margin-top:4px">Выполнили: ${done} из ${total}</div></div>
        </div>
        <div class="li-side">${mine?`<button type="button" class="btn btn-xs btn-ghost" data-act="hw-del" data-id="${h.id}">${icon('trash','sm')}</button>`:'<span class="muted">не ваше ДЗ</span>'}</div></div>`;}).join('')}</div>
    ${list.length?'':emptyBlock('clipboard','Домашних заданий нет')}`);
}
Act['hw-filter']=d=>go('homework',{class:d.id});
Act['hw-add']=d=>{
  const allClasses=schoolClasses(S.user.schoolId).slice().sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  if(!allClasses.length) return toast('В школе пока нет классов','err');
  const subs=schoolWideSubjects(S.user.schoolId);
  const prefer=(d&&d.class)||S.p.class||teacherClassIds(S.user.id)[0]||allClasses[0].id;
  openModal({title:'Новое домашнее задание',body:`
    <form data-form="hw-save">
      ${subs.length?'':`<div class="alert alert-warn">${icon('info')}<div>Директор ещё не создал предметы в разделе «Предметы» — укажите существующий предмет или попросите добавить нужный.</div></div>`}
      <div class="field-row">
        <div class="field"><label>Класс *</label>
          <select class="input" name="classId" id="hw-class" required>${allClasses.map(c=>
            `<option value="${c.id}" ${c.id===prefer?'selected':''}>${esc(c.name)}${teacherClassIds(S.user.id).includes(c.id)?'':' (класс других учителей)'}</option>`).join('')}</select></div>
        <div class="field"><label>Предмет *</label>
          <select class="input" name="subject" id="hw-subject" required>${subs.map(s=>`<option>${esc(s)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Тема / задание *</label><input class="input" name="title" required placeholder="№ 142, 143"/></div>
      <div class="field"><label>Подробности</label><textarea class="input" name="body"></textarea></div>
      <div class="field"><label>Сдать до *</label><input class="input" type="date" name="due" required value="${dateISO(2)}"/></div>
      <div class="modal-foot" style="padding:0;border:none">
        <button type="button" class="btn" data-act="close-modal">Отмена</button>
        <button type="submit" class="btn btn-primary" ${subs.length?'':'disabled'}>${icon('send')} Выдать</button></div></form>`});
};
Fm['hw-save']=fd=>{
  db.homework.push({id:uid('h-'),schoolId:S.user.schoolId,classId:fd.get('classId'),subject:fd.get('subject'),
    teacherId:S.user.id,teacherName:S.user.name,title:fd.get('title').trim(),body:fd.get('body').trim(),
    due:fd.get('due'),createdAt:dtISO(0)});
  save(); closeModal(); renderView(); toast('Домашнее задание выдано');
};
Act['hw-del']=d=>{ if(confirm('Удалить задание? Отметки учеников сбросятся.')){
  db.homework=db.homework.filter(h=>h.id!==d.id); db.hwDone=db.hwDone.filter(x=>x.hwId!==d.id);
  save(); renderView(); toast('Задание удалено','info'); }};

/* ----- Ученики ----- */
function teacherStudents(){
  const u=S.user, myCids=teacherClassIds(u.id);
  const cid=S.p.class&&myCids.includes(S.p.class)?S.p.class:'';
  const students=myStudents(u.id).filter(s=>!cid||s.classId===cid);
  mount('Ученики',`
    <div class="toolbar">
      <div class="chips"><button type="button" class="chip ${!cid?'on':''}" data-act="st-filter" data-id="">Мои классы</button>
        ${myCids.map(id=>`<button type="button" class="chip ${cid===id?'on':''}" data-act="st-filter" data-id="${id}">${esc(classById(id).name)}</button>`).join('')}</div>
      <span class="sp"></span>
      <button type="button" class="btn btn-primary" ${myCids.length?'':'disabled'} data-act="student-add">${icon('plus')} Добавить учеников</button></div>
    ${myCids.length===0?`<div class="card">${emptyBlock('cap','Сначала зарегистрируйте класс','«Мои классы» → «Зарегистрировать класс и предмет».')}
      <div style="text-align:center;padding-bottom:30px"><button type="button" class="btn btn-primary" data-act="nav" data-page="myclasses">${icon('cap')} К регистрации класса</button></div></div>`:''}
    <div class="card"><div class="table-wrap">
    <table class="tbl"><thead><tr><th>Ученик</th><th>Класс</th><th>Логин</th><th>Пароль</th><th class="num">Средний балл</th><th class="num">Классниксы</th><th></th></tr></thead>
    <tbody>${students.map(s=>`
      <tr data-ctx="student" data-id="${s.id}" title="ПКМ — действия с учеником"><td><div class="cell-user">${avatar(s)}<b>${esc(s.name)}</b></div></td>
      <td><span class="badge b-blue">${esc(classById(s.classId)?classById(s.classId).name:'—')}</span></td>
      <td><span class="cred">${esc(s.login)}</span></td>
      <td><span style="display:inline-flex;gap:6px;align-items:center"><span class="cred" data-pass-for="${s.id}" data-secret="${esc(s.pass)}">••••••</span>
        <button type="button" class="icon-btn" style="width:28px;height:28px" data-act="reveal" data-target="${s.id}">${icon('eye','sm')}</button>
        <button type="button" class="icon-btn" style="width:28px;height:28px" data-act="copy" data-text="${esc(s.login)} / ${esc(s.pass)}" data-label="Данные ученика скопированы">${icon('clipboard','sm')}</button></span></td>
      <td class="num">${gradePill(avgOf(s.id))}</td><td class="num"><span class="coin">${balance(s.id)}</span></td>
      <td><div class="row-actions"><button type="button" class="btn btn-xs" data-act="coin-for" data-id="${s.id}">${icon('coins','sm')} Начислить</button>
        <button type="button" class="btn btn-xs btn-del" data-act="student-del" data-id="${s.id}" title="Удалить ученика">${icon('trash','sm')}</button></div></td>
      </tr>`).join('')}</tbody></table>
    ${students.length&&myCids.length?'':myCids.length?emptyBlock('cap','Учеников пока нет','Создайте первого ученика кнопкой выше.'):''}
    </div></div>`);
}
Act['st-filter']=d=>go('students',{class:d.id});
Act['student-add-for']=d=>{ go('students',{class:d.class}); studentAddModal(d.class); };
/* полное удаление ученика вместе со всеми его данными */
function canManageStudent(s){
  if(!s||s.role!=='student') return false;
  const u=S.user;
  if(!u||u.schoolId!==s.schoolId) return false;
  if(u.role==='director'||u.role==='admin') return true;
  return u.role==='teacher'&&teacherClassIds(u.id).includes(s.classId);
}
function deleteStudent(id){
  const s=userById(id); if(!s) return;
  const nGrades=db.grades.filter(g=>g.studentId===id).length;
  const nHw=db.hwDone.filter(h=>h.studentId===id).length;
  const nAtt=db.attempts.filter(a=>a.studentId===id).length;
  const nTx=db.transactions.filter(t=>t.studentId===id).length;
  const c=classById(s.classId);
  const details=[
    nGrades?`оценок и отметок: ${nGrades}`:'',
    nHw?`отметок о выполнении ДЗ: ${nHw}`:'',
    nAtt?`результатов карточек и олимпиад: ${nAtt}`:'',
    nTx?`операций с классниксами: ${nTx}`:'',
  ].filter(Boolean);
  const msg=`Удалить ученика «${s.name}»${c?' ('+c.name+')':''}?\n\nАккаунт с логином ${s.login} будет удалён без возможности восстановления.`+
    (details.length?`\nТакже будут удалены:\n— ${details.join(';\n— ')}.`:'');
  if(!confirm(msg)) return;
  db.users=db.users.filter(u=>u.id!==id);
  db.grades=db.grades.filter(g=>g.studentId!==id);
  db.hwDone=db.hwDone.filter(h=>h.studentId!==id);
  db.attempts=db.attempts.filter(a=>a.studentId!==id);
  db.transactions=db.transactions.filter(t=>t.studentId!==id);
  db.purchases=db.purchases.filter(p=>p.studentId!==id);
  save(); renderView(); toast(`Ученик «${s.name}» удалён`,'info');
}
Act['student-del']=d=>{ if(canManageStudent(userById(d.id))) deleteStudent(d.id); else toast('Нет прав на удаление этого ученика','err'); };
function studentAddModal(preferClass){
  const myCids=teacherClassIds(S.user.id);
  if(!myCids.length) return toast('Сначала зарегистрируйте класс','err');
  openModal({title:'Новые ученики',wide:true,body:`
    <form data-form="student-save">
      <div class="field-row">
        <div class="field" style="flex:2.2"><label>ФИО учеников *</label>
          <textarea class="input" name="names" rows="7" required placeholder="Иванов Иван, Петрова Мария&#10;Сидоров Артём, Кузнецова Анна"></textarea>
          <div class="field-hint">Несколько учеников — через запятую или каждый с новой строки. Логин будет сформирован из имени, пароли сгенерируются автоматически для каждого.</div></div>
        <div class="field" style="flex:1"><label>Класс *</label>
          <select class="input" name="classId">${myCids.map(id=>
            `<option value="${id}" ${id===preferClass?'selected':''}>${esc(classById(id).name)}</option>`).join('')}</select>
          <div class="field-hint">Повторные ФИО и ученики, уже зачисленные в этот класс, будут пропущены.</div></div>
      </div>
      <div class="modal-foot" style="padding:0;border:none">
        <button type="button" class="btn" data-act="close-modal">Отмена</button>
        <button type="submit" class="btn btn-primary">${icon('check')} Создать и получить данные</button></div></form>`});
}
Act['student-add']=()=>studentAddModal(S.p.class);
function bulkCredentialsModal(created,skipped,className){
  const lines=created.map(s=>`${s.name} — логин: ${s.login}, пароль: ${s.pass}`).join('\n');
  openModal({title:`Создано учеников: ${created.length}`,wide:true,body:`
    <div class="alert alert-ok" style="margin-top:0">${icon('check')}<div>Ученики зачислены${className?` в класс <b>${esc(className)}</b>`:''}. Передайте логин и пароль каждому ученику лично — позже данные всегда можно посмотреть в разделе «Ученики».</div></div>
    ${skipped.length?`<div class="alert alert-warn">${icon('info')}<div>Пропущены повторные ФИО: <b>${skipped.map(esc).join(', ')}</b></div></div>`:''}
    <div class="cred-bulk-actions"><button type="button" class="btn btn-sm" data-act="copy" data-text="${esc(lines)}" data-label="Список с логинами и паролями скопирован">${icon('clipboard','sm')} Скопировать весь список</button></div>
    <div class="card"><div class="table-wrap"><table class="tbl">
      <thead><tr><th class="num">№</th><th>Ученик</th><th>Логин</th><th>Пароль</th><th></th></tr></thead>
      <tbody>${created.map((s,i)=>`<tr>
        <td class="num">${i+1}</td><td><b>${esc(s.name)}</b></td>
        <td><span class="cred">${esc(s.login)}</span></td>
        <td><span class="cred">${esc(s.pass)}</span></td>
        <td><button type="button" class="btn btn-xs" data-act="copy" data-text="${esc(s.login)} / ${esc(s.pass)}" data-label="Данные ученика скопированы">${icon('clipboard','sm')}</button></td>
      </tr>`).join('')}</tbody></table></div></div>
    <div class="modal-foot">
      <button type="button" class="btn" data-act="close-modal">Готово</button>
      <button type="button" class="btn btn-primary" data-act="student-add">${icon('plus')} Добавить ещё учеников</button></div>`});
}
Fm['student-save']=fd=>{
  const classId=fd.get('classId');
  if(!teacherClassIds(S.user.id).includes(classId)) return toast('Класс недоступен','err');
  const wanted=parseNameList(fd.get('names')).map(normName);
  if(!wanted.length) return toast('Введите ФИО хотя бы одного ученика','err');
  const inClass=new Set(classStudents(classId).map(s=>s.name.toLowerCase()));
  const created=[], skipped=[], seen=new Set();
  wanted.forEach(name=>{
    const key=name.toLowerCase();
    if(inClass.has(key)||seen.has(key)){ if(!skipped.some(n=>n.toLowerCase()===key)) skipped.push(name); return; }
    seen.add(key);
    const s={id:uid('u-'),login:studentLoginFromName(name),pass:genPass(),role:'student',name,classId,schoolId:S.user.schoolId};
    db.users.push(s); created.push(s); // push сразу — чтобы следующий логин не повторился
  });
  if(!created.length){ toast('Все указанные ученики уже есть в этом классе','err'); return; }
  save(); closeModal(); renderView();
  if(created.length===1) credentialsModal({title:'Ученик создан',name:created[0].name,login:created[0].login,pass:created[0].pass,role:'student',againAct:'student-add',againLabel:'Добавить ещё учеников'});
  else bulkCredentialsModal(created,skipped,classById(classId)?classById(classId).name:'');
};

/* ----- Классниксы ----- */
function coinStudentOptions(preferId){
  let html='';
  teacherClassIds(S.user.id).forEach(cid=>{ const st=classStudents(cid);
    if(st.length) html+=`<optgroup label="${esc(classById(cid).name)}">${st.map(s=>
      `<option value="${s.id}" ${s.id===preferId?'selected':''}>${esc(s.name)} — баланс ${balance(s.id)} Кс</option>`).join('')}</optgroup>`; });
  return html||'<option value="">Нет учеников</option>';
}
function teacherCoins(){
  const u=S.user, myCids=teacherClassIds(u.id);
  const ids=new Set(myStudents(u.id).map(s=>s.id));
  const txs=db.transactions.filter(t=>ids.has(t.studentId)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,40);
  mount('Классниксы',`
    <div class="alert alert-warn">${icon('coins')}<div><b>Классниксы</b> — школьная валюта. Начисляйте за успехи и активность, списывайте за нарушения. Потратить монеты ученики могут в «Магазине наград».</div></div>
    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>${icon('plus')} Начислить / списать</h3></div><div class="card-body">
        <form data-form="coin-save">
          <div class="field"><label>Ученик *</label><select class="input" name="studentId" required>${coinStudentOptions(S.p.student)}</select></div>
          <div class="field"><label>Операция</label>
            <div class="seg">
              <button type="button" class="on" id="seg-plus" data-act="coin-op" data-op="plus">➕ Начислить</button>
              <button type="button" id="seg-minus" data-act="coin-op" data-op="minus">➖ Списать</button>
            </div><input type="hidden" name="op" id="coin-op-input" value="plus"/></div>
          <div class="field"><label>Сумма, Классниксы *</label><input class="input" type="number" min="1" step="1" value="10" name="amount" required/></div>
          <div class="field"><label>Причина *</label><input class="input" name="reason" required placeholder="Например: отличный ответ у доски"/></div>
          <button type="submit" class="btn btn-primary" style="width:100%">${icon('check')} Провести операцию</button>
        </form></div></div>
      <div class="card"><div class="card-head"><h3>${icon('users')} Балансы классов</h3></div><div class="card-body">
        <div class="lists">${myCids.map(cid=>{ const st=classStudents(cid);
          return `<div><b style="display:block;margin-bottom:6px">${esc(classById(cid).name)}</b>
            ${st.map(s=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #f1f5f9"><span>${esc(s.name)}</span><span class="coin">${balance(s.id)}</span></div>`).join('')||'<div style="color:var(--slate-2);font-size:13px">Нет учеников</div>'}</div>`;}).join('')}</div>
      </div></div>
    </div>
    <h2 class="section-title">${icon('clock')} История операций</h2>
    <div class="card"><div class="table-wrap">
    <table class="tbl"><thead><tr><th>Дата</th><th>Ученик</th><th class="num">Сумма</th><th>Причина</th><th>Кто провёл</th></tr></thead>
    <tbody>${txs.map(t=>{const s=userById(t.studentId);
      return `<tr><td style="white-space:nowrap">${fmtShort(t.createdAt.slice(0,10))}</td><td>${s?esc(s.name):'—'}</td>
      <td class="num ${t.amount>0?'tx-plus':'tx-minus'}">${t.amount>0?'+':''}${t.amount} Кс</td>
      <td>${esc(t.reason)}</td><td style="color:var(--slate-2);font-size:12.5px">${esc(t.teacherName||'—')}</td></tr>`;}).join('')}</tbody></table>
    ${txs.length?'':emptyBlock('coins','Операций ещё не было')}</div></div>`);
}
Act['coin-op']=d=>{ $('#coin-op-input').value=d.op;
  $('#seg-plus').classList.toggle('on',d.op==='plus'); $('#seg-minus').classList.toggle('on',d.op==='minus'); };
Act['coin-for']=d=>{ go('coins',{student:d.id});
  setTimeout(()=>{ const sel=document.querySelector('form[data-form="coin-save"] select[name="studentId"]'); if(sel) sel.value=d.id; },0); };
Fm['coin-save']=fd=>{
  const sid=fd.get('studentId'); if(!sid) return toast('Выберите ученика','err');
  const s=userById(sid);
  let amount=Math.abs(parseInt(fd.get('amount'),10)||0);
  if(!amount) return toast('Укажите сумму больше нуля','err');
  const reason=fd.get('reason').trim(); if(!reason) return toast('Укажите причину','err');
  if(fd.get('op')==='minus'){
    if(balance(sid)<amount) return toast(`У ${s.name} только ${balance(sid)} Кс — баланс нельзя увести в минус`,'err');
    amount=-amount;
  }
  db.transactions.push({id:uid('x-'),studentId:sid,schoolId:S.user.schoolId,amount,reason,
    teacherId:S.user.id,teacherName:S.user.name.replace(/(\S+)\s(\S)\S*\s(\S)\S*/,'$1 $2. $3.'),createdAt:dtISO(0)});
  save(); renderView();
  toast(amount>0?`Начислено ${amount} Кс для ${s.name}`:`Списано ${-amount} Кс у ${s.name}`,amount>0?'ok':'err');
};

function teacherSchedule(){
  const classes=schoolClasses(S.user.schoolId).slice().sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  if(!classes.length) return mount('Расписание',
    `<div class="card">${emptyBlock('calendar','В школе пока нет классов','Зарегистрируйте класс и предмет в разделе «Мои классы», затем составьте расписание.')}</div>
     <div style="text-align:center;margin-top:14px"><button type="button" class="btn btn-primary" data-act="nav" data-page="myclasses">${icon('cap')} К регистрации класса</button></div></div>`);
  renderSchedulePage(classes,S.p.class,true);
}


/* =====================================================================
   УЧЕНИК
===================================================================== */
function pageStudent(){
  if(S.page==='grades') return studentGradesPage();
  if(S.page==='homework') return studentHomework();
  if(S.page==='cards') return studentCards();
  if(S.page==='news') return newsPage(true);
  if(S.page==='schedule') return studentSchedule();
  if(S.page==='shop') return studentShop();
  return studentDashboard();
}
function studentDashboard(){
  const u=S.user, c=classById(u.classId);
  const bal=balance(u.id), a=avgOf(u.id);
  const myHw=db.homework.filter(h=>h.classId===u.classId&&!hwIsDone(h.id,u.id)&&dayDiff(h.due)>=0).sort((x,y)=>x.due.localeCompare(y.due));
  const dow=new Date().getDay()-1;
  const todayLessons=c?db.schedule.filter(l=>l.classId===c.id&&l.day===dow).sort((x,y)=>x.period-y.period):[];
  const latestNews=db.news.filter(n=>n.schoolId===u.schoolId).slice(-2).reverse();
  mount('Обзор',`
    <div class="welcome" style="background:linear-gradient(120deg,#b45309,#f59e0b)">
      <div><h2>Привет, ${esc(u.name.split(' ')[1]||u.name)}! 👋</h2>
      <p>${esc(schoolById(u.schoolId).name)}${c?' · '+esc(c.name):''}</p></div>
      <div class="w-coins"><b>${bal}</b><span>Классниксов на счету</span></div>
    </div>
    <div class="grid cols-4" style="margin-top:16px">
      ${statCard('book','teacher',a==null?'—':a.toFixed(2).replace('.',','),'средний балл')}
      ${statCard('clipboard','student',myHw.length,'ждут выполнения')}
      ${statCard('calendar','director',todayLessons.length,'уроков сегодня')}
      ${statCard('gift','student',db.purchases.filter(p=>p.studentId===u.id).length,'куплено наград')}
    </div>
    <div class="grid cols-2" style="margin-top:16px">
      <div class="card"><div class="card-head"><h3>${icon('clipboard')} Ближайшие задания</h3></div><div class="card-body">
        ${myHw.length?`<div class="lists">${myHw.slice(0,3).map(hwMini).join('')}</div>`:emptyBlock('check','Всё выполнено! 🎉')}</div></div>
      <div class="card"><div class="card-head"><h3>${icon('calendar')} Сегодня в школе</h3></div><div class="card-body">
        ${todayLessons.length?scheduleList(todayLessons):emptyBlock('calendar','Сегодня выходной 🎈')}</div></div>
    </div>
    <h2 class="section-title">${icon('megaphone')} Новости</h2>
    <div class="lists">${latestNews.map(n=>`<div class="list-item news-item"><div class="news-bar"></div>
      <div class="li-main"><h4>${esc(n.title)}</h4><div class="li-meta">${fmtDateTime(n.createdAt)} · ${esc(n.authorName)}</div>
      <div class="li-desc">${esc(n.body)}</div></div></div>`).join('')}</div>`);
}
function hwMini(h){ return `<div class="list-item" style="box-shadow:none;padding:8px 4px;border-color:#f1f5f9">
  <span class="stat-ico bg-director">${icon('clipboard')}</span>
  <div class="li-main"><b>${esc(h.title)}</b><div class="li-meta" style="margin:0">${esc(h.subject)} · ${dueBadge(h.due)}</div></div></div>`; }

function studentGradesPage(){
  const u=S.user, grades=studentGrades(u.id);
  const subjects=[...new Set(grades.map(g=>g.subject))];
  const marks=grades.filter(g=>g.kind==='mark');
  const counts={}; marks.forEach(g=>counts[g.mark]=(counts[g.mark]||0)+1);
  mount('Мои оценки',`
    <div class="toolbar"><span class="sp"></span><span>Средний балл по всем предметам: ${gradePill(avgOf(u.id))}</span></div>
    ${marks.length?`<div class="marks-summary card"><div class="card-body" style="display:flex;gap:18px;flex-wrap:wrap;align-items:center">
      <b>${icon('clipboard','sm')} Сводка отметок:</b>
      ${MARKS.filter(m=>counts[m.code]).map(m=>`<span class="ms-item"><span class="xm ${m.cls}">${m.code}</span> ${counts[m.code]} — ${esc(m.name)}</span>`).join('')}
    </div></div>`:''}
    <div class="subj-grades">${subjects.map(sub=>{ const gs=grades.filter(g=>g.subject===sub).sort((a,b)=>a.date.localeCompare(b.date));
      return `<div class="subj-line"><div class="s-name">${icon('book','sm')} ${esc(sub)}</div>
        <div class="g-chips">${gs.map(g=>g.kind==='mark'
          ?`<span class="g-chip xm ${MARK_BY_CODE[g.mark]?MARK_BY_CODE[g.mark].cls:''}" title="${fmtDate(g.date)} · ${esc(markName(g.mark))}${g.label?' · '+esc(g.label):''}">${g.mark}<small>${fmtShort(g.date)}</small></span>`
          :`<span class="g-chip grade-${g.value}" title="${fmtDate(g.date)}${g.label?' · '+esc(g.label):''}">${g.value}${g.label?'<i class="xg-dot"></i>':''}<small>${fmtShort(g.date)}</small></span>`).join('')}</div>
        <div>${gradePill(avg(gs.filter(isNumericGrade).map(g=>g.value)))}</div></div>`;}).join('')}</div>
    ${grades.length?'':emptyBlock('book','Оценок пока нет','Они появятся, когда учитель заполнит журнал.')}
    <div class="card"><div class="card-body marks-legend">
      ${MARKS.map(m=>`<span class="lg-item"><span class="xm ${m.cls}">${m.code}</span><span class="muted">${esc(m.name)}</span></span>`).join('')}
    </div></div>`);
}
function studentHomework(){
  const u=S.user;
  const list=db.homework.filter(h=>h.classId===u.classId).sort((a,b)=>{
    const da=hwIsDone(a.id,u.id)?1:0, db2=hwIsDone(b.id,u.id)?1:0;
    if(da!==db2) return da-db2; return a.due.localeCompare(b.due); });
  mount('Домашние задания',`
    <div class="lists">${list.map(h=>{ const done=hwIsDone(h.id,u.id);
      return `<div class="list-item ${done?'done-text':''}">
        <button type="button" class="hw-check ${done?'done':''}" data-act="hw-toggle" data-id="${h.id}">${done?icon('check','sm'):''}</button>
        <div class="li-main">
          <h4>${esc(h.title)} <span class="badge b-gray">${esc(h.subject)}</span> ${done?'<span class="badge b-green">Выполнено</span>':dueBadge(h.due)}</h4>
          <div class="li-meta">${icon('clipboard','sm')} Задал: ${esc(h.teacherName)} · выдано ${fmtShort(h.createdAt.slice(0,10))}</div>
          <div class="li-desc">${esc(h.body)}</div></div></div>`;}).join('')}</div>
    ${list.length?'':emptyBlock('clipboard','Заданий нет','Можно отдыхать!')}`);
}
Act['hw-toggle']=d=>{
  const hid=d.id, sid=S.user.id, i=db.hwDone.findIndex(x=>x.hwId===hid&&x.studentId===sid);
  if(i>=0) db.hwDone.splice(i,1); else db.hwDone.push({hwId:hid,studentId:sid,at:dtISO(0)});
  save(); renderView();
};
function studentSchedule(){
  const c=classById(S.user.classId);
  if(!c) return mount('Расписание',`<div class="card">${emptyBlock('calendar','Расписание пока не составлено')}</div>`);
  mount('Моё расписание — '+c.name,scheduleGrid(c.id,false));
}
function studentShop(){
  const u=S.user, bal=balance(u.id);
  const rewards=db.rewards.filter(r=>r.schoolId===u.schoolId);
  const mine=db.purchases.filter(p=>p.studentId===u.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  mount('Магазин наград',`
    <div class="welcome" style="background:linear-gradient(120deg,#92400e,#d97706)">
      <div><h2>${icon('gift')} Магазин наград</h2><p>Зарабатывай Классниксы за учёбу и обменивай их на награды</p></div>
      <div class="w-coins"><b>${bal}</b><span>Классниксов доступно</span></div></div>
    <div class="reward-grid" style="margin-top:16px">${rewards.map(r=>{ const afford=bal>=r.cost;
      return `<div class="reward"><div class="r-ic">🎁</div><h4>${esc(r.title)}</h4><p>${esc(r.desc||'')}</p>
        <div class="r-cost">${r.cost}</div>
        <button type="button" class="btn ${afford?'btn-primary':''}" ${afford?'':'disabled'} data-act="buy" data-id="${r.id}">
          ${afford?icon('gift')+' Обменять':'Не хватает монет'}</button></div>`;}).join('')}</div>
    ${rewards.length?'':emptyBlock('gift','Каталог наград пуст','Скоро директор его наполнит.')}
    <h2 class="section-title">${icon('trophy')} Мои награды (${mine.length})</h2>
    ${mine.length?`<div class="card"><div class="table-wrap"><table class="tbl">
      <thead><tr><th>Дата покупки</th><th>Награда</th><th class="num">Стоимость</th><th>Код для учителя</th></tr></thead>
      <tbody>${mine.map(p=>`<tr><td style="white-space:nowrap">${fmtDate(p.createdAt.slice(0,10))}</td><td><b>${esc(p.title)}</b></td>
      <td class="num coin">${p.cost}</td><td><span class="code-box">${esc(p.code)}</span></td></tr>`).join('')}</tbody></table></div></div>`
      :`<div class="card">${emptyBlock('trophy','Пока ничего не куплено')}</div>`}`);
}
Act.buy=d=>{
  const r=db.rewards.find(x=>x.id===d.id);
  if(!r)return;
  if(balance(S.user.id)<r.cost) return toast('Не хватает Классниксов','err');
  openModal({title:'Подтверждение покупки',body:`
    <div class="alert alert-warn">${icon('gift')}<div>Вы обмениваете <b>${r.cost} Кс</b> на награду «<b>${esc(r.title)}</b>».</div></div>
    <p style="color:var(--slate-2);font-size:13.5px">${esc(r.desc||'')}<br/><br/>После покупки появится код — покажите его учителю или директору.</p>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
      <button type="button" class="btn" data-act="close-modal">Отмена</button>
      <button type="button" class="btn btn-primary" data-act="buy-confirm" data-id="${r.id}">${icon('check')} Подтвердить</button></div>`});
};
Act['buy-confirm']=d=>{
  const r=db.rewards.find(x=>x.id===d.id), u=S.user;
  if(balance(u.id)<r.cost) return toast('Не хватает Классниксов','err');
  const code='КН-'+rand(3).toUpperCase()+Math.floor(100+Math.random()*900);
  db.purchases.push({id:uid('p-'),studentId:u.id,rewardId:r.id,title:r.title,cost:r.cost,code,createdAt:dtISO(0)});
  db.transactions.push({id:uid('x-'),studentId:u.id,schoolId:u.schoolId,amount:-r.cost,
    reason:'Покупка: '+r.title,teacherId:null,teacherName:'Магазин наград',createdAt:dtISO(0)});
  save(); closeModal(); renderView(); toast(`Покупка успешна! Код: ${code}`);
};


/* =====================================================================
   КАРТОЧКИ-ЗАДАНИЯ · ОБЩИЕ ЗАДАНИЯ · ОЛИМПИАДЫ
   db.cards:   {id,kind:'card'|'olympiad',scope:'teacher'|'common',
                schoolId,teacherId,teacherName,title,subject,
                stage (число, этап олимпиады|null),timeLimit (минуты,0=без таймера),
                questions:[{id,text,answers:[{id,text,correct}]}],createdAt}
   db.assigns: {id,cardId,classId,schoolId,teacherId,createdAt}
   db.attempts:{id,cardId,studentId,startedAt,finishedAt,status:'progress'|'done',
                answers:{qid:aid},score,total}
===================================================================== */
const cardById=id=>byId(db.cards,id);
const assignedClassIds=card=>db.assigns.filter(a=>a.cardId===card.id).map(a=>a.classId);
const attemptsFor=(cardId,sid)=>db.attempts.filter(a=>a.cardId===cardId&&a.studentId===sid);
function bestAttempt(cardId,sid){
  const done=attemptsFor(cardId,sid).filter(a=>a.status==='done');
  return done.sort((a,b)=>(b.score/Math.max(1,b.total))-(a.score/Math.max(1,a.total))||b.finishedAt.localeCompare(a.finishedAt))[0]||null;
}
function progressAttempt(cardId,sid){ return attemptsFor(cardId,sid).find(a=>a.status==='progress')||null; }
function gradeCard(card,a){
  a.total=card.questions.length;
  a.score=card.questions.reduce((s,q)=>{ const correct=q.answers.find(x=>x.correct);
    return s+(correct&&a.answers[q.id]===correct.id?1:0); },0);
  a.pct=a.total?Math.round(a.score/a.total*100):0;
}
function sweepAttempts(){ let changed=false;
  const now=Date.now();
  for(const a of db.attempts){ if(a.status!=='progress')continue;
    const c=cardById(a.cardId);
    if(!c){ a.status='done'; a.finishedAt=a.finishedAt||dtISO(0); changed=true; continue; }
    if(c.timeLimit>0){ const end=new Date(a.startedAt).getTime()+c.timeLimit*60000;
      if(now>=end){ if(!a.total){gradeCard(c,a);} a.status='done'; a.finishedAt=new Date(end).toISOString(); changed=true; } }
  }
  if(changed){ try{save();}catch(e){} }
}
function resultTone(pct){ return pct>=85?'b-green':pct>=60?'b-blue':pct>=40?'b-amber':'b-red'; }
function pctPill(pct){ return `<span class="badge ${resultTone(pct)}">${pct}%</span>`; }

/* ---------------- Конструктор карточки/олимпиады ---------------- */
function allSubjects(){
  const set=new Set();
  (db.subjects||[]).forEach(s=>set.add(s.name));
  db.teachings.forEach(t=>set.add(t.subject));
  db.cards.forEach(c=>c.subject&&set.add(c.subject));
  return [...set].sort((a,b)=>a.localeCompare(b,'ru'));
}
function cardEditor(opts){
  const isOlymp=opts.kind==='olympiad';
  const ex=opts.id?cardById(opts.id):null;
  const subjects=opts.scope==='teacher'
    ?schoolWideSubjects(S.user.schoolId)
    :allSubjects();
  const titles=[...new Set(db.cards
    .filter(c=>opts.scope==='teacher'?c.teacherId===S.user.id:c.scope===opts.scope&&c.kind===opts.kind)
    .map(c=>c.title))];
  openModal({title:ex?'Изменить задание':(isOlymp?'Новая олимпиада':'Новая карточка с заданиями'),wide:true,body:`
    <form id="card-editor-form" autocomplete="off">
      <div class="field-row">
        <div class="field" style="flex:2"><label>Название *</label>
          <input class="input" name="title" list="card-title-list" required maxlength="120" placeholder="Например, Задание 1" value="${ex?esc(ex.title):''}">
          <datalist id="card-title-list">${titles.map(t=>`<option value="${esc(t)}">`).join('')}</datalist></div>
        <div class="field" style="flex:1.4"><label>Предмет *</label>
          ${opts.scope==='teacher'&&subjects.length
            ? `<select class="input" name="subject" required>${subjects.map(s=>`<option ${ex&&ex.subject===s?'selected':''}>${esc(s)}</option>`).join('')}</select>`
            : `<input class="input" name="subject" list="card-subj-list" required maxlength="60" placeholder="Например, Математика" value="${ex?esc(ex.subject):''}">
               <datalist id="card-subj-list">${allSubjects().map(s=>`<option value="${esc(s)}">`).join('')}</datalist>`}</div>
      </div>
      ${isOlymp?`<div class="field-row">
        <div class="field"><label>Этап олимпиады *</label>
          <input class="input" name="stage" type="number" min="1" max="20" step="1" required value="${ex&&ex.stage?ex.stage:1}"></div>
        <div class="field"><label>Время на выполнение со старта, минут *</label>
          <input class="input" name="timeLimit" type="number" min="1" max="240" step="1" required value="${ex&&ex.timeLimit?ex.timeLimit:30}"></div>
      </div>
      <div class="alert alert-warn" style="margin-top:0">${icon('timer')}<div>Таймер идёт со старта и <b>не останавливается</b>, если закрыть окно. По истечении времени ответы сохраняются автоматически. Пройти олимпиаду можно один раз.</div></div>`
      :`<div class="alert alert-info" style="margin-top:0">${icon('layers')}<div>Карточка — это набор вопросов с одним правильным ответом в каждом (как в Учи.ру). Ученик проходит карточку и сразу видит результат. Карточку можно перепроходить.</div></div>`}
      <div id="cq-list" class="cq-list"></div>
      <button type="button" class="btn" id="cq-add" style="width:100%;justify-content:center;margin-top:10px">${icon('plus','sm')} Добавить вопрос</button>
      <div class="modal-foot" style="padding:14px 0 0;border:none">
        <button type="button" class="btn" data-act="close-modal">Отмена</button>
        <button type="submit" class="btn btn-primary">${icon('check')} ${ex?'Сохранить':'Создать карточку'}</button>
      </div>
    </form>`});
  const list=modalEl.querySelector('#cq-list');
  function relabel(){ [...list.children].forEach((b,i)=>{ const t=b.querySelector('.cq-n'); if(t)t.textContent='Вопрос '+(i+1); }); }
  function answerRow(a,qid){
    const row=document.createElement('div'); row.className='cq-a';
    row.innerHTML=`<label class="cq-radio"><input type="radio" name="correct-${qid}" ${a&&a.correct?'checked':''} title="Отметить правильный ответ"></label>
      <input class="input cq-a-text" maxlength="200" placeholder="Вариант ответа" value="${a?esc(a.text):''}">
      <button type="button" class="icon-btn cq-a-del" title="Удалить ответ">${icon('trash','sm')}</button>`;
    return row;
  }
  function questionBlock(q){
    const qid=q?q.id:uid('q-');
    const b=document.createElement('div'); b.className='cq-q';
    b.dataset.qid=qid;
    b.innerHTML=`<div class="cq-q-head"><b class="cq-n"></b><span class="sp"></span>
        <button type="button" class="btn btn-xs btn-ghost cq-q-del">${icon('trash','sm')} Удалить вопрос</button></div>
      <input class="input cq-q-text" maxlength="300" placeholder="Текст вопроса" value="${q?esc(q.text):''}">
      <div class="cq-a-list"></div>
      <button type="button" class="btn btn-sm cq-a-add">${icon('plus','sm')} Добавить ответ</button>`;
    const al=b.querySelector('.cq-a-list');
    (q&&q.answers?q.answers:[null,null]).forEach(a=>al.appendChild(answerRow(a,qid)));
    b.querySelector('.cq-a-add').addEventListener('click',()=>{
      if(al.children.length>=6) return toast('Максимум 6 вариантов','info');
      al.appendChild(answerRow(null,qid));
    });
    al.addEventListener('click',e=>{ if(e.target.closest('.cq-a-del')){
      if(al.children.length<=2) return toast('Нужно минимум два варианта ответа','err');
      e.target.closest('.cq-a').remove();
    }});
    b.querySelector('.cq-q-del').addEventListener('click',()=>{
      if(list.children.length<=1) return toast('Должен остаться хотя бы один вопрос','err');
      b.remove(); relabel();
    });
    return b;
  }
  (ex&&ex.questions.length?ex.questions:[null]).forEach(q=>list.appendChild(questionBlock(q)));
  modalEl.querySelector('#cq-add').addEventListener('click',()=>{ list.appendChild(questionBlock(null)); relabel(); });
  relabel();
  modalEl.querySelector('#card-editor-form').addEventListener('submit',e=>{
    e.preventDefault();
    const f=e.target, title=f.title.value.trim(), subject=f.subject.value.trim();
    if(!title) return toast('Введите название','err');
    if(!subject) return toast('Укажите предмет','err');
    const questions=[];
    for(const b of list.children){
      const text=b.querySelector('.cq-q-text').value.trim();
      if(!text) return toast('Заполните текст каждого вопроса (или удалите пустой)','err');
      const rows=[...b.querySelectorAll('.cq-a')], answers=[]; let correctId=null;
      for(const r of rows){
        const t=r.querySelector('.cq-a-text').value.trim();
        if(!t){ return toast('Заполните все варианты ответов (или удалите пустые)','err'); }
        const id=uid('o-');
        const isCorrect=r.querySelector('input[type=radio]').checked;
        if(isCorrect) correctId=id;
        answers.push({id,text:t,correct:isCorrect});
      }
      if(answers.length<2) return toast('В вопросе «'+text+'» нужно минимум два варианта','err');
      if(!correctId) return toast('Отметьте правильный ответ в вопросе «'+text+'»','err');
      questions.push({id:b.dataset.qid,text,answers});
    }
    let stage=null,timeLimit=0;
    if(isOlymp){
      stage=parseInt(f.stage.value,10); timeLimit=parseInt(f.timeLimit.value,10);
      if(!(stage>0)) return toast('Этап олимпиады — положительное число','err');
      if(!(timeLimit>0)) return toast('Укажите время на выполнение в минутах','err');
    }
    if(ex){
      Object.assign(ex,{title,subject,stage,timeLimit,questions});
      toast('Карточка обновлена');
    }else{
      const card={id:uid('c-'),kind:opts.kind,scope:opts.scope,
        schoolId:opts.scope==='teacher'?S.user.schoolId:null,
        teacherId:opts.scope==='teacher'?S.user.id:null,
        teacherName:opts.scope==='teacher'?S.user.name:null,
        title,subject,stage,timeLimit,questions,createdAt:dtISO(0)};
      db.cards.push(card);
      if(opts.scope==='teacher'){
        ensureSubjects(S.user.schoolId,[subject]);
        save(); closeModal(); renderView();
        toast('Карточка создана — назначьте её классам'); assignModal(card.id); return; }
    }
    save(); closeModal(); renderView(); toast(isOlymp?'Олимпиада опубликована':'Общее задание опубликовано','ok');
  });
}

/* ---------------- Назначение карточки классам (учитель) ---------------- */
function assignModal(cardId){
  const card=cardById(cardId); if(!card)return;
  const myCids=teacherClassIds(S.user.id);
  const classes=schoolClasses(S.user.schoolId).slice().sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  const cur=new Set(assignedClassIds(card));
  openModal({title:`Назначение · ${card.title}`,body:`
    <div class="alert alert-info" style="margin-top:0">${icon('layers')}<div>Отметьте классы, которым доступна карточка. Можно назначить любому существующему классу школы. Они увидят её в разделе «Карточки → Задания от учителей».</div></div>
    <form id="assign-form">
      <div class="check-grid">${classes.map(c=>`<label class="check-pill ${myCids.includes(c.id)?'':'check-other'}"><input type="checkbox" value="${c.id}" ${cur.has(c.id)?'checked':''}>
        <span>${esc(c.name)}${myCids.includes(c.id)?'':' <span class="chip-ext">●</span>'}</span><span class="check-meta">${classStudents(c.id).length} уч.</span></label>`).join('')}</div>
      ${classes.length?'':`<div class="alert alert-warn">${icon('cap')}<div>В школе пока нет классов.</div></div>`}
      <div class="modal-foot" style="padding:14px 0 0;border:none">
        <button type="button" class="btn" data-act="close-modal">Отмена</button>
        <button type="submit" class="btn btn-primary" ${classes.length?'':'disabled'}>${icon('check')} Сохранить назначение</button>
      </div></form>`});
  modalEl.querySelector('#assign-form').addEventListener('submit',e=>{
    e.preventDefault();
    const picked=new Set([...modalEl.querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value));
    db.assigns=db.assigns.filter(a=>!(a.cardId===cardId));
    picked.forEach(cid=>db.assigns.push({id:uid('as-'),cardId,classId:cid,schoolId:S.user.schoolId,teacherId:S.user.id,createdAt:dtISO(0)}));
    save(); closeModal(); renderView();
    toast(picked.size?`Назначено классам: ${picked.size}`:'Назначение снято','ok');
  });
}

/* ---------------- Плитка карточки ---------------- */
function cardTile(c,opts={}){
  const tag=c.kind==='olympiad'
    ?`<span class="tag tag-olymp">${icon('flag','sm')} Олимпиада · этап ${c.stage||1} · ${c.timeLimit} мин</span>`
    :`<span class="tag tag-card">${icon('layers','sm')} Карточка · ${c.questions.length} ${plural(c.questions.length,['вопрос','вопроса','вопросов'])}</span>`;
  const meta=[];
  if(c.subject) meta.push(esc(c.subject));
  if(opts.teacher&&c.teacherName) meta.push(esc(c.teacherName));
  let ctx='';
  if(opts.ctx) ctx=` data-ctx="card" data-id="${c.id}"`;
  let corner='', side='';
  if(opts.teacher){
    const cls=assignedClassIds(c);
    corner=`<div class="task-corner">
        <button type="button" class="icon-btn" title="Изменить" data-act="tc-edit" data-id="${c.id}">${icon('pencil','sm')}</button>
        <button type="button" class="icon-btn" title="Удалить" data-act="tc-del" data-id="${c.id}">${icon('trash','sm')}</button></div>`;
    side=`<div class="task-assigned">${cls.length?cls.map(id=>`<span class="chip" style="cursor:default">${esc(classById(id).name)}</span>`).join(''):'<span class="muted">не назначена классам</span>'}</div>
      <div class="task-actions">
        <button type="button" class="btn btn-sm btn-primary" data-act="tc-assign" data-id="${c.id}">${icon('users','sm')} Классы</button>
        <button type="button" class="btn btn-sm" data-act="tc-results" data-id="${c.id}">${icon('chart','sm')} Результаты</button>
      </div>`;
  }else if(opts.admin){
    const n=db.attempts.filter(a=>a.cardId===c.id&&a.status==='done').length;
    corner=`<div class="task-corner">
        <button type="button" class="icon-btn" title="Изменить" data-act="at-edit" data-id="${c.id}">${icon('pencil','sm')}</button>
        <button type="button" class="icon-btn" title="Удалить" data-act="at-del" data-id="${c.id}">${icon('trash','sm')}</button></div>`;
    side=`<div class="task-actions">
        <button type="button" class="btn btn-sm" data-act="at-results" data-id="${c.id}">${icon('chart','sm')} Результаты учеников${n?` (${n})`:''}</button>
      </div>`;
  }else{
    side=studentCardSide(c);
  }
  return `<div class="task-card"${ctx}>
    ${corner}
    <div class="task-top">
      <span class="task-ic ${c.kind==='olympiad'?'ic-olymp':'ic-card'}">${c.kind==='olympiad'?icon('flag'):icon('layers')}</span>
      <div class="task-info"><h4>${esc(c.title)}</h4><div class="task-meta">${meta.join(' · ')}</div>${tag}</div>
    </div>
    ${side}</div>`;
}
function studentCardSide(c){
  sweepAttempts();
  const u=S.user, prog=progressAttempt(c.id,u.id), best=bestAttempt(c.id,u.id);
  let status='',btn='';
  if(prog){
    let remain='';
    if(c.timeLimit>0){ const end=new Date(prog.startedAt).getTime()+c.timeLimit*60000;
      const m=Math.max(0,Math.floor((end-Date.now())/60000));
      remain=` · осталось ~${m} мин`; }
    status=`<span class="badge b-amber">В процессе${remain}</span>`;
    btn=`<button type="button" class="btn btn-primary" data-act="sc-start" data-id="${c.id}">${icon('play','sm')} Продолжить</button>`;
  }else if(best){
    status=pctPill(best.pct);
    if(c.kind==='olympiad'){
      btn=`<button type="button" class="btn" data-act="sc-result" data-id="${c.id}">${icon('medal','sm')} Мой результат</button>`;
    }else{
      btn=`<button type="button" class="btn" data-act="sc-result" data-id="${c.id}">${icon('medal','sm')} Результат</button>
           <button type="button" class="btn btn-primary" data-act="sc-start" data-id="${c.id}">${icon('rotate','sm')} Пройти ещё раз</button>`;
    }
  }else{
    status=`<span class="badge b-gray">Не начато</span>`;
    btn=`<button type="button" class="btn btn-primary" data-act="sc-start" data-id="${c.id}">${icon('play','sm')} Начать</button>`;
  }
  return `<div class="task-status">${status}<span class="muted">${c.questions.length} ${plural(c.questions.length,['вопрос','вопроса','вопросов'])}${c.timeLimit?` · ${c.timeLimit} мин на таймере`:''}</span></div>
    <div class="task-actions">${btn}</div>`;
}

/* ---------------- Страница учителя ---------------- */
function teacherCards(){
  const cards=db.cards.filter(c=>c.scope==='teacher'&&c.teacherId===S.user.id)
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const myCids=teacherClassIds(S.user.id);
  const schoolHasClasses=schoolClasses(S.user.schoolId).length>0;
  mount('Карточки с заданиями',`
    <div class="alert alert-info">${icon('layers')}<div>Создавайте карточки как в Учи.ру: вопросы с вариантами ответов, назначайте любым классам школы. Ученики проходят их в разделе «Карточки», а вы видите результаты.</div></div>
    ${schoolHasClasses?'':`<div class="alert alert-warn">${icon('cap')}<div>В школе пока нет классов — зарегистрируйте класс в разделе «Мои классы».</div></div>`}
    <div class="toolbar"><span class="sp"></span>
      <button type="button" class="btn btn-primary" ${schoolHasClasses?'':'disabled'} data-act="tc-create">${icon('plus')} Создать карточку</button></div>
    <div class="task-grid">${cards.map(c=>cardTile(c,{teacher:true,ctx:true})).join('')}</div>
    ${cards.length?'':emptyBlock('layers','Карточек пока нет','Нажмите «Создать карточку»: название, вопросы и правильные ответы.')}`);
}
Act['tc-create']=()=>cardEditor({kind:'card',scope:'teacher'});
Act['tc-edit']=d=>cardEditor({kind:cardById(d.id).kind,scope:'teacher',id:d.id});
Act['tc-assign']=d=>assignModal(d.id);
Act['tc-del']=d=>{ const c=cardById(d.id);
  if(!confirm(`Удалить карточку «${c.title}»? Результаты учеников также удалятся.`))return;
  db.cards=db.cards.filter(x=>x.id!==d.id); db.assigns=db.assigns.filter(a=>a.cardId!==d.id);
  db.attempts=db.attempts.filter(a=>a.cardId!==d.id);
  save(); renderView(); toast('Карточка удалена','info'); };
Act['tc-results']=d=>resultsModal(cardById(d.id));

/* ---------------- Страница админа: «Задания» ---------------- */
function adminTasks(){
  const tab=S.p.tab==='olymp'?'olymp':'common';
  const common=db.cards.filter(c=>c.scope==='common'&&c.kind==='card').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const olymp=db.cards.filter(c=>c.kind==='olympiad').sort((a,b)=>(b.stage-a.stage)||b.createdAt.localeCompare(a.createdAt));
  const list=tab==='olymp'?olymp:common;
  mount('Задания',`
    <div class="toolbar">
      <div class="seg">
        <button type="button" class="${tab==='common'?'on':''}" data-act="at-tab" data-tab="common">${icon('layers','sm')} Общие задания (${common.length})</button>
        <button type="button" class="${tab==='olymp'?'on':''}" data-act="at-tab" data-tab="olymp">${icon('flag','sm')} Олимпиады (${olymp.length})</button>
      </div><span class="sp"></span>
      <button type="button" class="btn btn-primary" data-act="${tab==='olymp'?'at-create-olymp':'at-create-common'}">
        ${icon('plus')} ${tab==='olymp'?'Создать олимпиаду':'Создать общее задание'}</button></div>
    <div class="alert alert-info">${tab==='olympiad'||tab==='olymp'
      ?icon('flag')+'<div>Олимпиады видят все ученики всех школ. Укажите этап и время со старта — по истечении времени ответы сохраняются автоматически.</div>'
      :icon('layers')+'<div>Общие задания видят все ученики всех школ в разделе «Карточки → Общие задания».</div>'}</div>
    <div class="task-grid">${list.map(c=>cardTile(c,{admin:true,ctx:true})).join('')}</div>
    ${list.length?'':emptyBlock(tab==='olymp'?'flag':'layers',tab==='olymp'?'Олимпиад пока нет':'Общих заданий пока нет','Создайте первое кнопкой выше.')}`);
}
Act['at-tab']=d=>go('tasks',{tab:d.tab});
Act['at-create-common']=()=>cardEditor({kind:'card',scope:'common'});
Act['at-create-olymp']=()=>cardEditor({kind:'olympiad',scope:'common'});
Act['at-edit']=d=>cardEditor({kind:cardById(d.id).kind,scope:'common',id:d.id});
Act['at-del']=d=>{ const c=cardById(d.id);
  if(!confirm(`Удалить «${c.title}»? Все результаты учеников удалятся.`))return;
  db.cards=db.cards.filter(x=>x.id!==d.id); db.attempts=db.attempts.filter(a=>a.cardId!==d.id);
  save(); renderView(); toast('Задание удалено','info'); };
Act['at-results']=d=>resultsModal(cardById(d.id));

/* ---------------- Результаты ---------------- */
function resultsModal(card){
  if(!card)return;
  let rows=[];
  if(card.scope==='teacher'){
    const ids=new Set(assignedClassIds(card).flatMap(cid=>classStudents(cid).map(s=>s.id)));
    rows=db.users.filter(u=>ids.has(u.id)).sort(byNameRU);
  }else{
    rows=db.users.filter(u=>u.role==='student').sort(byNameRU);
  }
  const bodyRows=rows.map(s=>{
    const best=bestAttempt(card.id,s.id), prog=progressAttempt(card.id,s.id);
    const cnt=attemptsFor(card.id,s.id).filter(a=>a.status==='done').length;
    const right=best?`<button type="button" class="btn btn-xs" data-act="ar-open" data-attempt="${best.id}">${best.score}/${best.total} · ${best.pct}%</button>`
      :prog?'<span class="badge b-amber">в процессе</span>':'<span class="muted">—</span>';
    const cls=s.classId&&classById(s.classId)?classById(s.classId).name:'—';
    const sch=!card.schoolId&&s.schoolId&&schoolById(s.schoolId)?esc(schoolById(s.schoolId).name):'';
    return `<tr><td><div class="cell-user">${avatar(s)}<b>${esc(s.name)}</b></div></td>
      ${sch?`<td>${sch}</td>`:''}
      <td><span class="badge b-blue">${cls}</span></td>
      <td class="num">${cnt}</td><td>${right}</td></tr>`;
  }).join('');
  openModal({title:`Результаты · ${card.title}`,wide:true,body:`
    <div class="task-result-head">
      <span class="tag ${card.kind==='olympiad'?'tag-olymp':'tag-card'}">${card.kind==='olympiad'?icon('flag','sm')+' Олимпиада · этап '+card.stage:icon('layers','sm')+' Карточка'}</span>
      <span class="muted">${rows.length} ${plural(rows.length,['ученик','ученика','учеников'])} допущено · завершённых попыток: ${db.attempts.filter(a=>a.cardId===card.id&&a.status==='done').length}</span>
    </div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Ученик</th>
      ${card.schoolId===null?'<th>Школа</th>':''}<th>Класс</th><th class="num">Попыток</th><th>Лучший результат</th></tr></thead>
      <tbody>${bodyRows||`<tr><td colspan="5" class="muted" style="padding:18px;text-align:center">Нет данных</td></tr>`}</tbody></table></div>`});
}
Act['ar-open']=d=>attemptReviewModal(d.attempt);
function attemptReviewModal(aid){
  const a=byId(db.attempts,aid); if(!a)return; const card=cardById(a.cardId); if(!card)return;
  const stu=userById(a.studentId);
  if(!a.total) gradeCard(card,a);
  const qs=card.questions.map((q,i)=>{
    const chosen=a.answers[q.id], correct=q.answers.find(x=>x.correct);
    const ok=chosen===correct.id;
    return `<div class="rv-q ${ok?'rv-ok':'rv-bad'}">
      <div class="rv-qh"><b>${i+1}.</b> ${esc(q.text)} <span class="badge ${ok?'b-green':'b-red'}">${ok?'Верно':'Неверно'}</span></div>
      <div class="rv-a">${q.answers.map(an=>`<div class="rv-opt ${an.correct?'is-correct':''} ${chosen===an.id?'is-chosen':''}">
        ${an.correct?icon('check','sm'):chosen===an.id?icon('x','sm'):'<span class="rv-dot"></span>'} ${esc(an.text)}</div>`).join('')}</div></div>`;
  }).join('');
  openModal({title:`Работа ученика · ${stu?esc(stu.name):''}`,wide:true,body:`
    <div class="rv-summary">${pctPill(a.pct)} <b>${a.score} из ${a.total}</b>
      <span class="muted">${card.title}${a.finishedAt?' · завершено '+fmtDateTime(a.finishedAt):''}</span></div>
    ${qs}`});
}

/* ---------------- Страница ученика ---------------- */
function studentCards(){
  sweepAttempts();
  const u=S.user;
  const tab=['mine','common','olymp'].includes(S.p.tab)?S.p.tab:'mine';
  const mine=db.cards.filter(c=>c.scope==='teacher'&&db.assigns.some(a=>a.cardId===c.id&&a.classId===u.classId));
  const common=db.cards.filter(c=>c.scope==='common'&&c.kind==='card');
  const olymp=db.cards.filter(c=>c.kind==='olympiad');
  const list=tab==='mine'?mine:tab==='common'?common:olymp;
  mount('Карточки',`
    <div class="toolbar"><div class="seg">
      <button type="button" class="${tab==='mine'?'on':''}" data-act="sc-tab" data-tab="mine">${icon('users','sm')} Задания от учителей (${mine.length})</button>
      <button type="button" class="${tab==='common'?'on':''}" data-act="sc-tab" data-tab="common">${icon('layers','sm')} Общие задания (${common.length})</button>
      <button type="button" class="${tab==='olymp'?'on':''}" data-act="sc-tab" data-tab="olymp">${icon('flag','sm')} Олимпиады (${olymp.length})</button>
    </div></div>
    <div class="task-grid">${list.map(c=>cardTile(c,{student:true})).join('')}</div>
    ${list.length?'':emptyBlock(tab==='olymp'?'flag':'layers',tab==='mine'?'Заданий от учителей пока нет':tab==='olymp'?'Олимпиад пока нет':'Общих заданий пока нет',
      tab==='mine'?'Учитель назначит карточку после её создания.':'Загляните позже.')}
    <div id="player-host"></div>`);
}
Act['sc-tab']=d=>go('cards',{tab:d.tab});
Act['sc-start']=d=>startCard(d.id);
Act['sc-result']=d=>{ const c=cardById(d.id), b=bestAttempt(d.id,S.user.id); if(b) studentResultView(c,b); };

/* ---------------- Проигрыватель ---------------- */
let playState=null, cardTimer=null;
function clearCardTimer(){ if(cardTimer){clearInterval(cardTimer);cardTimer=null;} }
function fmtClock(ms){ ms=Math.max(0,ms); const m=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function startCard(cardId){
  clearCardTimer();
  const card=cardById(cardId); if(!card)return;
  const u=S.user; let attempt=progressAttempt(cardId,u.id);
  if(attempt && card.timeLimit>0 && Date.now()>=new Date(attempt.startedAt).getTime()+card.timeLimit*60000){
    gradeCard(card,attempt); attempt.status='done';
    attempt.finishedAt=new Date(new Date(attempt.startedAt).getTime()+card.timeLimit*60000).toISOString();
    save(); return studentResultView(card,attempt,true);
  }
  if(!attempt){
    const done=attemptsFor(cardId,u.id).some(a=>a.status==='done');
    if(card.kind==='olympiad'&&done) return studentResultView(card,bestAttempt(cardId,u.id));
    attempt={id:uid('a-'),cardId,studentId:u.id,startedAt:dtISO(0),finishedAt:null,status:'progress',answers:{},score:0,total:0};
    db.attempts.push(attempt); save();
  }
  let idx=card.questions.findIndex(q=>!(q.id in attempt.answers)); if(idx<0)idx=0;
  playState={card,attempt,idx};
  cardIntro(card,attempt);
}
function cardIntro(card,attempt){
  const resume=attempt&&Object.keys(attempt.answers).length>0;
  const deadline=card.timeLimit?new Date(attempt.startedAt).getTime()+card.timeLimit*60000:0;
  const remain=card.timeLimit?Math.max(0,deadline-Date.now()):0;
  mount(card.kind==='olympiad'?'Олимпиада':'Карточка',`
    <div class="qp">
      <div class="qp-intro card">
        <span class="task-ic ${card.kind==='olympiad'?'ic-olymp':'ic-card'}" style="margin:0 auto 14px">${card.kind==='olympiad'?icon('flag'):icon('layers')}</span>
        <h2>${esc(card.title)}</h2>
        <div class="qp-meta">
          ${card.subject?`<span class="badge b-blue">${esc(card.subject)}</span>`:''}
          <span class="badge b-gray">${card.questions.length} ${plural(card.questions.length,['вопрос','вопроса','вопросов'])}</span>
          ${card.kind==='olympiad'?`<span class="badge b-red">${icon('timer','sm')} Этап ${card.stage} · ${card.timeLimit} минут со старта</span>`:''}
        </div>
        <p class="qp-desc">${card.kind==='olympiad'
          ?'В каждом вопросе выберите один правильный ответ. Таймер запускается со старта и не ставится на паузу. По истечении времени работа будет сохранена автоматически. Пройти олимпиаду можно только один раз.'
          :'В каждом вопросе выберите один правильный ответ. В конце вы сразу увидите результат и разбор. Карточку можно проходить повторно.'}</p>
        ${card.kind==='olympiad'&&resume?`<div class="alert alert-warn">${icon('timer')}<div>Вы уже начали: осталось примерно <b>${Math.ceil(remain/60000)} мин</b>. При продолжении таймер пойдёт дальше.</div></div>`:''}
        <div style="display:flex;gap:10px;justify-content:center;margin-top:18px">
          <button type="button" class="btn" data-act="nav" data-page="cards">Назад к списку</button>
          <button type="button" class="btn btn-primary" data-act="qp-begin">${resume?icon('play','sm')+' Продолжить':icon('play','sm')+' Начать'}</button>
        </div>
      </div>
    </div>`);
}
Act['qp-begin']=()=>{ if(playState) renderQuestion(playState.idx||0); };
function renderQuestion(idx){
  const {card,attempt}=playState; playState.idx=idx;
  const q=card.questions[idx], chosen=attempt.answers[q.id];
  mount(card.kind==='olympiad'?`Олимпиада · ${card.title}`:`Карточка · ${card.title}`,`
    <div class="qp">
      <div class="qp-bar card">
        <div class="qp-prog"><i style="width:${Math.round((idx)/card.questions.length*100)}%"></i></div>
        <div class="qp-bar-meta">
          <span><b>Вопрос ${idx+1}</b> из ${card.questions.length}</span>
          ${card.timeLimit?`<span class="qp-timer" id="qp-timer">${icon('timer','sm')} <b>--:--</b></span>`:'<span class="muted">Без таймера</span>'}
        </div>
      </div>
      <div class="qp-q card">
        <h2>${esc(q.text)}</h2>
        <div class="qp-answers">
          ${q.answers.map(a=>`<button type="button" class="qp-answer ${chosen===a.id?'selected':''}" data-aid="${a.id}">
             <span class="qp-letter">${String.fromCharCode(1040+q.answers.indexOf(a))}</span><span>${esc(a.text)}</span></button>`).join('')}
        </div>
        <div class="qp-foot">
          <button type="button" class="btn" id="qp-prev" ${idx===0?'disabled':''}>Назад</button>
          <span class="sp"></span>
          <button type="button" class="btn btn-primary" id="qp-next" ${chosen?'':'disabled'}>${idx===card.questions.length-1?'Завершить':'Дальше '+icon('chevron','sm')}</button>
        </div>
      </div>
    </div>`);
  document.querySelectorAll('.qp-answer').forEach(b=>b.addEventListener('click',()=>{
    attempt.answers[q.id]=b.dataset.aid; save();
    document.querySelectorAll('.qp-answer').forEach(x=>x.classList.toggle('selected',x===b));
    document.querySelector('#qp-next').disabled=false;
  }));
  document.querySelector('#qp-prev').addEventListener('click',()=>renderQuestion(idx-1));
  document.querySelector('#qp-next').addEventListener('click',()=>{
    if(idx===card.questions.length-1) finishCard(); else renderQuestion(idx+1);
  });
  if(card.timeLimit) startTimer(card,attempt);
}
function startTimer(card,attempt){
  clearCardTimer();
  const end=new Date(attempt.startedAt).getTime()+card.timeLimit*60000;
  const el=()=>document.querySelector('#qp-timer');
  const tick=()=>{ const rem=end-Date.now(); const e=el();
    if(e){ e.innerHTML=`${icon('timer','sm')} <b>${fmtClock(rem)}</b>`; e.classList.toggle('urgent',rem<60000); }
    if(rem<=0){ clearCardTimer(); finishCard(true); } };
  tick(); cardTimer=setInterval(tick,1000);
}
function finishCard(auto=false){
  const {card,attempt}=playState; if(!attempt||attempt.status==='done')return;
  clearCardTimer();
  gradeCard(card,attempt);
  attempt.status='done'; attempt.finishedAt=dtISO(0); save();
  studentResultView(card,attempt,auto);
}
function studentResultView(card,a,auto){
  clearCardTimer(); playState=null;
  if(!a.total) gradeCard(card,a);
  const great=a.pct>=85, ok=a.pct>=60;
  mount('Результат · '+card.title,`
    <div class="qp">
      <div class="qp-result card">
        <div class="qp-score ${great?'sc-great':ok?'sc-ok':'sc-bad'}">${a.pct}%</div>
        <h2>${great?'Отличный результат!':ok?'Хороший результат!':'Есть над чем поработать'}</h2>
        <p>${esc(card.title)} · правильных ответов <b>${a.score} из ${a.total}</b>${auto?' · время вышло, ответы сохранены автоматически':''}</p>
        <div class="qp-result-actions">
          <button type="button" class="btn" data-act="nav" data-page="cards">К списку карточек</button>
          <button type="button" class="btn" data-act="rv-my" data-id="${card.id}">${icon('tasks','sm')} Разбор ответов</button>
          ${card.kind!=='olympiad'?`<button type="button" class="btn btn-primary" data-act="sc-start" data-id="${card.id}">${icon('rotate','sm')} Пройти ещё раз</button>`:''}
        </div>
      </div>
    </div>`);
}
Act['rv-my']=d=>attemptReviewModal(bestAttempt(d.id,S.user.id)?.id||attemptsFor(d.id,S.user.id).slice(-1)[0]?.id);



/* =====================================================================
   ПКМ-МЕНЮ ПО ВСЕМУ ПОРТАЛУ
   Элемент с атрибутом data-ctx="тип" data-id="..." открывает меню справа.
===================================================================== */
const Ctx={};
function ctxRow(ic,label,dataset,opts={}){
  const attrs=Object.entries(dataset||{}).map(([k,v])=>`data-${k}="${esc(String(v))}"`).join(' ');
  return `<button type="button" class="ctx-item ${opts.danger?'ctx-danger':''} ${opts.disabled?'ctx-disabled':''}"
    ${opts.disabled?'disabled':''} data-act="${opts.act}" ${attrs}>${icon(ic,'sm')} ${esc(label)}</button>`;
}
/* ученик (страница «Ученики» у учителя) */
Ctx.student=(el,x,y)=>{
  const s=userById(el.dataset.id); if(!s)return; const c=classById(s.classId);
  const canDel=canManageStudent(s);
  ctxMenu(x,y,`<div class="ctx-head">${esc(s.name)}<br><span>${c?esc(c.name):'ученик'}</span></div>
    <button type="button" class="ctx-item" data-act="nav" data-page="journal" data-class="${s.classId}">${icon('book','sm')} Открыть журнал класса</button>
    <button type="button" class="ctx-item" data-act="coin-for" data-id="${s.id}">${icon('coins','sm')} Начислить классниксы</button>
    <div class="ctx-sep"></div>
    <button type="button" class="ctx-item" data-act="copy" data-text="${esc(s.login+' / '+s.pass)}" data-label="Данные ученика скопированы">${icon('copy','sm')} Скопировать логин и пароль</button>
    ${canDel?`<div class="ctx-sep"></div>
    <button type="button" class="ctx-item ctx-danger" data-act="student-del" data-id="${s.id}">${icon('trash','sm')} Удалить ученика</button>`:''}`);
};
/* учитель (страница директора) */
Ctx.teacher=(el,x,y)=>{
  const t=userById(el.dataset.id); if(!t)return;
  ctxMenu(x,y,`<div class="ctx-head">${esc(t.name)}<br><span>Учитель</span></div>
    <button type="button" class="ctx-item" data-act="copy" data-text="${esc(t.login+' / '+t.pass)}" data-label="Данные учителя скопированы">${icon('copy','sm')} Скопировать логин и пароль</button>
    <div class="ctx-sep"></div>
    <button type="button" class="ctx-item ctx-danger" data-act="teacher-del" data-id="${t.id}">${icon('trash','sm')} Удалить учителя</button>`);
};
/* домашнее задание */
Ctx.hw=(el,x,y)=>{
  const h=byId(db.homework,el.dataset.id); if(!h)return;
  if(h.teacherId!==S.user.id) return; // чужое ДЗ не редактируем
  ctxMenu(x,y,`<div class="ctx-head">${esc(h.title)}<br><span>${esc(h.subject||'')}</span></div>
    <button type="button" class="ctx-item ctx-danger" data-act="hw-del" data-id="${h.id}">${icon('trash','sm')} Удалить задание</button>`);
};
/* новость */
Ctx.news=(el,x,y)=>{
  const n=byId(db.news,el.dataset.id); if(!n)return;
  ctxMenu(x,y,`<div class="ctx-head">${esc(n.title)}</div>
    <button type="button" class="ctx-item ctx-danger" data-act="news-del" data-id="${n.id}">${icon('trash','sm')} Удалить новость</button>`);
};
/* награда директора */
Ctx.reward=(el,x,y)=>{
  const r=byId(db.rewards,el.dataset.id); if(!r)return;
  ctxMenu(x,y,`<div class="ctx-head">${esc(r.title)}<br><span>${r.cost} классниксов</span></div>
    <button type="button" class="ctx-item" data-act="reward-edit" data-id="${r.id}">${icon('pencil','sm')} Изменить награду</button>
    <button type="button" class="ctx-item ctx-danger" data-act="reward-del" data-id="${r.id}">${icon('trash','sm')} Удалить награду</button>`);
};
/* класс учителя */
Ctx.cls=(el,x,y)=>{
  const c=classById(el.dataset.id); if(!c)return;
  ctxMenu(x,y,`<div class="ctx-head">${esc(c.name)}<br><span>${classStudents(c.id).length} учеников</span></div>
    <button type="button" class="ctx-item" data-act="nav" data-page="journal" data-class="${c.id}">${icon('book','sm')} Журнал</button>
    <button type="button" class="ctx-item" data-act="student-add-for" data-class="${c.id}">${icon('plus','sm')} Добавить учеников</button>
    <button type="button" class="ctx-item" data-act="nav" data-page="schedule" data-class="${c.id}">${icon('calendar','sm')} Расписание</button>`);
};
/* предмет школы (директор) */
Ctx.subject=(el,x,y)=>{
  const s=byId(db.subjects,el.dataset.id); if(!s)return;
  ctxMenu(x,y,`<div class="ctx-head">${esc(s.name)}<br><span>Предмет школы</span></div>
    <button type="button" class="ctx-item" data-act="subj-edit" data-id="${s.id}">${icon('pencil','sm')} Переименовать</button>
    <div class="ctx-sep"></div>
    <button type="button" class="ctx-item ctx-danger" data-act="subj-del" data-id="${s.id}">${icon('trash','sm')} Удалить из каталога</button>`);
};
/* карточка / олимпиада (учитель или админ) */
Ctx.card=(el,x,y)=>{
  const c=cardById(el.dataset.id); if(!c)return;
  const teacher=S.user.role==='teacher';
  ctxMenu(x,y,`<div class="ctx-head">${esc(c.title)}<br><span>${c.kind==='olympiad'?'Олимпиада · этап '+c.stage:'Карточка · '+c.questions.length+' вопросов'}</span></div>
    ${teacher
      ?`<button type="button" class="ctx-item" data-act="tc-assign" data-id="${c.id}">${icon('users','sm')} Назначить классам</button>
         <button type="button" class="ctx-item" data-act="tc-results" data-id="${c.id}">${icon('chart','sm')} Результаты</button>
         <button type="button" class="ctx-item" data-act="tc-edit" data-id="${c.id}">${icon('pencil','sm')} Изменить</button>
         <div class="ctx-sep"></div>
         <button type="button" class="ctx-item ctx-danger" data-act="tc-del" data-id="${c.id}">${icon('trash','sm')} Удалить карточку</button>`
      :`<button type="button" class="ctx-item" data-act="at-results" data-id="${c.id}">${icon('chart','sm')} Результаты учеников</button>
         <button type="button" class="ctx-item" data-act="at-edit" data-id="${c.id}">${icon('pencil','sm')} Изменить</button>
         <div class="ctx-sep"></div>
         <button type="button" class="ctx-item ctx-danger" data-act="at-del" data-id="${c.id}">${icon('trash','sm')} Удалить</button>`}`);
};

/* единая точка ПКМ: журнал, расписание, любые [data-ctx] */
document.addEventListener('contextmenu',e=>{
  const xc=e.target.closest('.x-cell');
  if(xc){ e.preventDefault(); sheetCellMenu(xc,e.clientX,e.clientY); return; }
  const sc=e.target.closest('td[data-act="sched-cell"]');
  if(sc){ e.preventDefault(); scheduleCtx(sc,e.clientX,e.clientY); return; }
  const ge=e.target.closest('[data-ctx]');
  if(ge&&Ctx[ge.dataset.ctx]){ e.preventDefault(); Ctx[ge.dataset.ctx](ge,e.clientX,e.clientY); }
});

/* =====================================================================
   ОБРАБОТЧИКИ И ЗАПУСК
===================================================================== */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');
  if(!b) return;
  if(b.tagName==='BUTTON') b.blur();
  const fn=Act[b.dataset.act];
  if(fn){ e.preventDefault(); try{ fn(b.dataset,b,e); }catch(err){ console.error(err); toast('Ошибка действия: '+err.message,'err'); } }
});
document.addEventListener('submit',e=>{
  const f=e.target.closest('form[data-form]');
  if(!f)return;
  e.preventDefault();
  const fn=Fm[f.dataset.form];
  if(fn){ try{ fn(new FormData(f),f); }catch(err){ console.error(err); toast('Ошибка формы: '+err.message,'err'); } }
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
$('#burger').addEventListener('click',()=>$('.sidebar').classList.toggle('open'));
document.addEventListener('click',e=>{ if(e.target.closest('.main')) $('.sidebar').classList.remove('open'); });

(function boot(){
  // Гарантированно удаляем данные ВСЕХ старых версий портала (включая демо-базы)
  try{
    Store.keys().forEach(k=>{
      if(/^school_portal_v/i.test(k) && k!==KEY){ Store.del(k); }
    });
    // сбрасываем «зависшую» сессию от предыдущих версий
    const sid0=Store.get('sp_session');
    if(sid0){
      let ok=false;
      try{ ok=!!JSON.parse(Store.get(KEY)||'{}').users?.find(u=>u.id===sid0); }catch(e){}
      if(!ok) Store.del('sp_session');
    }
  }catch(e){}
  const sid=Store.get('sp_session');
  const u=sid?userById(sid):null;
  if(u) enterApp(u); else showLogin();
})();
