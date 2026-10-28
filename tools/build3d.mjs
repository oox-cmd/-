import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {build} from 'esbuild';
import {createZhengyangmen} from '../models/zhengyangmen.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);await mkdir('assets/models',{recursive:true});await mkdir('assets/vendor',{recursive:true});
// GLTFExporter uses FileReader for Blob buffers. No image or canvas export is needed.
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();}).catch(error=>this.onerror?.(error));}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();}).catch(error=>this.onerror?.(error));}
};
const model=createZhengyangmen();model.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());let meshes=0,triangles=0;
model.traverse(object=>{
  if(!object.isMesh)return;meshes++;const positions=object.geometry.getAttribute('position');
  if(!Array.from(positions.array).every(Number.isFinite))throw Error(`Non-finite geometry: ${object.name}`);
  triangles+=(object.geometry.index?.count||positions.count)/3;
});
if(model.children.filter(p=>Number.isFinite(p.userData.explodeOffset)).length!==6)throw Error('Six independent assemblies are required');
const ray=new THREE.Raycaster(new THREE.Vector3(0,4,100),new THREE.Vector3(0,0,-1));
if(ray.intersectObject(model,true).some(hit=>hit.object.isMesh))throw Error('The central arch must remain open');
ray.set(new THREE.Vector3(12,4,100),new THREE.Vector3(0,0,-1));
if(!ray.intersectObject(model,true).some(hit=>hit.object.isMesh))throw Error('The gate platform wall is missing');
const tracks=model.children.filter(part=>part.userData.explodeOffset>0).map(part=>new THREE.VectorKeyframeTrack(`${part.name}.position`,[0,1.4,2.4,4],[0,0,0,0,part.userData.explodeOffset,0,0,part.userData.explodeOffset,0,0,0,0]));
const animation=new THREE.AnimationClip('结构展开与合拢',4,tracks);
const arrayBuffer=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true,animations:[animation]});
await writeFile('assets/models/zhengyangmen.glb',Buffer.from(arrayBuffer));
const reloaded=await new GLTFLoader().parseAsync(arrayBuffer,'');
const recovered=new THREE.Box3().setFromObject(reloaded.scene).getSize(new THREE.Vector3());
if(size.distanceTo(recovered)>.01)throw Error('Exported model dimensions changed');
if(reloaded.animations.length!==1||reloaded.animations[0].tracks.length!==5)throw Error('The exported assembly animation is incomplete');
const metadata={title:'正阳门城楼',kind:'风格化建筑示意，非测绘复原',assemblies:6,meshes,triangles:Math.round(triangles),animations:['结构展开与合拢 / 4秒'],bounds:{width:size.x,height:size.y,depth:size.z},bytes:arrayBuffer.byteLength,source:'models/zhengyangmen.mjs',references:'docs/3D素材与建模依据.md',notes:['图片仅用于外观参考，模型不嵌入第三方照片','牌匾文字在网页运行时使用本机字体绘制','各部件可分别展开，但不表达精确内部结构']};
await writeFile('assets/models/zhengyangmen.meta.json',JSON.stringify(metadata,null,2)+'\n');
await copyFile('node_modules/three/LICENSE','assets/vendor/THREE-LICENSE.txt');
await build({entryPoints:['viewer3d.mjs'],bundle:true,format:'iife',globalName:'Axis3D',outfile:'assets/axis3d.js',platform:'browser',target:['es2022'],minify:true,legalComments:'eof'});
const bundle=await readFile('assets/axis3d.js');
console.log(JSON.stringify({...metadata,bundleBytes:bundle.length,exportRoundTrip:'passed',archOpening:'passed'},null,2));
