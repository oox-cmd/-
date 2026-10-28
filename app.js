'use strict';
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const data = window.AXIS;
  const storageKey = 'central-axis-course-v1';
  const state = {view:'intro',selected:'zhengyang',period:'all',tour:null,tourStep:0,explosion:0,scan:false,warning:false,records:[],feedback:[],saved:[],adminTab:'records',returnView:'practice'};
  const chapters = [
    {id:'intro',number:'序章',title:'点亮一条中轴'},
    {id:'explore',number:'第一章',title:'读懂中轴'},
    {id:'protect',number:'第二章',title:'科技守护'},
    {id:'story',number:'第三章',title:'科技讲活'},
    {id:'practice',number:'第四章',title:'青年尝试'},
    {id:'epilogue',number:'尾声',title:'让所学回应需要'}
  ];
  let introFrame = null;
  let modelViewer = null;
  let cameraFrame = null;
  let camera = [0,0,520,650];
  let route = null;
  let practicePoint = null;
  const visited = new Set(['zhengyang']);
  const exploredPaths = [];
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tourStops = ['bell','hill','palace','zhengyang','xiannong','yongding'];
  const periods = {
    all:['全景','7.8公里 · 遗产整体','建筑、道路、水系与公共空间，共同构成一条完整的城市轴线。'],
    yuan:['13世纪','13世纪 · 轴线起源','始建于13世纪，城市空间沿南北中轴展开。'],
    ming:['16世纪','16世纪 · 南延至永定门','16世纪，外城修筑推动中轴线向南延伸至永定门，整体格局逐步形成。'],
    today:['当代保护','2024入遗 · 2025立法','2024年列入《世界遗产名录》，2025年通过世界文化遗产保护条例，此后保护与传承继续推进。']
  };
  let toastTimer;
  let storageAvailable = true;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const current = () => data.nodes.find(n => n.id === state.selected);
  const displayDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '日期未注明' : date.toLocaleString('zh-CN', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  };
  function toast(message) {
    $('#toast').textContent = message; $('#toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3800);
  }
  function validImage(value) {return typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(value) && value.length <= 1600000;}
  function validateArchive(value) {
    if (!value || value.schema !== 1 || !Array.isArray(value.records) || !Array.isArray(value.feedback) || !Array.isArray(value.saved)) throw Error('文件格式不正确，请使用本项目导出的 JSON 资料包。');
    if (value.records.length > 60 || value.feedback.length > 1000) throw Error('记录数量超过本地展示容量。');
    const records = value.records.map(r => {
      if (!r || typeof r.title !== 'string' || !r.title.trim() || r.title.length > 80 || typeof r.note !== 'string' || r.note.length > 3000 || !data.nodes.some(n => n.id === r.node) || !['观察','访谈摘录','问卷说明','体验记录'].includes(r.kind) || typeof r.date !== 'string' || r.date.length > 32 || (r.photo && !validImage(r.photo))) throw Error('实践记录中有无效内容。');
      return {title:r.title,node:r.node,kind:r.kind,date:r.date,note:r.note,photo:r.photo || ''};
    });
    const feedback = value.feedback.map(f => {
      if (!f || !Number.isInteger(f.rating) || f.rating < 1 || f.rating > 5 || typeof f.useful !== 'string' || !['数字地图','一分钟知识卡','建筑结构演示','数字保护流程'].includes(f.useful) || typeof f.comment !== 'string' || f.comment.length > 1000 || typeof f.date !== 'string' || f.date.length > 32) throw Error('体验反馈中有无效内容。');
      return {rating:f.rating,useful:f.useful,comment:f.comment,date:f.date};
    });
    return {records,feedback,saved:[...new Set(value.saved.filter(id => data.nodes.some(n => n.id === id)))]};
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) Object.assign(state, validateArchive(JSON.parse(raw)));
  } catch {storageAvailable = false;}
  function save() {
    try {localStorage.setItem(storageKey, JSON.stringify({schema:1,records:state.records,feedback:state.feedback,saved:state.saved})); storageAvailable = true; return true;}
    catch {storageAvailable = false; toast('浏览器无法保存更多内容，当前记录仍可导出备份。'); return false;}
  }
  function showDialog(html) {$('#dialog-body').innerHTML = html; if (!$('#dialog').open) $('#dialog').showModal();}
  $('#close-dialog').addEventListener('click', () => $('#dialog').close());
  $('#dialog').addEventListener('click', e => {if(e.target === $('#dialog')) {const r = e.target.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();}});

  // Native SVG illustrations: intentionally schematic rather than surveyed models.
  function building(shape, explosion = 0) {
    const roof = (y,w=34) => `<path d="M${-w},${y+7} Q${-w+11},${y+5} 0,${y-9} Q${w-11},${y+5} ${w},${y+7} L${w-5},${y+12} H${-w+5}Z"/>`;
    const columns = (y,w=23) => `<path d="M${-w},${y}v17m${w*2},-17v17M-12,${y}v17M0,${y}v17M12,${y}v17"/>`;
    let body = '';
    const e = explosion / 100;
    if (shape === 'bridge') body = '<path d="M-40 18Q0-10 40 18L40 25Q0 0-40 25Z M-40 14Q0-14 40 14M-30 10v7M-18 5v7M-6 2v7M6 2v7M18 5v7M30 10v7"/>';
    else if(shape === 'road') body = '<path d="M-22 32 0-24 22 32Z M-35 32-4-27M35 32 4-27M-13 8h26M-18 21h36M-8-5H8"/>';
    else if(shape === 'hill') body = `<path d="M-45 30Q-32 0-17 9Q-8-22 0-25Q12-14 19 6Q33-1 45 30Z"/>${roof(-26,18)}<path d="M-11-14v15h22v-15"/>`;
    else if(shape === 'altar') body = '<path d="M-39 24 0 6 39 24 0 42Z M-31 17 0 3 31 17 0 31Z M-23 10 0 0 23 10 0 21Z M-39 24v5L0 47l39-18v-5M0-22v22M-8-17h16"/>';
    else if(shape === 'temple') body = `<path d="M-37 31Q0 47 37 31L31 25Q0 37-31 25Z"/><g transform="translate(0 ${e*-20})">${roof(-8,34)}${columns(4,23)}</g><g transform="translate(0 ${e*-40})">${roof(-25,26)}${columns(-13,17)}</g><g transform="translate(0 ${e*-60})">${roof(-41,18)}<path d="M0-51v-8"/></g>`;
    else if(shape === 'square') body = '<path d="M-43 30 0 7 43 30 0 51Z M-5 12V-27H5v39M-7-27h14M-11 19h22M-36 13V-3h20v7M36 13V-3H16v7M-39-3h26M39-3H13"/>';
    else {
      body = '<path d="M-40 31V16h80v15ZM-6 31V20Q0 12 6 20v11M-41 33h82"/>';
      body += `<g transform="translate(0 ${e*-20})">${columns(-2,24)}${roof(-14,38)}</g>`;
      body += `<g transform="translate(0 ${e*-45})">${columns(-25,18)}${roof(-37,30)}<path d="M0-47v-7"/></g>`;
      if(shape === 'palace') body += '<path d="M-42 32-56 40H56L42 32M-47 36v5M47 36v5"/>';
      if(shape === 'tower') body += '<path d="M-13 10h26M-8-25h16"/>';
    }
    return `<g class="node-shape" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  }
  function mapMarkup() {
    let grids='';for(let i=0;i<12;i++) grids+=`<path class="gridline" d="M35 ${35+i*47}H485"/>`;
    for(let i=0;i<10;i++) grids+=`<path class="gridline" d="M${35+i*50} 25V610"/>`;
    return `<svg class="map" viewBox="0 0 520 650" role="group" aria-label="北京中轴线15个遗产构成要素空间图谱">${grids}<path class="map-land" d="M100 40H424L438 240 452 415 408 607H103L65 477 88 278Z"/><path d="M100 119Q144 90 174 128T249 132" fill="none" stroke="#3f7d7955" stroke-width="9"/><path d="M70 345H450M110 455H410" fill="none" stroke="#385452" stroke-width="7"/><path class="axis-glow" d="M260 43V574"/><path class="axis-line" d="M260 43V574"/><g id="history-layer"></g><g id="explored-layer">${exploredPaths.map(d=>`<path class="explored-path" d="${d}"/>`).join('')}</g><g id="travel-layer"></g><g id="route-layer"></g>
    ${data.nodes.map(n=>{
      const x=n.x*5.2,y=n.y*6.1,side=n.x===50?(n.index%2===0?-1:1):(n.x<50?-1:1),dx=side*29;
      return `<g role="button" tabindex="0" aria-label="查看${n.name}" aria-pressed="${state.selected===n.id}" data-id="${n.id}" class="node ${state.selected===n.id?'active':''} ${visited.has(n.id)?'visited':''}" transform="translate(${x} ${y})"><circle r="19" fill="transparent"/><circle class="node-halo" r="11"/><g transform="translate(0 -12) scale(${n.id==='palace'?.67:.43})">${building(n.shape)}</g><circle class="node-circle" r="3"/><path d="M${side*7} 0H${dx-side*5}" stroke="currentColor" stroke-width=".6"/><text class="node-label" x="${dx}" y="4" text-anchor="${side<0?'end':'start'}">${n.name==='天安门广场及建筑群'?'广场及建筑群':escape(n.name)}</text></g>`;
    }).join('')}</svg>`;
  }
  function detailMarkup() {
    if(practicePoint) return `<div class="detail-top"><span>实践点位</span><span>${practicePoint.extra?'拓展':'主路线'}</span></div><div class="node-number">${practicePoint.extra?'拓展观察':'现场任务'}</div><h2>${escape(practicePoint.name)}</h2><div class="building-view practice-symbol">◇</div><div class="knowledge"><h3>观察重点</h3><p>${escape(practicePoint.what)}</p></div><div class="knowledge"><h3>现场观察任务</h3><p>${escape(practicePoint.look)}</p></div><button class="secondary" id="back-heritage">返回遗产知识卡 ↗</button>`;
    const n=current();return `<div class="detail-top"><span>一分钟知识卡</span><span>${String(n.index+1).padStart(2,'0')} / 15</span></div><div class="node-number">${escape(n.type)}</div><h2>${escape(n.name)}</h2><p class="detail-subtitle">${escape(n.subtitle)}</p><div class="building-view"><svg viewBox="-60 -65 120 120" aria-label="${escape(n.name)}建筑插图">${building(n.shape)}</svg></div>${[['是什么',n.what],['为什么重要',n.why],['现场看什么',n.look]].map(([t,copy],i)=>`<div class="knowledge"><h3>0${i+1} / ${t}</h3><p>${escape(copy)}</p></div>`).join('')}<div class="node-nav"><button id="previous">← 上一站</button><button id="next">下一站 →</button><button class="bookmark" id="bookmark" aria-label="${state.saved.includes(n.id)?'取消收藏':'收藏节点'}" aria-pressed="${state.saved.includes(n.id)}">${state.saved.includes(n.id)?'★':'☆'}</button></div>`;
  }
  function stopCamera() {if(cameraFrame!==null)cancelAnimationFrame(cameraFrame);cameraFrame=null;}
  function cameraTarget(x=260,y=325,zoom=1) {
    const w=520/zoom,h=650/zoom;
    return [Math.max(0,Math.min(520-w,x-w/2)),Math.max(0,Math.min(650-h,y-h/2)),w,h];
  }
  function currentMapPoint() {return practicePoint||{x:current().x*5.2,y:current().y*6.1};}
  function updateFocusButton() {
    const button=$('#map-focus');if(!button)return;
    const point=currentMapPoint(),target=cameraTarget(point.x,point.y,2.6);
    const focused=camera.every((value,i)=>Math.abs(value-target[i])<.05);
    button.disabled=focused;button.textContent=focused?'已聚焦':'聚焦当前 ↗';
  }
  function setCamera(x=260,y=325,zoom=1) {
    stopCamera();const svg=$('.map');if(!svg)return;
    const target=cameraTarget(x,y,zoom);updateFocusButton();
    const start=[...camera],began=performance.now();
    const update=t=>{camera=start.map((v,i)=>v+(target[i]-v)*t);svg.setAttribute('viewBox',camera.join(' '));};
    if(reducedMotion()){update(1);updateFocusButton();return;}
    const tick=now=>{const t=Math.min(1,(now-began)/900);update(1-Math.pow(1-t,3));if(t<1)cameraFrame=requestAnimationFrame(tick);else {cameraFrame=null;updateFocusButton();}};
    cameraFrame=requestAnimationFrame(tick);
  }
  function updateHistory() {
    const layer=$('#history-layer');if(!layer)return;
    layer.innerHTML=state.period==='yuan'?'<path class="history-axis" d="M260 43V350"/>':state.period==='ming'?'<path class="history-axis" d="M260 43V445"/><path class="history-extension" pathLength="1" d="M260 445V574"/>':state.period==='today'?data.nodes.map(n=>`<circle class="history-ring" cx="${n.x*5.2}" cy="${n.y*6.1}" r="18"/>`).join(''):'';
    $('#map-layer').textContent=periods[state.period][1];
    $('#period-copy').textContent=periods[state.period][2];
    $$('[data-period]').forEach(b=>{b.classList.toggle('active',b.dataset.period===state.period);b.setAttribute('aria-pressed',b.dataset.period===state.period);});
  }
  function updateRoute() {
    const layer=$('#route-layer');if(!layer)return;
    const r=route===null?null:data.practice.routes[route];
    layer.innerHTML=r?`<path class="practice-route route-extra" d="${r.extra}"/><path class="practice-route route-main" pathLength="1" d="${r.main}"/>${data.practice.points.filter(p=>p.route===route).map(p=>`<g class="practice-point ${p.extra?'extra':''}" data-point="${p.id}" role="button" tabindex="0" aria-label="实践计划：${p.name}" transform="translate(${p.x} ${p.y})"><circle r="14" fill="transparent"/><path d="M0-6 6 0 0 6-6 0Z"/><text x="${p.dx}" y="${p.dy}" text-anchor="${p.anchor||'start'}">${p.name}</text></g>`).join('')}`:'';
    $$('[data-point]').forEach(el=>{const action=()=>{stopTour();practicePoint=data.practice.points.find(p=>p.id===el.dataset.point);setCamera(practicePoint.x,practicePoint.y,1.8);$('.detail').innerHTML=detailMarkup();bindDetail();};el.onclick=action;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}};});
    $$('[data-map-route]').forEach(b=>{const active=b.dataset.mapRoute===(route===null?'none':String(route));b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
    $('#route-caption').textContent=route===null?'选择实践路线，查看沿途观察任务。':`计划路线：${data.routes[route].places}${route===1?' · 景山拓展线':''}`;
  }
  function chooseRoute(value) {
    stopTour();route=value==='none'?null:Number(value);practicePoint=null;state.period='all';updateHistory();updateRoute();
    $('.detail').innerHTML=detailMarkup();bindDetail();
    if(route===null)setCamera();else {selectNode(data.practice.routes[route].nodeIds[0]);setCamera(...data.practice.routes[route].view);}
  }
  function stopIntro() {if(introFrame !== null) cancelAnimationFrame(introFrame);introFrame=null;}
  function renderIntro() {
    $('#main').innerHTML=`<section class="intro-scene" aria-labelledby="intro-title"><button class="intro-skip" id="skip-intro">跳过开场 ↗</button><div class="intro-orbit" aria-hidden="true"><div class="intro-axis"></div>${data.nodes.map((n,i)=>`<div class="intro-stop ${i%2?'right':'left'}" style="--stop:${i};--position:${5+i*6.35}%"><i></i><span>${escape(n.name)}</span></div>`).join('')}</div><div class="intro-content"><div class="eyebrow">轴脉新声实践团队 / 科技创新行</div><p class="intro-lead">一条中轴，贯通古今</p><h1 id="intro-title">智护中轴<br><em>数启文脉</em></h1><p class="intro-question">科技如何守护并“讲活”千年中轴？</p><div class="intro-distance"><strong id="intro-count" aria-hidden="true">0.0</strong><span>公里 · 纵贯老城南北</span><span class="sr-only">北京中轴线全长7.8公里</span></div><div class="intro-enter"><button class="primary" id="enter-axis">进入中轴 <span>→</span></button><span id="intro-status" role="status">轴线正在点亮</span></div></div><div class="intro-bottom"><span>北京中轴线数字文化遗产交互展厅</span></div></section>`;
    const scene=$('.intro-scene');const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const began=performance.now();
    function animate(now) {
      const elapsed=now-began;const fraction=Math.min(elapsed/5200,1);
      $('#intro-count').textContent=(7.8*fraction).toFixed(1);
      scene.style.setProperty('--axis-reveal',fraction);
      $$('.intro-stop',scene).forEach((node,i)=>node.classList.toggle('lit',fraction>=(i+1)/15));
      if(elapsed>=6500){finish();return;}
      introFrame=requestAnimationFrame(animate);
    }
    function finish() {introFrame=null;scene.classList.add('is-ready');scene.style.setProperty('--axis-reveal',1);$('#intro-count').textContent='7.8';$$('.intro-stop',scene).forEach(n=>n.classList.add('lit'));$('#intro-status').textContent='15处遗产构成要素，等待探索';}
    $('#skip-intro').onclick=()=>navigate('explore');$('#enter-axis').onclick=()=>navigate('explore');
    if(reduced) finish();else introFrame=requestAnimationFrame(animate);
  }
  function gateIllustration() {
    const cols=[105,144,183,222,261,300,339].map(x=>`<path d="M${x} 178v65M${x} 102v39" stroke="#b65b45" stroke-width="9"/>`).join('');
    return `<svg width="440" height="330" viewBox="0 0 440 330" role="img" aria-label="正阳门城楼原创彩色插图"><ellipse cx="220" cy="302" rx="198" ry="16" fill="#052125"/><path d="M44 246H396V298H44ZM205 298V276Q220 251 235 276V298Z" fill="#829490" fill-rule="evenodd"/><path d="M51 255H389M51 271H194M245 271H389M51 286H194M245 286H389" stroke="#c0c3ae" opacity=".4"/><path d="M96 167H344V244H96ZM132 93H308V147H132Z" fill="#742f2c"/>${cols}<path d="M72 158Q151 148 220 115Q289 148 368 158L353 176H87Z M99 85Q165 78 220 48Q275 78 341 85L326 101H114Z" fill="#415e5c" stroke="#a4b092" stroke-width="3"/><path d="M83 179H357M109 104H331M90 229H350M127 139H313" stroke="#d4b67c" stroke-width="6"/><path d="M122 123Q167 113 220 94Q273 113 318 123L309 137H131Z" fill="#365452" stroke="#94aa89" stroke-width="3"/><path d="M198 53H242M220 46V33M98 157 82 150M342 157 358 150" stroke="#d4b67c" stroke-width="4"/><path d="M204 183H236V228H204Z" fill="#173a36" stroke="#cfb77f"/><text x="220" y="197" fill="#e6d3a0" text-anchor="middle" font-size="11" font-family="SimSun,serif"><tspan x="220">正</tspan><tspan x="220" dy="13">陽</tspan><tspan x="220" dy="13">門</tspan></text><path d="M106 212H195M245 212H335" stroke="#b57454" stroke-width="3"/></svg>`;
  }
  function downloadFile(content,type,name) {
    const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function renderStory() {
    const n=data.nodes.find(n=>n.id==='zhengyang');let cardIndex=0;
    const cards=[['是什么',n.what],['为什么重要','城楼与箭楼共同组成城市门户。把两座建筑和周边空间放在一起，才能读懂城门与老城的关系。'],['现场看什么','找到城楼与箭楼，比较屋顶、门洞与体量，再看看展陈怎样解释它们不同的功能。']];
    $('#main').innerHTML=`<section class="page narrative-page story-page fade-in">${heading('CHAPTER 03 / 科技讲活','把一座城门，讲成一分钟的故事','从大屏探索到手机阅读，让观众带着一个问题重新看见建筑。')}<div class="story-layout"><article class="story-editor"><div class="eyebrow">同一份知识，换一种讲法</div><h2>从“看见”<br>走向“看懂”</h2><div class="story-points"><div><b>01 / 空间导览</b><p>先找到正阳门，读懂它在整条中轴线上的位置。</p></div><div><b>02 / 立体观察</b><p>换个角度看城楼，观察屋檐、柱廊与台基。</p></div><div><b>03 / 一分钟知识卡</b><p>把“是什么、为什么重要、现场看什么”组织成可以随手阅读的内容。</p></div></div><div class="actions"><button class="secondary" id="story-explore">去地图寻找正阳门 ↗</button><button class="secondary" id="export-story">保存完整知识卡 ↓</button></div><p class="chapter-note">保存知识卡，带走一个中轴故事</p></article><div class="phone-stage"><div class="phone"><div class="phone-top">中轴一分钟 <span>知识卡 / 01</span></div><div class="phone-art">${gateIllustration()}</div><div class="phone-copy"><span class="tag">北京中轴线 · 正阳门</span><h2 id="phone-title"></h2><p id="phone-text"></p></div><div class="phone-controls"><button id="phone-prev" aria-label="知识卡上一页">←</button><span id="phone-count" role="status"></span><button id="phone-next" aria-label="知识卡下一页">→</button></div></div><span class="phone-caption">点击箭头，演示手机端的阅读节奏</span></div></div></section>`;
    const update=()=>{$('#phone-title').textContent=cards[cardIndex][0];$('#phone-text').textContent=cards[cardIndex][1];$('#phone-count').textContent=`0${cardIndex+1} / 03`;$('#phone-prev').disabled=cardIndex===0;$('#phone-next').disabled=cardIndex===2;};
    $('#phone-prev').onclick=()=>{if(cardIndex>0)cardIndex--;update();};$('#phone-next').onclick=()=>{if(cardIndex<2)cardIndex++;update();};update();
    $('#story-explore').onclick=()=>{state.selected='zhengyang';navigate('explore');};
    $('#export-story').onclick=()=>{
      const paragraphs=cards.map(([title,copy],i)=>`<text x="48" y="${500+i*165}" fill="#d3b886" font-size="25">0${i+1} / ${title}</text>${(copy.match(/.{1,23}/gu)||[]).map((line,j)=>`<text x="48" y="${540+i*165+j*31}" fill="#c9d6d0" font-size="22">${escape(line)}</text>`).join('')}`).join('');
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="1160" viewBox="0 0 640 1160"><rect width="640" height="1160" fill="#0c2325"/><g font-family="Microsoft YaHei, sans-serif"><text x="48" y="65" fill="#d3b886" font-size="20">智护中轴 · 数启文脉 / 一分钟知识卡</text><text x="48" y="132" fill="#e7efea" font-size="48">正阳门</text><g transform="translate(66 142) scale(1.15)">${gateIllustration()}</g>${paragraphs}<path d="M48 1030H592" stroke="#496761"/><text x="48" y="1070" fill="#94aaa9" font-size="17">内容依据：北京市文物局、UNESCO 中轴线资料</text><text x="48" y="1103" fill="#94aaa9" font-size="17">原创插图 · 轴脉新声实践团队</text></g></svg>`;
      downloadFile(svg,'image/svg+xml;charset=utf-8','正阳门-一分钟知识卡.svg');toast('完整知识卡已生成，请在浏览器下载位置查看。');
    };
  }
  function renderYouth() {
    $('#main').innerHTML=`<section class="page narrative-page youth-page fade-in">${heading('CHAPTER 04 / 青年尝试','带着问题出发，用实际体验改进','导览原型已完成。现场调研与体验测试按以下计划开展。')}<div class="youth-process">${[
      ['FIND','发现理解难点','在正阳门、前门周边及古代建筑博物馆，观察游客怎样阅读和操作，记录具体的理解困难。'],
      ['BUILD','制作导览原型','制作节点地图、一分钟知识卡和城楼三维演示，把传统建筑知识变成可以操作的内容。'],
      ['TEST','观察使用过程','在永定门及南中轴公共空间邀请体验者完成任务，记录停顿、误操作和具体建议。']
    ].map(([label,title,copy],i)=>`<article><span class="process-number">0${i+1}</span><div class="eyebrow">${label}</div><h2>${title}</h2><p>${copy}</p></article>`).join('')}</div><div class="research-layout"><article class="route-summary"><h2>两次实践路线</h2>${data.routes.map((r,i)=>`<div><span>0${i+1} / ${r.name}</span><h3>${r.places}</h3><button class="route-link" data-youth-route="${i}">在地图查看路线 →</button></div>`).join('')}<p class="chapter-note">拟联系：北京中轴线遗产保护中心 · 拓展点：景山、大栅栏</p></article><article class="research-design"><div class="research-tabs" role="group" aria-label="研究工具"><button data-research="survey" aria-pressed="true">问卷设计</button><button data-research="observe" aria-pressed="false">观察与访谈</button><button data-research="test" aria-pressed="false">体验任务</button></div><div id="research-content"></div></article></div></section>`;
    const designs={
      survey:'<div class="sample-target"><strong>50—80 <small>份</small></strong><span>计划问卷总量<br>其中第一次现场问卷20—30份</span></div><h3>围绕三个具体问题</h3><ul class="research-list"><li>理解程度：看完展陈，能否说出一个知识点？</li><li>有效形式：图文、模型和数字互动，哪种更容易理解？</li><li>使用障碍：在哪里停顿，哪些操作需要帮助？</li></ul><p class="chapter-note">结合问卷回答、访谈摘录与观察记录，寻找具体的理解困难。</p>',
      observe:'<h2>同一张清单，记录具体现场</h2><div class="observation-tags">'+['遗产与环境','展陈标识','建筑模型','信息组织','游客操作','数字互动'].map(t=>`<span>${t}</span>`).join('')+'</div><h3>访谈从两个问题开始</h3><ul class="research-list"><li>哪些建筑知识最难理解？</li><li>更希望用什么形式获得信息？能举一个例子吗？</li></ul><p class="chapter-note">每条记录写清：时间、地点、观察对象与具体行为。</p>',
      test:'<h2>给体验者一个任务，观察真实操作</h2><ol class="research-list"><li>在地图找到正阳门，说出一个现场观察重点。</li><li>打开科技守护，展开城楼结构，再恢复原状。</li><li>读完手机知识卡，用自己的话解释城楼与箭楼。</li></ol><p>记录能否独立完成、在哪一步停顿、具体建议；用问题前后对照指导改版。</p><button class="secondary" id="try-task">自己试一遍 ↗</button>'
    };
    const showResearch=id=>{$('#research-content').innerHTML=designs[id];$$('[data-research]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.research===id));if($('#try-task'))$('#try-task').onclick=()=>{state.selected='zhengyang';navigate('explore');};};
    $$('[data-research]').forEach(b=>b.onclick=()=>showResearch(b.dataset.research));showResearch('survey');
    $$('[data-youth-route]').forEach(b=>b.onclick=()=>{navigate('explore');chooseRoute(b.dataset.youthRoute);});
  }
  function renderEpilogue() {
    $('#main').innerHTML=`<section class="page narrative-page epilogue-page fade-in"><div class="eyebrow">EPILOGUE / 回到课程</div><h1>让专业所学<br><em>回应真实需要</em></h1><p class="epilogue-lead">深入实施创新驱动发展战略 · 坚持科技自立自强</p><blockquote class="course-quote">“科技是第一生产力、人才是第一资源、创新是第一动力。”<cite>——党的二十大报告</cite></blockquote><div class="theory-links"><article><span>科技如何保护</span><h2>让变化有迹可循</h2><p>数字记录、连续观察与专业研判相互配合，为文化遗产的整体保护提供依据。</p></article><article><span>科技如何传播</span><h2>让知识更易理解</h2><p>以公众理解为出发点，用空间导览、立体观察和简明知识卡解释文化遗产。</p></article><article><span>青年如何参与</span><h2>用实践检验想法</h2><p>学习专业知识、亲手制作工具，在真实场景中发现问题，再根据体验意见改进。</p></article></div><div class="epilogue-end"><p><strong>下一步计划</strong>　带着原型走进现场，完成观察、问卷与体验任务，让每一次改进都有真实材料支撑。</p><button class="primary" id="restart-journey">重新点亮中轴 ↺</button></div></section>`;
    $('#restart-journey').onclick=()=>navigate('intro');
  }
  function renderExplore() {
    camera=[0,0,520,650];practicePoint=null;visited.add(state.selected);
    $('#main').innerHTML=`<section class="explore fade-in"><div class="hero"><div class="eyebrow">CHAPTER 01 / 读懂中轴</div><h1>沿一条轴线<br><em>读懂一座城</em></h1><p class="intro">从钟鼓楼走向永定门。点击一处建筑，让视线随中轴移动。</p><div class="stats"><div class="stat"><strong>7.8<small>km</small></strong><span>纵贯老城南北</span></div><div class="stat"><strong>15<small>处</small></strong><span>遗产构成要素</span></div></div><div class="section-label">时间里的中轴线</div><div class="periods" aria-label="历史时间轴">${Object.entries(periods).map(([id,p])=>`<button data-period="${id}" aria-pressed="${state.period===id}">${p[0]}</button>`).join('')}</div><p class="period-copy" id="period-copy"></p><button class="primary tour-button" id="tour">开启沿轴漫游<span>↗</span></button><div class="explore-progress" role="status"><strong id="visited-count">${visited.size}</strong> / 15 处已探索<div><i id="visited-bar" style="width:${visited.size/15*100}%"></i></div></div><div class="key-hint">← → 切换节点 · 空格漫游<br>PageUp / PageDown 翻章 · R 录屏</div></div><div class="map-panel"><div class="map-top"><strong>中轴线空间图谱</strong><span id="map-layer"></span></div><div id="map-holder">${mapMarkup()}</div><div class="map-tools"><button id="map-overview">全景 ↺</button><button id="map-focus">聚焦当前 ↗</button></div><div class="map-routes" aria-label="实践计划路线"><button data-map-route="none">遗产图谱</button><button data-map-route="0">实践一</button><button data-map-route="1">实践二</button></div><p id="route-caption" class="route-caption"></p><div class="map-note"><span>○ 遗产要素　◇ 实践点位　┄ 拓展路线</span><span>北 ↑</span></div></div><aside class="detail" aria-label="节点知识卡">${detailMarkup()}</aside><div class="node-strip" aria-label="全部遗产节点">${data.nodes.map(n=>`<button data-stop="${n.id}" aria-pressed="${state.selected===n.id}">${n.name}</button>`).join('')}</div></section>`;
    $$('.node').forEach(el=>{el.onclick=()=>selectNode(el.dataset.id,true);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectNode(el.dataset.id,true);}};});
    $$('[data-stop]').forEach(b=>b.onclick=()=>selectNode(b.dataset.stop,true));
    $$('[data-period]').forEach(b=>b.onclick=()=>{stopTour();route=null;practicePoint=null;state.period=b.dataset.period;updateHistory();updateRoute();$('.detail').innerHTML=detailMarkup();bindDetail();setCamera();});
    $$('[data-map-route]').forEach(b=>b.onclick=()=>chooseRoute(b.dataset.mapRoute));
    $('#map-overview').onclick=()=>{stopTour();setCamera();};
    $('#map-focus').onclick=()=>{stopTour();const point=currentMapPoint();setCamera(point.x,point.y,2.6);if(!reducedMotion()){$('#map-focus').disabled=true;$('#map-focus').textContent='聚焦中…';}};
    $('#tour').onclick=toggleTour;bindDetail();updateHistory();updateRoute();
  }
  function bindDetail() {
    if(practicePoint){$('#back-heritage').onclick=()=>selectNode(state.selected,true);return;}
    $('#previous').onclick=()=>moveNode(-1);$('#next').onclick=()=>moveNode(1);
    $('#bookmark').onclick=()=>{const id=state.selected;state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];save();$('.detail').innerHTML=detailMarkup();bindDetail();};
  }
  function selectNode(id,manual=false) {
    const from=current();if(manual)stopTour();practicePoint=null;state.selected=id;
    if(state.view!=='explore')return;
    const n=current();visited.add(id);
    $$('.node').forEach(el=>{el.classList.toggle('active',el.dataset.id===id);el.classList.toggle('visited',visited.has(el.dataset.id));el.setAttribute('aria-pressed',el.dataset.id===id);});
    $$('[data-stop]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.stop===id));
    if(from.id!==id){const d=`M${from.x*5.2} ${from.y*6.1}H260V${n.y*6.1}H${n.x*5.2}`;
      if(!exploredPaths.includes(d)){exploredPaths.push(d);$('#explored-layer').insertAdjacentHTML('beforeend',`<path class="explored-path" d="${d}"/>`);}
      $('#travel-layer').innerHTML=`<path class="travel-path" pathLength="1" d="${d}"/>`;
    }
    $('#visited-count').textContent=visited.size;$('#visited-bar').style.width=`${visited.size/15*100}%`;
    $('.detail').innerHTML=detailMarkup();bindDetail();setCamera(n.x*5.2,n.y*6.1,1.8);
  }
  function moveNode(delta) {selectNode(data.nodes[(current().index+delta+15)%15].id,true);}
  function stopTour() {clearInterval(state.tour);state.tour=null;const button=$('#tour');if(button)button.innerHTML='开启沿轴漫游<span>↗</span>';}
  function toggleTour() {
    if(state.tour){stopTour();return;}
    route=null;state.period='all';updateRoute();updateHistory();
    state.tourStep=Math.max(0,tourStops.indexOf(state.selected));selectNode(tourStops[state.tourStep]);
    state.tour=setInterval(()=>{state.tourStep++;if(state.tourStep>=tourStops.length){stopTour();return;}selectNode(tourStops[state.tourStep]);},12000);
    $('#tour').innerHTML='暂停沿轴漫游<span>Ⅱ</span>';
  }
  function heading(eyebrow,title,copy,notice='') {return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${copy}</p></div>${notice?`<div class="notice">${notice}</div>`:''}</div>`;}
  function renderProtect() {
    $('#main').innerHTML=`<section class="page protect-page fade-in">${heading('CHAPTER 02 / DIGITAL CONSERVATION','换个角度，读懂一座城楼','拖动观察正阳门城楼，展开屋檐与柱廊的层次，再了解数字记录和连续观察如何辅助保护。')}<div class="protection-layout three-protection"><article class="panel model-panel"><div class="section-label">正阳门城楼<span>屋檐 · 柱廊 · 台基</span></div><div class="model three-stage" id="model"><div class="model-fallback" id="model-fallback"><svg viewBox="-70 -130 140 190">${building('gate',state.explosion)}</svg></div><div class="model-corner"><span>正阳门城楼</span><small>灰瓦 · 绿琉璃剪边 · 朱红柱廊</small></div><span class="model-drag-hint">拖动旋转 / 滚轮或双指缩放</span></div><div class="model-toolbar"><div class="model-views" role="group" aria-label="建筑预设视角"><button data-model-view="perspective">斜向</button><button data-model-view="front">正面</button><button data-model-view="side">侧面</button><button data-model-view="top">俯看</button><button id="zoom-in" aria-label="放大模型">＋</button><button id="zoom-out" aria-label="缩小模型">－</button></div><div><button id="orbit-model" aria-pressed="false">自动环绕</button><button id="reset-model">复位 ↺</button></div></div><div class="range-row"><label for="explode">结构展开</label><input id="explode" type="range" min="0" max="100" value="${state.explosion}" step="1"><output for="explode" id="explode-value">${state.explosion}%</output></div><div class="model-bottom"><div class="switches"><button id="material" class="${state.scan?'':'active'}" aria-pressed="${!state.scan}">建筑材质</button><button id="scan" class="${state.scan?'active':''}" aria-pressed="${state.scan}">线框观察</button></div><span id="model-status" role="status">三维模型加载中</span></div></article><article class="panel"><div class="section-label">环境变化观察<span>模拟演示</span></div><h2>从数据，发现变化</h2><div id="sensor-content"></div><button class="secondary" id="scenario">${state.warning?'返回平稳曲线':'观察湿度上升'} ↗</button></article></div><div class="steps">${[['01','采集','通过专业设备与人工调查记录文物及环境信息。'],['02','建档','把结构、影像与历史资料整理为可追溯档案。'],['03','观察','比较同一对象在不同时间的变化，发现需关注的问题。'],['04','研判','由专业人员核查异常，结合现场情况决定措施。']].map(([n,t,p])=>`<article class="step"><b>${n}</b><h3>${t}</h3><p>${p}</p></article>`).join('')}</div></section>`;
    renderSensors();
    $('#explode').oninput=e=>{state.explosion=Number(e.target.value);$('#explode-value').textContent=`${state.explosion}%`;$('#model-fallback svg').innerHTML=building('gate',state.explosion);modelViewer?.setExplode(state.explosion/100);};
    const setScan=enabled=>{state.scan=enabled;$('#model').classList.toggle('scan-mode',enabled);$('#scan').classList.toggle('active',enabled);$('#material').classList.toggle('active',!enabled);$('#scan').setAttribute('aria-pressed',enabled);$('#material').setAttribute('aria-pressed',!enabled);modelViewer?.setWireframe(enabled);};
    $('#scan').onclick=()=>setScan(true);$('#material').onclick=()=>setScan(false);
    let orbiting=false;
    if(window.Axis3D)modelViewer=window.Axis3D.mount($('#model'),{
      onReady:()=>{$('#model-status').textContent='三维模型可操作';},
      onFailure:message=>{$('#model-status').textContent=message;$('#model-status').classList.add('model-warning');},
      onAutoRotate:enabled=>{orbiting=enabled;$('#orbit-model').setAttribute('aria-pressed',enabled);$('#orbit-model').textContent=enabled?'暂停环绕':'自动环绕';}
    });
    else $('#model-status').textContent='三维资源未加载，当前显示平面示意。';
    modelViewer?.setExplode(state.explosion/100);modelViewer?.setWireframe(state.scan);
    $$('[data-model-view]').forEach(b=>b.onclick=()=>modelViewer?.view(b.dataset.modelView));
    $('#zoom-in').onclick=()=>modelViewer?.zoom(1);$('#zoom-out').onclick=()=>modelViewer?.zoom(-1);
    $('#orbit-model').onclick=()=>modelViewer?.setAutoRotate(!orbiting);
    $('#reset-model').onclick=()=>{state.explosion=0;$('#explode').value=0;$('#explode-value').textContent='0%';$('#model-fallback svg').innerHTML=building('gate',0);setScan(false);modelViewer?.reset();};
    if(!modelViewer)$$('[data-model-view],#zoom-in,#zoom-out,#orbit-model,#reset-model').forEach(b=>b.disabled=true);
    $('#scenario').onclick=()=>{state.warning=!state.warning;renderSensors();$('#scenario').textContent=state.warning?'返回平稳曲线 ↗':'观察湿度上升 ↗';};
  }
  function renderSensors() {
    const values=state.warning?[48,48,49,47,50,49,51,54,60,65,70,73]:[48,49,48,47,49,50,48,49,51,50,49,48];
    const points=values.map((v,i)=>`${40+i*31},${135-(v-40)*2.8}`).join(' ');
    $('#sensor-content').innerHTML=`<div class="sensor-grid"><div><span>环境温度</span><strong>24.6<small> °C</small></strong></div><div><span>相对湿度</span><strong style="${state.warning?'color:#f2b27f':''}">${state.warning?'73':'48'}<small> %</small></strong></div><div><span>变化趋势</span><strong style="font-size:21px">${state.warning?'上升':'平稳'}</strong></div></div><svg class="chart" viewBox="0 0 410 170" role="img" aria-label="相对湿度曲线，${state.warning?'湿度逐渐升高至73%':'湿度在48%左右波动'}"><path d="M35 20H390M35 65H390M35 110H390" stroke="#294144" stroke-width="1"/><text x="0" y="23">80%</text><text x="0" y="68">64%</text><text x="0" y="113">48%</text><path d="M35 65H390" stroke="#d3b88677" stroke-dasharray="4 5"/><polyline points="${points}" fill="none" stroke="${state.warning?'#f2b27f':'#8fe4cf'}" stroke-width="2"/><path d="M${points.split(' ').join(' L')} L381 142H40Z" fill="${state.warning?'#f2b27f10':'#8fe4cf10'}"/><text x="35" y="164">09:00</text><text x="186" y="164">09:30</text><text x="350" y="164">10:00</text></svg><div class="sensor-state ${state.warning?'warning':''}"><span>${state.warning?'△ 湿度持续升高':'○ 数值相对平稳'}</span></div><p class="small sensor-explain">${state.warning?'对照天气与现场记录，寻找湿度持续上升的原因。':'连续记录环境数据，建立日常变化的比较基线。'}</p>`;
  }
  function renderPractice() {
    $('#main').innerHTML=`<section class="page fade-in">${heading('FIELDWORK & EVIDENCE','让每一次观察，有据可查','依据最终开题PPT整理两次实践计划。在这里录入小组真实观察、已获授权的访谈摘录和体验记录。','路线与样本量属于计划，页面不会将其计算为已完成成果。未导入一手材料前，不展示调研结论。')}<div class="routes">${data.routes.map((r,i)=>`<article class="panel"><div class="route-no">FIELDWORK / 0${i+1} · ${r.name}</div><h2 style="margin-top:14px">${r.title}</h2><div class="route-title">${r.places}</div><p class="small">${r.question}</p><ul class="task-list">${r.tasks.map(t=>`<li>${t}</li>`).join('')}</ul><button class="secondary" data-route="${i}">在地图查看起点 ↗</button></article>`).join('')}</div><div class="archive-head"><h2>小组实践记录 <span class="tag">${state.records.length} 条</span></h2><div class="actions"><button id="add-record">＋ 添加真实记录</button><button id="export">导出资料包</button><label class="upload-label" for="import">导入资料包</label><input class="hidden" type="file" id="import" accept=".json,application/json"></div></div><div class="${state.records.length?'evidence-list':'empty'}">${state.records.length?state.records.map((r,index)=>`<article class="evidence">${r.photo?`<img src="${r.photo}" alt="${escape(r.title)}" loading="lazy">`:''}<span class="tag">${escape(data.nodes.find(n=>n.id===r.node).name)} / ${escape(r.kind)}</span><h3>${escape(r.title)}</h3><p>${escape(r.note)}</p><small>${escape(displayDate(r.date))} · 用户录入材料</small><div style="margin-top:12px"><button class="secondary" data-edit="${index}">编辑记录</button></div></article>`).join(''):'还没有录入一手材料。<br>可先使用导览与技术演示，再添加实际调研资料。'}</div><p class="small" style="margin-top:17px">资料仅保存在当前浏览器。切换浏览器、启动地址或清理浏览器数据可能看不到原有记录，请及时导出备份。导入会合并不重复记录。</p><div class="archive-head"><h2>我的导览收藏</h2></div><div class="actions">${state.saved.length?state.saved.map(id=>`<button data-saved="${id}">${escape(data.nodes.find(n=>n.id===id).name)} ↗</button>`).join(''):'<span class="small">在知识卡点击 ☆，可收藏准备讲解的节点。</span>'}</div></section>`;
    $$('[data-route]').forEach(b=>b.onclick=()=>{state.selected=data.routes[Number(b.dataset.route)].nodes[0];navigate('explore');});
    $$('[data-saved]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.saved;navigate('explore');});
    $$('[data-edit]').forEach(b=>b.onclick=()=>recordDialog(Number(b.dataset.edit)));
    $('#add-record').onclick=()=>recordDialog();$('#export').onclick=exportArchive;$('#import').onchange=importArchive;
  }
  function recordDialog(index) {
    if(index===undefined && state.records.length>=60){toast('最多保存60条记录，请先导出备份。');return;}
    const r=state.records[index] || {title:'',node:state.selected,kind:'观察',note:'',photo:''};
    showDialog(`<h2 id="dialog-title">${index===undefined?'添加真实实践记录':'编辑实践记录'}</h2><p>只填写实际获取的材料。访谈和照片须已获得相应使用许可。</p><form id="record-form"><label class="form-field"><span>记录标题</span><input type="text" name="title" maxlength="80" value="${escape(r.title)}" required></label><label class="form-field"><span>关联节点</span><select name="node">${data.nodes.map(n=>`<option value="${n.id}" ${r.node===n.id?'selected':''}>${n.name}</option>`).join('')}</select></label><label class="form-field"><span>材料类型</span><select name="kind">${['观察','访谈摘录','问卷说明','体验记录'].map(k=>`<option ${r.kind===k?'selected':''}>${k}</option>`).join('')}</select></label><label class="form-field"><span>具体内容（请写清看到什么、来源是什么）</span><textarea name="note" maxlength="3000" required>${escape(r.note)}</textarea></label><label class="form-field"><span>照片（可选，JPG / PNG / WebP，不超过1MB${r.photo?'；未选择新文件则保留原图':''}）</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label><label class="checkbox"><input type="checkbox" required>确认这是真实材料，内容已经匿名化，并具有课程展示所需授权。</label><button class="primary" type="submit">保存记录 ↗</button></form>`);
    $('#record-form').onsubmit=async e=>{
      e.preventDefault();const form=e.currentTarget;const submit=$('button[type=submit]',form);submit.disabled=true;
      try {
        const values=new FormData(form);const file=values.get('photo');let photo=r.photo;
        if(file && file.size){if(file.size>1048576 || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('请选择1MB以内的 JPG、PNG 或 WebP 图片。');photo=await readFile(file,true);if(!validImage(photo)) throw Error('图片格式无法识别。');}
        const record={title:String(values.get('title')).trim(),node:values.get('node'),kind:values.get('kind'),note:String(values.get('note')).trim(),photo,date:r.date || new Date().toISOString()};
        if(!record.title || !record.note) throw Error('标题和内容不能只包含空格。');
        if(index===undefined) state.records.push(record);else state.records[index]=record;
        const persisted=save();$('#dialog').close();renderAdmin();toast(persisted?'记录已保存到当前浏览器。':'已保留在当前页面，请立即导出备份。');
      } catch(error){toast(error.message);submit.disabled=false;}
    };
  }
  function readFile(file,dataUrl=false) {return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('文件读取失败。'));dataUrl?r.readAsDataURL(file):r.readAsText(file);});}
  function exportArchive() {
    const blob=new Blob([JSON.stringify({schema:1,exportedAt:new Date().toISOString(),records:state.records,feedback:state.feedback,saved:state.saved},null,2)],{type:'application/json'});
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`数字中轴线-本机资料-${date}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('资料包已生成，请在浏览器下载位置查看。');
  }
  async function importArchive(event) {
    const file=event.target.files[0];if(!file) return;
    try {
      if(file.size>12582912) throw Error('文件超过12MB，请选择本项目导出的资料包。');
      const incoming=validateArchive(JSON.parse(await readFile(file)));
      const unique=(a,b)=>[...new Map([...a,...b].map(item=>[JSON.stringify(item),item])).values()];
      const merged={records:unique(state.records,incoming.records),feedback:unique(state.feedback,incoming.feedback),saved:[...new Set([...state.saved,...incoming.saved])]};
      validateArchive({schema:1,...merged});Object.assign(state,merged);const persisted=save();renderAdmin();toast(persisted?'资料已合并，原有记录已保留。':'资料已合并到当前页面，请导出备份。');
    } catch(error){toast(error instanceof SyntaxError?'文件不是有效的 JSON，请选择本项目导出的资料包。':error.message);event.target.value='';}
  }
  function renderCreate() {
    const count=state.feedback.length;const mean=count?(state.feedback.reduce((sum,f)=>sum+f.rating,0)/count).toFixed(1):'—';
    $('#main').innerHTML=`<section class="page fade-in">${heading('YOUTH INNOVATION','让专业所学，回应真实需要','从课程知识出发，观察公众理解文化遗产时遇到的问题，再通过轻量原型尝试改进体验。')}<div class="create-layout"><article><div class="eyebrow">课程案例 / 深入实施创新驱动发展战略</div><p class="question">科技如何守护并<br>“讲活”千年中轴？</p>${[['01','需求发现','观察游客如何阅读展陈、使用导览，记录具体的理解障碍，避免凭空假设需求。'],['02','原型设计','用数字地图、一分钟知识卡与建筑结构示意，把专业知识转成易读的内容。'],['03','真实体验','请体验者找到正阳门，读完知识卡，再操作建筑结构演示。记录完成情况与具体意见。'],['04','反馈改进','根据观察和意见修改内容及操作。用前后对照说明改进依据，保持结论与材料一致。']].map(([n,t,p])=>`<div class="principle"><b>${n}</b><div><h3>${t}</h3><p>${p}</p></div></div>`).join('')}</article><article class="panel"><h2>一次体验，一条建议</h2><p class="small">反馈仅保存在当前浏览器，可随资料包导出。本机多次提交可能来自同一人，不能据此计算独立参与人数或真实用户样本量。</p><form class="feedback" id="feedback-form"><fieldset style="border:0;padding:0;margin:20px 0 0"><legend class="small">你觉得理解内容是否容易？（1 很难，5 很容易）</legend><div class="rating">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="rating" value="${n}" required aria-label="${n}分"><span>${n}</span></label>`).join('')}</div></fieldset><label><span>哪个部分对你最有帮助？</span><select name="useful">${['数字地图','一分钟知识卡','建筑结构演示','数字保护流程'].map(t=>`<option>${t}</option>`).join('')}</select></label><label><span>还有哪里看不懂，或希望怎样改进？</span><textarea name="comment" maxlength="1000" placeholder="请给一个具体例子，可不填写。"></textarea></label><label class="checkbox"><input type="checkbox" required>我同意将这条匿名反馈用于课程实践分析。</label><button class="primary" type="submit">保存本机反馈 ↗</button></form><div class="feedback-summary">本机保存 <strong>${count}</strong> 条反馈　理解容易度均分 <strong>${mean}</strong> / 5<br>该统计包含本机录入或导入的反馈，使用前请核实来源及重复情况。<br><button id="export-feedback" style="color:var(--mint);padding:9px 0">导出本机资料包 ↗</button></div></article></div></section>`;
    $('#feedback-form').onsubmit=e=>{e.preventDefault();if(state.feedback.length>=1000){toast('已达到本地反馈容量，请先导出备份。');return;}const f=new FormData(e.currentTarget);state.feedback.push({rating:Number(f.get('rating')),useful:f.get('useful'),comment:String(f.get('comment')).trim(),date:new Date().toISOString()});const persisted=save();renderAdmin();toast(persisted?'谢谢，反馈已保存在当前浏览器。':'反馈已保留在当前页面，请立即导出备份。');};
    $('#export-feedback').onclick=exportArchive;
  }
  function renderAdmin() {
    if(state.adminTab==='feedback') renderCreate();else renderPractice();
    $('#main').insertAdjacentHTML('afterbegin',`<section class="admin-bar" aria-label="管理模式"><div><strong>管理模式</strong><span>本机资料编辑 · 不用于录屏展示</span></div><div><button data-admin-tab="records" class="${state.adminTab==='records'?'active':''}">实践记录与备份</button><button data-admin-tab="feedback" class="${state.adminTab==='feedback'?'active':''}">体验反馈</button><button id="exit-admin">返回展厅 ↗</button></div></section>`);
    $$('[data-admin-tab]').forEach(b=>b.onclick=()=>{state.adminTab=b.dataset.adminTab;renderAdmin();});
    $('#exit-admin').onclick=()=>navigate(state.returnView);
  }
  function renderChapterRail() {
    const index=chapters.findIndex(c=>c.id===state.view);const rail=$('#chapter-rail');
    rail.hidden=index<0;if(index<0){rail.innerHTML='';return;}
    const chapter=chapters[index];const next=chapters[index+1];
    rail.innerHTML=`<div class="chapter-position"><span>${String(index+1).padStart(2,'0')} <small>/ 06</small></span><div><small>${chapter.number}</small><strong>${chapter.title}</strong></div></div><div class="chapter-dots" aria-label="当前第${index+1}章，共6章">${chapters.map((c,i)=>`<button data-chapter="${c.id}" class="${i===index?'active':''}" aria-label="${c.number}：${c.title}" ${i===index?'aria-current="step"':''}><span></span></button>`).join('')}</div><div class="rail-utilities"><button id="rail-sources">资料说明 ↗</button><button id="recording-toggle" aria-pressed="${document.body.classList.contains('recording')}">${document.body.classList.contains('recording')?'退出录屏界面':'录屏界面 R'}</button></div><div class="chapter-controls"><button id="previous-chapter" ${index===0?'disabled':''}>← 上一章</button><button id="next-chapter" ${next?'':'disabled'}>${next?`${next.number} · ${next.title} →`:'展厅讲解结束'}</button></div>`;
    $$('[data-chapter]',rail).forEach(b=>b.onclick=()=>navigate(b.dataset.chapter));
    $('#rail-sources').onclick=()=>$('#sources').click();$('#recording-toggle').onclick=toggleRecording;
    $('#previous-chapter').onclick=()=>{if(index>0)navigate(chapters[index-1].id);};
    $('#next-chapter').onclick=()=>{if(next)navigate(next.id);};
  }
  function navigate(view,updateHash=true) {
    if(view==='create') view='practice';
    if(!chapters.some(c=>c.id===view) && view!=='admin') view='intro';
    if(view==='admin' && state.view!=='admin') state.returnView=state.view;
    modelViewer?.dispose();modelViewer=null;
    stopIntro();stopCamera();if(view!==state.view) stopTour();state.view=view;
    document.body.classList.toggle('admin-mode',view==='admin');
    document.body.classList.toggle('opening-view',view==='intro');
    $$('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    ({intro:renderIntro,explore:renderExplore,protect:renderProtect,story:renderStory,practice:renderYouth,epilogue:renderEpilogue,admin:renderAdmin})[view]();
    renderChapterRail();
    document.title=view==='admin'?'管理模式 · 智护中轴':`${chapters.find(c=>c.id===view).title} · 智护中轴`;
    if(updateHash && location.hash!==`#${view}`) history.replaceState(null,'',`#${view}`);
    window.scrollTo(0,0);$('#main').scrollTop=0;
    $('#main').focus({preventScroll:true});
  }
  $$('[data-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.view));
  $('.brand').onclick=e=>{e.preventDefault();navigate('intro');};
  $('#replay-intro').onclick=()=>navigate('intro');
  $('.skip').onclick=e=>{e.preventDefault();$('#main').focus();$('#main').scrollIntoView();};
  window.addEventListener('hashchange',()=>navigate(location.hash.slice(1),false));
  async function fullscreen() {
    try {if(document.fullscreenElement) await document.exitFullscreen();else if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();else toast('此浏览器不支持网页全屏，可按 F11。');}
    catch {toast('无法切换网页全屏，可使用浏览器 F11。');}
  }
  function toggleRecording() {
    const enabled=document.body.classList.toggle('recording');
    const button=$('#recording-toggle');if(button){button.setAttribute('aria-pressed',enabled);button.textContent=enabled?'退出录屏界面':'录屏界面 R';}
  }
  $('#fullscreen').onclick=fullscreen;
  document.addEventListener('fullscreenchange',()=>{$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'切换全屏');});
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey || e.altKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || $('#dialog').open) return;
    if(e.shiftKey && e.key.toLowerCase()==='m'){e.preventDefault();navigate(state.view==='admin'?state.returnView:'admin');return;}
    if(e.key==='PageDown' || e.key==='PageUp') {
      const index=chapters.findIndex(c=>c.id===state.view);const next=index+(e.key==='PageDown'?1:-1);
      if(index>=0 && chapters[next]){e.preventDefault();navigate(chapters[next].id);}return;
    }
    if(e.key.toLowerCase()==='f'){e.preventDefault();fullscreen();}
    if(e.key.toLowerCase()==='r'){e.preventDefault();toggleRecording();}
    if(state.view==='explore') {
      if(e.key==='ArrowLeft'){e.preventDefault();moveNode(-1);}
      if(e.key==='ArrowRight'){e.preventDefault();moveNode(1);}
      if(e.key===' ' && !e.target.closest('button,a,[role=button]')){e.preventDefault();toggleTour();}
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden && state.tour){stopTour();toast('页面进入后台，自动导览已暂停。');}});
  $('#sources').onclick=()=>showDialog(`<h2 id="dialog-title">资料来源与展示说明</h2><p>项目：智护中轴 · 数启文脉。由轴脉新声实践团队课程开题材料整理，服务于“科技创新行”主题展示。</p><ul>${data.sources.map(s=>`<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a><br>${escape(s.use)}</li>`).join('')}</ul><p>资料于2026年10月27—28日核对。课程依据采用用户提供的最终开题PPT。导览原型已完成，现场调研与体验测试属于后续计划。问卷总目标50—80份，其中第一次现场20—30份；页面不预置问卷结果、访谈或实地照片。</p><p>中轴线长度、15个遗产构成要素与入遗时间依据官方资料。地图位置、建筑图形、历史图层均为讲解示意，不是精确地图、历史复原或官方数字孪生。历史时间轴提示空间演变，底图始终采用当前节点位置，早期轴段只表示起源区位，不复原各时代建筑。正阳门三维样板依据公开照片和建筑说明制作，部件展开用于讲解，不代表真实拆卸工序。</p><p>数字保护页面的温湿度与曲线均为预设模拟数据，不连接实时设备，不提供人工智能识别、真实预警或文物风险判断；阈值不属于保护标准。问卷采用便利样本，以描述性统计为主，不外推为整体人群。访谈与拍摄先取得同意，整理材料时匿名化。遗产保护中心为拟联系单位，参访以实际接待为准；景山与大栅栏来自较早方案，作为拓展点。用户录入的记录、照片和反馈仅保存在本机浏览器，导出的资料包可能含这些内容，请按课程用途保管。</p>`);
  navigate(location.hash.slice(1) || 'intro');
  if(!storageAvailable) toast('原有本机资料无法读取或浏览器存储不可用。请检查备份，并及时导出本次记录。');
})();
