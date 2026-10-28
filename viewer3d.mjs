import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createZhengyangmen} from './models/zhengyangmen.mjs';

export function mount(container,options={}) {
  let renderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}
  catch {options.onFailure?.('此浏览器无法显示三维画面，当前保留平面示意。');return null;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  const canvas=renderer.domElement;canvas.className='three-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','正阳门城楼三维模型。可拖动旋转、滚轮缩放，也可使用下方视角按钮。');canvas.tabIndex=0;container.appendChild(canvas);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b2022);scene.fog=new THREE.Fog(0x0b2022,180,370);
  const camera=new THREE.PerspectiveCamera(36,1,.2,600);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;controls.minDistance=58;controls.maxDistance=220;controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=.17;controls.autoRotateSpeed=.75;controls.rotateSpeed=.6;controls.zoomSpeed=.8;
  const hemisphere=new THREE.HemisphereLight(0xd3eeea,0x334733,2.4);scene.add(hemisphere);
  const key=new THREE.DirectionalLight(0xffe5bd,3.5);key.position.set(35,75,45);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:.5,far:200});key.shadow.normalBias=.08;key.shadow.bias=-.00025;scene.add(key);
  const rim=new THREE.DirectionalLight(0x8dcbbb,2);rim.position.set(-45,38,-50);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xffd8ad,1.1);fill.position.set(-60,25,60);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.CylinderGeometry(47,47.8,.65,96),new THREE.MeshStandardMaterial({color:0x193638,roughness:.9,metalness:.12}));ground.position.y=-.5;ground.receiveShadow=true;scene.add(ground);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(46.8,.07,5,160),new THREE.MeshStandardMaterial({color:0xb8a273,emissive:0x695532,emissiveIntensity:.35,metalness:.6,roughness:.5}));ring.rotation.x=Math.PI/2;ring.position.y=-.13;scene.add(ring);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshStandardMaterial({color:0x0b2022,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.84;floor.receiveShadow=true;scene.add(floor);
  for(let i=0;i<16;i++) {
    const a=i/16*Math.PI*2,mark=new THREE.Mesh(new THREE.BoxGeometry(.12,.04,i%4===0?2.2:.9),new THREE.MeshBasicMaterial({color:0x66817a}));mark.position.set(Math.sin(a)*44.7,-.13,Math.cos(a)*44.7);mark.rotation.y=a;scene.add(mark);
  }
  let model=null,parts=[],desiredExplosion=0,explosion=0,wireframe=false,disposed=false,visible=true,frame=0,last=0,tween=null,preset='perspective';
  const initialMaterials=new Map();
  const visibility=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;},{threshold:0});visibility.observe(container);
  const resize=new ResizeObserver(()=>{if(disposed)return;const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);if(!model)return;fit(preset,true);});resize.observe(container);
  function targetY(){return 20+desiredExplosion*9;}
  function fit(view,immediate=false) {
    preset=view;const portrait=Math.max(1,1/camera.aspect);const distance=105*Math.min(2.3,portrait);const ty=targetY();
    const positions={front:[0,ty+9,distance*1.12],side:[distance*1.12,ty+10,0],top:[distance*.08,ty+distance*.95,distance*.3],perspective:[distance*.76,ty+distance*.36,distance*.92]};
    const next=new THREE.Vector3(...(positions[view]||positions.perspective)),target=new THREE.Vector3(0,ty,0);
    if(immediate){camera.position.copy(next);controls.target.copy(target);controls.update();tween=null;}
    else {setAutoRotate(false);tween={start:performance.now(),from:camera.position.clone(),to:next,fromTarget:controls.target.clone(),toTarget:target};}
  }
  fit('perspective',true);
  function setAutoRotate(enabled){controls.autoRotate=Boolean(enabled);options.onAutoRotate?.(controls.autoRotate);canvas.dataset.orbit=String(controls.autoRotate);}
  controls.addEventListener('start',()=>{tween=null;setAutoRotate(false);});
  function inscription() {
    const plaque=document.createElement('canvas');plaque.width=256;plaque.height=512;const ctx=plaque.getContext('2d');if(!ctx)return;
    ctx.fillStyle='#173039';ctx.fillRect(0,0,256,512);ctx.strokeStyle='#cbb073';ctx.lineWidth=9;ctx.strokeRect(11,11,234,490);
    ctx.fillStyle='#e0c480';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 115px "STZhongsong","SimSun",serif';['正','陽','門'].forEach((text,i)=>ctx.fillText(text,128,105+i*151));
    const texture=new THREE.CanvasTexture(plaque);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    model.traverse(object=>{if(object.name==='inscription-front'||object.name==='inscription-back'){object.material.map=texture;object.material.color.setHex(0xffffff);object.material.needsUpdate=true;}});
  }
  function applyWireframe(enabled) {
    wireframe=Boolean(enabled);if(!model)return;
    model.traverse(object=>{
      if(!object.isMesh)return;const list=Array.isArray(object.material)?object.material:[object.material];
      for(const mat of list){if(!initialMaterials.has(mat))initialMaterials.set(mat,{color:mat.color.clone(),emissive:mat.emissive?.clone()});mat.wireframe=wireframe;
        const original=initialMaterials.get(mat);mat.color.copy(wireframe?new THREE.Color(0x92d1bd):original.color);if(mat.emissive)mat.emissive.copy(wireframe?new THREE.Color(0x244d40):original.emissive||new THREE.Color(0));}
    });canvas.dataset.wireframe=String(wireframe);
  }
  function attach(asset,source) {
    if(disposed){disposeObject(asset);return;}
    model=asset;scene.add(model);parts=[];let meshes=0;
    model.traverse(object=>{if(Number.isFinite(object.userData.explodeOffset))parts.push({object,offset:object.userData.explodeOffset,baseY:object.position.y});if(object.isMesh){meshes++;object.castShadow=true;object.receiveShadow=true;}});
    inscription();applyWireframe(wireframe);fit(preset,true);canvas.dataset.asset=source;canvas.dataset.meshes=String(meshes);canvas.dataset.parts=String(parts.length);container.classList.add('three-ready');options.onReady?.();
  }
  if(location.protocol==='file:') attach(createZhengyangmen(),'procedural');
  else new GLTFLoader().load('assets/models/zhengyangmen.glb',gltf=>attach(gltf.scene,'glb'),undefined,()=>{
    // Local geometry is also bundled, so a missing GLB does not strand the viewer.
    if(!disposed)attach(createZhengyangmen(),'procedural');
  });
  const lost=event=>{event.preventDefault();container.classList.remove('three-ready');options.onFailure?.('三维画面已暂停，可切换章节后重试。当前保留平面示意。');};canvas.addEventListener('webglcontextlost',lost);
  renderer.setAnimationLoop(time=>{
    if(disposed||document.hidden||!visible){last=time;return;}
    const delta=Math.min(.05,Math.max(0,(time-last)/1000));last=time;
    const changed=Math.abs(explosion-desiredExplosion)>.0005;explosion+=(desiredExplosion-explosion)*Math.min(1,delta*7);
    if(changed){for(const p of parts)p.object.position.y=p.baseY+p.offset*explosion;if(!tween)controls.target.y+=(20+explosion*9-controls.target.y)*Math.min(1,delta*5);canvas.dataset.explosion=explosion.toFixed(3);}
    if(tween){const t=Math.min(1,(performance.now()-tween.start)/850),s=t*t*(3-2*t);camera.position.lerpVectors(tween.from,tween.to,s);controls.target.lerpVectors(tween.fromTarget,tween.toTarget,s);if(t===1)tween=null;}
    controls.update(delta);renderer.render(scene,camera);if(frame++%20===0){canvas.dataset.rendered='true';canvas.dataset.frame=String(frame);canvas.dataset.azimuth=controls.getAzimuthalAngle().toFixed(3);canvas.dataset.distance=controls.getDistance().toFixed(2);}
  });
  function disposeObject(object) {
    const geometries=new Set(),mats=new Set(),textures=new Set();object.traverse(child=>{if(child.geometry)geometries.add(child.geometry);for(const material of child.material?(Array.isArray(child.material)?child.material:[child.material]):[])mats.add(material);});
    for(const mat of mats){for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);mat.dispose();}for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();
  }
  return {
    setExplode(value){desiredExplosion=THREE.MathUtils.clamp(value,0,1);},
    setWireframe:applyWireframe,setAutoRotate,
    view(name){fit(name);},
    zoom(direction){tween=null;const offset=camera.position.clone().sub(controls.target),distance=THREE.MathUtils.clamp(offset.length()*(direction>0?1/1.16:1.16),controls.minDistance,controls.maxDistance);offset.setLength(distance);camera.position.copy(controls.target).add(offset);controls.update();},
    reset(){desiredExplosion=0;applyWireframe(false);setAutoRotate(false);fit('perspective');},
    dispose(){if(disposed)return;disposed=true;renderer.setAnimationLoop(null);resize.disconnect();visibility.disconnect();controls.dispose();canvas.removeEventListener('webglcontextlost',lost);disposeObject(scene);renderer.dispose();renderer.forceContextLoss();canvas.remove();}
  };
}
