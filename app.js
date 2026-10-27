'use strict';
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const data = window.AXIS;
  const storageKey = 'central-axis-course-v1';
  const state = {view:'explore',selected:'zhengyang',period:'all',tour:null,tourStep:0,explosion:0,scan:false,warning:false,records:[],feedback:[],saved:[]};
  const tourStops = ['bell','hill','palace','zhengyang','xiannong','yongding'];
  const periods = {
    all:['全景','遗产整体','从钟鼓楼到永定门，建筑、道路与公共空间共同构成中轴线。'],
    yuan:['元代','城市轴线的起源','中轴线始建于13世纪。此视图强调钟鼓楼、万宁桥所关联的历史线索，不复原元代建筑。'],
    ming:['明代','都城格局逐步形成','中轴线在16世纪形成。此视图弱化近现代公共空间，用于讲解城市格局的发展。'],
    qing:['清代','延续与完善','中轴线的建筑序列与礼制空间延续发展。图形仅展示叙事重点，不代表清代实测地图。'],
    today:['当代','保护与城市生活','2024年列入《世界遗产名录》。今天，中轴线也承载着公众参与和城市日常。']
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
    let grids = '';
    for(let i=0;i<12;i++) {const y=35+i*47;grids += `<path class="gridline" d="M35 ${y}H485"/>`;}
    for(let i=0;i<10;i++) grids += `<path class="gridline" d="M${35+i*50} 25V610"/>`;
    let blocks = '';
    for(let row=0;row<11;row++) for(let col=0;col<6;col++) {
      if(col === 2 || col === 3 || (row===8 && (col===0 || col===5))) continue;
      const x=55+col*65+(row%2)*8, y=52+row*48;
      blocks += `<path d="M${x} ${y}h38v24h-38Z" fill="#173332" stroke="#31504a" stroke-width=".5" opacity="${.3+(row%3)*.08}"/>`;
    }
    return `<svg class="map period-${state.period}" viewBox="0 0 520 650" aria-label="北京中轴线15个遗产构成要素空间示意图">${grids}<path class="map-land" d="M100 40 424 40 438 240 452 415 408 607H103L65 477 88 278Z"/>${blocks}<path d="M100 119Q144 90 174 128T249 132" fill="none" stroke="#3f7d7955" stroke-width="9"/><path d="M70 345H450M110 455H410" fill="none" stroke="#385452" stroke-width="7"/><path class="axis-glow" d="M260 35V612"/><path class="axis-line" d="M260 35V612"/><path d="M${31*5.2} ${46*6.1}H${68*5.2}M${24*5.2} ${84*6.1}H${77*5.2}" fill="none" stroke="#7e99744a" stroke-dasharray="3 4"/><path class="map-scan" d="M90 290H435"/>
      ${data.nodes.map(n=>{
        const x=n.x*5.2,y=n.y*6.1,side=n.x===50?(n.index%2===0?-1:1):(n.x<50?-1:1);
        const dx=side*29;return `<g role="button" tabindex="0" aria-label="查看${n.name}" aria-pressed="${state.selected===n.id}" data-id="${n.id}" class="node ${state.selected===n.id?'active':''}" transform="translate(${x} ${y})"><circle r="23" fill="transparent"/><g transform="translate(0 -12) scale(${n.id==='palace'?.67:.43})">${building(n.shape)}</g><circle class="node-circle" r="3"/><path d="M${side*7} 0H${dx-side*5}" stroke="currentColor" stroke-width=".6"/><text class="node-label" x="${dx}" y="4" text-anchor="${side<0?'end':'start'}">${n.name==='天安门广场及建筑群'?'广场及建筑群':escape(n.name)}</text></g>`;
      }).join('')}</svg>`;
  }
  function detailMarkup() {
    const n=current();return `<div class="detail-top"><span>一分钟知识卡</span><span>HERITAGE / ${String(n.index+1).padStart(2,'0')}</span></div><div class="node-number">${escape(n.type)} / ${String(n.index+1).padStart(2,'0')}</div><h2>${escape(n.name)}</h2><p class="detail-subtitle">${escape(n.subtitle)}</p><div class="building-view"><svg viewBox="-60 -65 120 120" aria-label="${escape(n.name)}建筑示意">${building(n.shape)}</svg></div><div class="knowledge"><h3>01 / 是什么</h3><p>${escape(n.what)}</p></div><div class="knowledge"><h3>02 / 现场看什么</h3><p>${escape(n.look)}</p></div><div class="knowledge"><h3>03 / 数字技术能做什么</h3><p>${escape(n.digital)}</p></div><div class="node-nav"><button id="previous" aria-label="上一个节点">← 上一站</button><button id="next" aria-label="下一个节点">下一站 →</button><button class="bookmark" id="bookmark" aria-label="${state.saved.includes(n.id)?'取消收藏':'收藏节点'}" aria-pressed="${state.saved.includes(n.id)}">${state.saved.includes(n.id)?'★':'☆'}</button></div><div class="tour-progress" aria-hidden="true"><div style="width:${(n.index+1)/15*100}%"></div></div>`;
  }
  function renderExplore() {
    $('#main').innerHTML=`<section class="explore fade-in"><div class="hero"><div class="eyebrow">BEIJING CENTRAL AXIS</div><h1>一条中轴<br><em>读懂一座城</em></h1><div class="hero-caption">智护中轴 · 数启文脉</div><p class="intro">让古老的城市秩序，在数字世界中被看见、被理解。沿着中轴线，探索科技如何守护并讲活文化遗产。</p><div class="stats"><div class="stat"><strong>7.8<small>km</small></strong><span>纵贯老城南北</span></div><div class="stat"><strong>15<small>处</small></strong><span>遗产构成要素</span></div><div class="stat"><strong>2024</strong><span>列入世界遗产名录</span></div></div><div class="section-label">时间里的中轴线<span>HISTORICAL LAYERS</span></div><div class="periods" aria-label="历史叙事图层">${Object.entries(periods).map(([id,p])=>`<button data-period="${id}" class="${state.period===id?'active':''}" aria-pressed="${state.period===id}">${p[0]}</button>`).join('')}</div><p class="period-copy" id="period-copy">${periods[state.period][2]}</p><button class="primary tour-button" id="tour">${state.tour?'暂停自动导览':'开启自动导览'}<span>${state.tour?'Ⅱ':'↗'}</span></button><div class="key-hint">6站导览，每站12秒。空格暂停 / 继续<br>← → 切换节点 · F 全屏 · R 录屏界面</div></div><div class="map-panel"><div class="map-top"><strong>中轴线空间图谱</strong><span id="map-layer">${periods[state.period][1]}</span></div><div id="map-holder">${mapMarkup()}</div><div class="compass">N<span>↑</span>S</div><div class="map-note"><span>点击建筑，解锁中轴记忆</span><span>空间与建筑均为示意</span></div></div><aside class="detail" aria-label="节点知识卡">${detailMarkup()}</aside></section>`;
    $$('.node').forEach(el=>{el.addEventListener('click',()=>selectNode(el.dataset.id,true));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectNode(el.dataset.id,true);}});});
    bindDetail();
    $$('[data-period]').forEach(button=>button.addEventListener('click',()=>{
      state.period=button.dataset.period;
      $$('[data-period]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});
      $('.map').setAttribute('class',`map period-${state.period}`);$('#period-copy').textContent=periods[state.period][2];$('#map-layer').textContent=periods[state.period][1];
    }));
    $('#tour').addEventListener('click',toggleTour);
  }
  function bindDetail() {
    $('#previous').onclick=()=>moveNode(-1);$('#next').onclick=()=>moveNode(1);
    $('#bookmark').onclick=()=>{const id=state.selected;state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];save();$('.detail').innerHTML=detailMarkup();bindDetail();toast(state.saved.includes(id)?'已收藏该节点，可在实践档案查看。':'已取消收藏。');};
  }
  function selectNode(id, manual=false) {
    if(manual) stopTour();state.selected=id;
    if(state.view!=='explore') return;
    $$('.node').forEach(el=>{el.classList.toggle('active',el.dataset.id===id);el.setAttribute('aria-pressed',el.dataset.id===id);});
    $('.detail').innerHTML=detailMarkup();bindDetail();
  }
  function moveNode(delta) {selectNode(data.nodes[(current().index+delta+15)%15].id,true);}
  function stopTour() {clearInterval(state.tour);state.tour=null;const button=$('#tour');if(button) button.innerHTML='开启自动导览<span>↗</span>';}
  function toggleTour() {
    if(state.tour){stopTour();toast('自动导览已暂停。');return;}
    state.tourStep=Math.max(0,tourStops.indexOf(state.selected));selectNode(tourStops[state.tourStep]);
    state.tour=setInterval(()=>{state.tourStep++;if(state.tourStep>=tourStops.length){stopTour();toast('六站导览已结束。可以继续自由探索。');return;}selectNode(tourStops[state.tourStep]);},12000);
    $('#tour').innerHTML='暂停自动导览<span>Ⅱ</span>';toast('自动导览已开启，每12秒切换一站。');
  }
  function heading(eyebrow,title,copy,notice='') {return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${copy}</p></div>${notice?`<div class="notice">${notice}</div>`:''}</div>`;}
  function renderProtect() {
    $('#main').innerHTML=`<section class="page fade-in">${heading('DIGITAL CONSERVATION','科技，让保护更可理解','从建筑结构到数据观察，用交互演示理解数字文化遗产保护的基本思路。','本页为教学演示。模型为原创结构示意，监测曲线为预设模拟数据，未连接文物监测设备。')}<div class="protection-layout"><article class="panel"><div class="section-label">建筑结构解读<span>SCHEMATIC MODEL</span></div><h2>一座城门的层次</h2><p class="small">拖动滑块分开屋顶、楼身与台基，观察构造关系。</p><div class="model ${state.scan?'scan-mode':''}" id="model"><svg viewBox="-70 -130 140 190">${building('gate',state.explosion)}</svg><div class="model-tag">屋顶 / 楼身 / 台基 · 非精确文物模型</div></div><div class="range-row"><label for="explode">结构展开</label><input id="explode" type="range" min="0" max="100" value="${state.explosion}" step="1"><output for="explode" id="explode-value">${state.explosion}%</output></div><div class="switches"><button id="material" class="${state.scan?'':'active'}" aria-pressed="${!state.scan}">形态示意</button><button id="scan" class="${state.scan?'active':''}" aria-pressed="${state.scan}">线框观察</button></div><p class="small">数字模型可以帮助记录和解释建筑。实际保护仍需专业测绘、长期观测与专家判断。</p></article><article class="panel"><div class="section-label">数字监测的思路<span>SIMULATED DATA</span></div><h2>从数据，发现变化</h2><div id="sensor-content"></div><button class="secondary" id="scenario">${state.warning?'恢复常态情景':'切换异常情景'} ↗</button><p class="small" style="margin-top:15px">情景阈值仅用于说明提示机制，不能作为文物保护标准或风险结论。</p></article></div><div class="steps">${[['01','采集','通过专业设备与人工调查记录文物及环境信息。'],['02','建档','把结构、影像与历史资料整理为可追溯档案。'],['03','观察','比较同一对象在不同时间的变化，发现需关注的问题。'],['04','研判','由专业人员核查异常，结合现场情况决定措施。']].map(([n,t,p])=>`<article class="step"><b>${n}</b><h3>${t}</h3><p>${p}</p></article>`).join('')}</div></section>`;
    renderSensors();
    $('#explode').oninput=e=>{state.explosion=Number(e.target.value);$('#explode-value').textContent=`${state.explosion}%`;$('#model svg').innerHTML=building('gate',state.explosion);};
    const setScan=enabled=>{state.scan=enabled;$('#model').classList.toggle('scan-mode',enabled);$('#scan').classList.toggle('active',enabled);$('#material').classList.toggle('active',!enabled);$('#scan').setAttribute('aria-pressed',enabled);$('#material').setAttribute('aria-pressed',!enabled);};
    $('#scan').onclick=()=>setScan(true);$('#material').onclick=()=>setScan(false);
    $('#scenario').onclick=()=>{state.warning=!state.warning;renderSensors();$('#scenario').textContent=state.warning?'恢复常态情景 ↗':'切换异常情景 ↗';};
  }
  function renderSensors() {
    const values=state.warning?[48,48,49,47,50,49,51,54,60,65,70,73]:[48,49,48,47,49,50,48,49,51,50,49,48];
    const points=values.map((v,i)=>`${40+i*31},${135-(v-40)*2.8}`).join(' ');
    $('#sensor-content').innerHTML=`<div class="sensor-grid"><div><span>环境温度</span><strong>24.6<small> °C</small></strong><small>模拟读数</small></div><div><span>相对湿度</span><strong style="${state.warning?'color:#f2b27f':''}">${state.warning?'73':'48'}<small> %</small></strong><small>模拟读数</small></div><div><span>观察情景</span><strong style="font-size:21px">${state.warning?'需关注':'常态'}</strong><small>无真实预警</small></div></div><svg class="chart" viewBox="0 0 410 170" role="img" aria-label="模拟相对湿度曲线，${state.warning?'湿度逐渐升高至73%':'湿度在48%左右波动'}"><path d="M35 20H390M35 65H390M35 110H390" stroke="#294144" stroke-width="1"/><text x="0" y="23">80%</text><text x="0" y="68">64%</text><text x="0" y="113">48%</text><path d="M35 65H390" stroke="#d3b88677" stroke-dasharray="4 5"/><polyline points="${points}" fill="none" stroke="${state.warning?'#f2b27f':'#8fe4cf'}" stroke-width="2"/><path d="M${points.split(' ').join(' L')} L381 142H40Z" fill="${state.warning?'#f2b27f10':'#8fe4cf10'}"/><text x="35" y="164">09:00</text><text x="186" y="164">09:30</text><text x="350" y="164">10:00</text></svg><div class="sensor-state ${state.warning?'warning':''}"><span>${state.warning?'△ 模拟提示：湿度持续升高':'○ 模拟情景：数值相对平稳'}</span><span>预设情景</span></div><p class="small sensor-explain">${state.warning?'曲线变化触发情景提示。真实应用中，应先核查设备、天气及现场记录，再由专业人员判断。':'连续记录有助于建立比较基线。单次读数无法直接说明文物健康状况。'}</p>`;
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
        const persisted=save();$('#dialog').close();renderPractice();toast(persisted?'记录已保存到当前浏览器。':'已保留在当前页面，请立即导出备份。');
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
      validateArchive({schema:1,...merged});Object.assign(state,merged);const persisted=save();renderPractice();toast(persisted?'资料已合并，原有记录已保留。':'资料已合并到当前页面，请导出备份。');
    } catch(error){toast(error instanceof SyntaxError?'文件不是有效的 JSON，请选择本项目导出的资料包。':error.message);event.target.value='';}
  }
  function renderCreate() {
    const count=state.feedback.length;const mean=count?(state.feedback.reduce((sum,f)=>sum+f.rating,0)/count).toFixed(1):'—';
    $('#main').innerHTML=`<section class="page fade-in">${heading('YOUTH INNOVATION','让专业所学，回应真实需要','从课程知识出发，观察公众理解文化遗产时遇到的问题，再通过轻量原型尝试改进体验。')}<div class="create-layout"><article><div class="eyebrow">课程案例 / 深入实施创新驱动发展战略</div><p class="question">科技如何守护并<br>“讲活”千年中轴？</p>${[['01','需求发现','观察游客如何阅读展陈、使用导览，记录具体的理解障碍，避免凭空假设需求。'],['02','原型设计','用数字地图、一分钟知识卡与建筑结构示意，把专业知识转成易读的内容。'],['03','真实体验','请体验者找到正阳门，读完知识卡，再操作建筑结构演示。记录完成情况与具体意见。'],['04','反馈改进','根据观察和意见修改内容及操作。用前后对照说明改进依据，保持结论与材料一致。']].map(([n,t,p])=>`<div class="principle"><b>${n}</b><div><h3>${t}</h3><p>${p}</p></div></div>`).join('')}</article><article class="panel"><h2>一次体验，一条建议</h2><p class="small">反馈仅保存在当前浏览器，可随资料包导出。本机多次提交可能来自同一人，不能据此计算独立参与人数或真实用户样本量。</p><form class="feedback" id="feedback-form"><fieldset style="border:0;padding:0;margin:20px 0 0"><legend class="small">你觉得理解内容是否容易？（1 很难，5 很容易）</legend><div class="rating">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="rating" value="${n}" required aria-label="${n}分"><span>${n}</span></label>`).join('')}</div></fieldset><label><span>哪个部分对你最有帮助？</span><select name="useful">${['数字地图','一分钟知识卡','建筑结构演示','数字保护流程'].map(t=>`<option>${t}</option>`).join('')}</select></label><label><span>还有哪里看不懂，或希望怎样改进？</span><textarea name="comment" maxlength="1000" placeholder="请给一个具体例子，可不填写。"></textarea></label><label class="checkbox"><input type="checkbox" required>我同意将这条匿名反馈用于课程实践分析。</label><button class="primary" type="submit">保存本机反馈 ↗</button></form><div class="feedback-summary">本机保存 <strong>${count}</strong> 条反馈　理解容易度均分 <strong>${mean}</strong> / 5<br>该统计包含本机录入或导入的反馈，使用前请核实来源及重复情况。<br><button id="export-feedback" style="color:var(--mint);padding:9px 0">导出本机资料包 ↗</button></div></article></div></section>`;
    $('#feedback-form').onsubmit=e=>{e.preventDefault();if(state.feedback.length>=1000){toast('已达到本地反馈容量，请先导出备份。');return;}const f=new FormData(e.currentTarget);state.feedback.push({rating:Number(f.get('rating')),useful:f.get('useful'),comment:String(f.get('comment')).trim(),date:new Date().toISOString()});const persisted=save();renderCreate();toast(persisted?'谢谢，反馈已保存在当前浏览器。':'反馈已保留在当前页面，请立即导出备份。');};
    $('#export-feedback').onclick=exportArchive;
  }
  function navigate(view,updateHash=true) {
    if(!['explore','protect','practice','create'].includes(view)) view='explore';
    if(view!==state.view) stopTour();state.view=view;
    $$('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    ({explore:renderExplore,protect:renderProtect,practice:renderPractice,create:renderCreate})[view]();
    if(updateHash && location.hash!==`#${view}`) history.replaceState(null,'',`#${view}`);
    window.scrollTo(0,0);
  }
  $$('[data-view]').forEach(b=>b.onclick=()=>navigate(b.dataset.view));
  $('.brand').onclick=e=>{e.preventDefault();navigate('explore');};
  $('.skip').onclick=e=>{e.preventDefault();$('#main').focus();$('#main').scrollIntoView();};
  window.addEventListener('hashchange',()=>navigate(location.hash.slice(1),false));
  async function fullscreen() {
    try {if(document.fullscreenElement) await document.exitFullscreen();else if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();else toast('此浏览器不支持网页全屏，可按 F11。');}
    catch {toast('无法切换网页全屏，可使用浏览器 F11。');}
  }
  $('#fullscreen').onclick=fullscreen;
  document.addEventListener('fullscreenchange',()=>{$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'切换全屏');});
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey || e.altKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || $('#dialog').open) return;
    if(e.key.toLowerCase()==='f'){e.preventDefault();fullscreen();}
    if(e.key.toLowerCase()==='r'){document.body.classList.toggle('recording');toast(document.body.classList.contains('recording')?'录屏界面已开启：弱化页眉与页脚。页面不会自动录制。':'已恢复普通界面。');}
    if(state.view==='explore') {
      if(e.key==='ArrowLeft'){e.preventDefault();moveNode(-1);}
      if(e.key==='ArrowRight'){e.preventDefault();moveNode(1);}
      if(e.key===' ' && !e.target.closest('button,a,[role=button]')){e.preventDefault();toggleTour();}
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden && state.tour){stopTour();toast('页面进入后台，自动导览已暂停。');}});
  $('#sources').onclick=()=>showDialog(`<h2 id="dialog-title">资料来源与展示说明</h2><p>项目：智护中轴 · 数启文脉。由轴脉新声实践团队课程开题材料整理，服务于“科技创新行”主题展示。</p><ul>${data.sources.map(s=>`<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a><br>${escape(s.use)}</li>`).join('')}</ul><p>以上网页于2026年10月27日核对。课程依据采用用户提供的最终开题PPT。实践路线与目标为计划，尚不能视为已完成成果。</p><p>中轴线长度、15个遗产构成要素与入遗时间依据官方资料。地图位置、建筑图形、历史图层均为讲解示意，不是精确地图、历史复原或官方数字孪生。各节点“数字技术能做什么”为原型设计思路，不代表该节点已部署相应技术。</p><p>数字保护页面使用模拟情景，无实时设备、人工智能识别或真实预警。用户录入的记录、照片和反馈仅保存在本机浏览器，导出的资料包可能含这些内容，请按课程用途保管。</p>`);
  navigate(location.hash.slice(1) || 'explore');
  if(!storageAvailable) toast('原有本机资料无法读取或浏览器存储不可用。请检查备份，并及时导出本次记录。');
})();
