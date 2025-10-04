
// Simple active nav highlighter
(function(){
  const here = location.pathname.replace(/\/index\.html$/, '/') || '/';
  document.querySelectorAll('nav a').forEach(a=>{
    const path = a.getAttribute('href');
    if ((path === '/' && here === '/') || (path !== '/' && here.endsWith(path))) {
      a.classList.add('active');
    }
  });
})();

// Preview helpers (reused on data.html)
const MAX_PREVIEW_ROWS = 8;
function renderFlashPreview(deck=[]){
  const tbody = document.querySelector('#flash-table tbody'); if(!tbody) return;
  const countEl = document.getElementById('flash-count');
  tbody.innerHTML='';
  deck.slice(0,MAX_PREVIEW_ROWS).forEach(r=>{
    const tr=document.createElement('tr');
    const td1=document.createElement('td'); const td2=document.createElement('td');
    td1.textContent=r.term??''; td2.textContent=r.def??'';
    td1.setAttribute('data-label','Term'); td2.setAttribute('data-label','Definition');
    tr.append(td1,td2); tbody.appendChild(tr);
  });
  if(countEl) countEl.textContent = `${deck.length} item${deck.length===1?'':'s'}`;
}
function renderQuizPreview(deck=[]){
  const tbody=document.querySelector('#quiz-table tbody'); if(!tbody) return;
  const countEl=document.getElementById('quiz-count');
  tbody.innerHTML='';
  const cell=(v,l,cls)=>{const c=document.createElement('td');c.textContent=(v??'').toString();c.setAttribute('data-label',l);if(cls)c.classList.add(cls);return c;};
  deck.slice(0,MAX_PREVIEW_ROWS).forEach(r=>{
    const tr=document.createElement('tr');
    tr.append(
      cell(r.domain,'Domain'),
      cell(r.question,'Question'),
      cell(r.optionA,'A','col-optionA'),
      cell(r.optionB,'B','col-optionB'),
      cell(r.optionC,'C','col-optionC'),
      cell(r.optionD,'D','col-optionD'),
      cell(r.answer,'Answer'),
      cell(r.rationale,'Rationale','col-rationale')
    );
    tbody.appendChild(tr);
  });
  if(countEl) countEl.textContent = `${deck.length} item${deck.length===1?'':'s'}`;
}

// Load from localStorage if present
function loadLocalDecks(){
  try{
    const fc = JSON.parse(localStorage.getItem('flash:deck')||localStorage.getItem('safmeds:deck')||'[]');
    const qz = JSON.parse(localStorage.getItem('quiz:deck')||'[]');
    return {fc, qz};
  }catch(e){ console.warn('Deck parse error', e); return {fc:[], qz:[]}; }
}
