import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Display proportions are inferred from published photos, not survey dimensions.
export function createZhengyangmen() {
  const root=new THREE.Group();root.name='Zhengyangmen_Gatehouse';
  root.userData={title:'正阳门城楼',kind:'stylized architectural interpretation',surveyModel:false,units:'display units',sourceDocument:'docs/3D素材与建模依据.md'};
  const materials={
    brick:new THREE.MeshStandardMaterial({color:0x646b63,roughness:.98}),
    stone:new THREE.MeshStandardMaterial({color:0xa4a38e,roughness:.9}),
    red:new THREE.MeshStandardMaterial({color:0x852f25,roughness:.72}),
    darkRed:new THREE.MeshStandardMaterial({color:0x452a23,roughness:.9}),
    gold:new THREE.MeshStandardMaterial({color:0xc5a569,metalness:.3,roughness:.6}),
    teal:new THREE.MeshStandardMaterial({color:0x28584c,roughness:.8}),
    roof:new THREE.MeshStandardMaterial({color:0x43544b,roughness:.86,side:THREE.DoubleSide}),
    tile:new THREE.MeshStandardMaterial({color:0x627166,roughness:.9}),
    glaze:new THREE.MeshStandardMaterial({color:0x39745a,roughness:.38,metalness:.12}),
    window:new THREE.MeshStandardMaterial({color:0x27352b,roughness:.85}),
    plaque:new THREE.MeshStandardMaterial({color:0x15323a,roughness:.55})
  };
  for(const [key,mat] of Object.entries(materials))mat.name=key;
  const groups=new Map();const batches=new Map();
  function part(name,label,offset) {
    const group=new THREE.Group();group.name=name;group.userData={label,explodeOffset:offset};root.add(group);groups.set(name,group);batches.set(group,new Map());return group;
  }
  const base=part('foundation','台基与门洞',0);
  const lower=part('lower_hall','下层柱廊与楼身',3);
  const lowerRoof=part('lower_eave','下层屋檐',7);
  const upper=part('upper_hall','上层柱廊与回廊',11);
  const middleRoof=part('middle_eave','中层屋檐',16);
  const crown=part('upper_roof','上层屋顶与屋脊',23);
  function addGeometry(group,key,geometry,position=[0,0,0],rotation=[0,0,0]) {
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1));
    let normalized=geometry.index?geometry.toNonIndexed():geometry;
    if(normalized!==geometry)geometry.dispose();normalized.applyMatrix4(matrix);
    normalized.deleteAttribute('uv');normalized.deleteAttribute('uv1');normalized.deleteAttribute('color');
    if(!normalized.getAttribute('normal'))normalized.computeVertexNormals();
    const batch=batches.get(group);if(!batch.has(key))batch.set(key,[]);batch.get(key).push(normalized);
  }
  function box(group,key,w,h,d,x,y,z) {addGeometry(group,key,new THREE.BoxGeometry(w,h,d),[x,y,z]);}
  function cylinder(group,key,r,h,x,y,z,segments=10) {addGeometry(group,key,new THREE.CylinderGeometry(r,r,h,segments),[x,y,z]);}
  function tube(group,key,points,r=.07,sides=5) {addGeometry(group,key,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(5,points.length-1),r,sides,false));}
  function archOpening() {
    const shape=new THREE.Shape();shape.moveTo(-31,0);shape.lineTo(-3.8,0);shape.lineTo(-3.8,5.1);shape.absarc(0,5.1,3.8,Math.PI,0,true);shape.lineTo(3.8,0);shape.lineTo(31,0);shape.lineTo(30.6,12.5);shape.lineTo(-30.6,12.5);shape.closePath();
    addGeometry(base,'brick',new THREE.ExtrudeGeometry(shape,{depth:32,bevelEnabled:false,curveSegments:24}),[0,.7,-16]);
    box(base,'stone',63,.7,33,0,.35,0);box(base,'stone',62,.4,32.5,0,13.35,0);
    for(const side of [-1,1]) {
      box(base,'brick',62,.75,.65,0,13.7,side*16);box(base,'stone',62,.16,.8,0,14.12,side*16);
      box(base,'brick',.65,.75,32,side*30.65,13.7,0);box(base,'stone',.8,.16,32,side*30.65,14.12,0);
      for(let i=0;i<15;i++) {
        const a=i/15*Math.PI,b=(i+1)/15*Math.PI-.012;
        const stone=new THREE.Shape();stone.moveTo(Math.cos(a)*3.83,Math.sin(a)*3.83+5.8);stone.lineTo(Math.cos(a)*4.48,Math.sin(a)*4.48+5.8);stone.absarc(0,5.8,4.48,a,b,false);stone.lineTo(Math.cos(b)*3.83,Math.sin(b)*3.83+5.8);stone.absarc(0,5.8,3.83,b,a,true);stone.closePath();
        addGeometry(base,'stone',new THREE.ExtrudeGeometry(stone,{depth:.22,bevelEnabled:false,curveSegments:4}),[0,0,side>0?16: -16.22]);
      }
      for(let j=0;j<9;j++)for(const x of [-4.15,4.15])box(base,'stone',.65,.54,.22,x,.99+j*.58,side*16.1);
    }
    const lines=[];
    function line(x1,y1,z1,x2,y2,z2){lines.push(x1,y1,z1,x2,y2,z2);}
    for(let row=1;row<24;row++) {
      const y=.7+row*.52;const archY=y-5.8;const gap=y<5.8?4.5:y<10.3?Math.sqrt(Math.max(0,4.5**2-archY**2)):0;
      for(const z of [-16.015,16.015]) {
        line(-30.55,y,z,-gap,y,z);line(gap,y,z,30.55,y,z);
        for(let col=-21;col<=21;col++) {const x=col*1.42+(row%2)*.71;if(Math.abs(x)<gap+.2)continue;line(x,y,z,x,y-.47,z);}
      }
      for(const x of [-30.62,30.62])line(x,y,-16,x,y,16);
    }
    const seam=new THREE.BufferGeometry();seam.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
    const mortar=new THREE.LineSegments(seam,new THREE.LineBasicMaterial({color:0x26352b,transparent:true,opacity:.23}));mortar.name='brick_mortar';base.add(mortar);
  }
  archOpening();

  function beam(group,x1,z1,x2,z2,y,h=.65) {
    const length=Math.hypot(x2-x1,z2-z1);addGeometry(group,'teal',new THREE.BoxGeometry(length,h,.48),[(x1+x2)/2,y,(z1+z2)/2],[0,-Math.atan2(z2-z1,x2-x1),0]);
    for(const dy of [-h*.44,h*.44])addGeometry(group,'gold',new THREE.BoxGeometry(length,.06,.5),[(x1+x2)/2,y+dy,(z1+z2)/2],[0,-Math.atan2(z2-z1,x2-x1),0]);
  }
  function bracket(group,x,y,z) {
    for(let k=0;k<3;k++) {box(group,k===2?'gold':'teal',.7+k*.42,.18,.38,x,y+k*.2,z);box(group,'red',.38,.18,.65+k*.34,x,y+k*.2,z);}
  }
  function hall(group,bottom,height,width,depth,coreWidth,coreDepth) {
    const mid=bottom+height/2;
    box(group,'red',coreWidth,height-.8,coreDepth,0,mid-.2,0);
    box(group,'darkRed',width+.6,.25,depth+.6,0,bottom,0);
    for(let i=0;i<8;i++) {
      const x=-width/2+i*width/7;
      for(const z of [-depth/2,depth/2]) {
        cylinder(group,'red',.27,height,x,mid,z,12);cylinder(group,'stone',.4,.32,x,bottom+.1,z);bracket(group,x,bottom+height-.55,z);
      }
    }
    for(const x of [-width/2,width/2])for(let j=1;j<3;j++) {const z=-depth/2+j*depth/3;cylinder(group,'red',.27,height,x,mid,z,12);cylinder(group,'stone',.4,.32,x,bottom+.1,z);bracket(group,x,bottom+height-.55,z);}
    for(const z of [-depth/2,depth/2])beam(group,-width/2,z,width/2,z,bottom+height-.15);
    for(const x of [-width/2,width/2])beam(group,x,-depth/2,x,depth/2,bottom+height-.15);
    for(const side of [-1,1])for(let i=0;i<7;i++) {
      const x=-coreWidth/2+(i+.5)*coreWidth/7,w=coreWidth/7-.32,z=side*(coreDepth/2+.035),h=height*.62;
      box(group,'window',w,h,.08,x,mid,z);box(group,'red',w+.12,.18,.18,x,mid-h/2,z+side*.06);box(group,'red',w+.12,.18,.18,x,mid+h/2,z+side*.06);
      for(const edge of [-1,1])box(group,'red',.18,h,.18,x+edge*w/2,mid,z+side*.06);
      for(let k=1;k<5;k++)box(group,'gold',.045,h-.2,.06,x-w/2+k*w/5,mid,z+side*.1);
      for(let k=1;k<4;k++)box(group,'gold',w-.2,.045,.06,x,mid-h/2+k*h/4,z+side*.1);
    }
    for(const side of [-1,1])for(let j=0;j<3;j++) {
      const z=-coreDepth/2+(j+.5)*coreDepth/3;
      box(group,'window',.08,height*.55,coreDepth/3-.5,side*(coreWidth/2+.04),mid,z);
      for(let k=1;k<5;k++)box(group,'gold',.08,height*.55,.05,side*(coreWidth/2+.1),mid,z-coreDepth/6+k*coreDepth/15);
    }
  }
  hall(lower,13.6,7.35,42,22,35,16);
  hall(upper,23.4,5.75,37,18,31,13);
  function rail(group,w,d,y) {
    box(group,'gold',w,.12,.18,0,y+.95,d/2);box(group,'gold',w,.12,.18,0,y+.95,-d/2);
    for(const z of [-d/2,d/2]) {
      box(group,'red',w,.2,.18,0,y+.1,z);for(let i=0;i<=Math.floor(w/.9);i++)box(group,'red',.09,.86,.1,-w/2+i*w/Math.floor(w/.9),y+.51,z);
    }
    for(const x of [-w/2,w/2]) {
      box(group,'gold',.18,.12,d,x,y+.95,0);box(group,'red',.18,.2,d,x,y+.1,0);
      for(let i=0;i<=Math.floor(d/.9);i++)box(group,'red',.1,.86,.09,x,y+.51,-d/2+i*d/Math.floor(d/.9));
    }
    box(group,'teal',w+.5,.52,.4,0,y-.2,d/2);box(group,'teal',w+.5,.52,.4,0,y-.2,-d/2);
    for(const z of [-d/2,d/2])for(let i=0;i<Math.floor(w/1.4);i++)addGeometry(group,'gold',new THREE.TorusGeometry(.19,.025,4,8),[-w/2+.7+i*1.4,y-.2,z+.23*Math.sign(z)]);
  }
  rail(lower,43,23,13.8);rail(upper,39,20,23.6);

  // Curved, tiled roof surfaces. Each roof has real depth and a glazed edge.
  function patch(group,point,across,along,withTiles=true) {
    const positions=[],indices=[];
    for(let j=0;j<=along;j++)for(let i=0;i<=across;i++)positions.push(...point(i/across,j/along));
    for(let j=0;j<along;j++)for(let i=0;i<across;i++){const a=j*(across+1)+i,b=a+1,c=a+across+1,d=c+1;indices.push(a,c,b,b,c,d);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();addGeometry(group,'roof',geometry);
    if(withTiles)for(let i=0;i<=across;i++)tube(group,'tile',Array.from({length:along+1},(_,j)=>{const p=point(i/across,j/along);p[1]+=.055;return p;}),.045,4);
    tube(group,'glaze',Array.from({length:across+1},(_,i)=>point(i/across,1)),.14,6);
  }
  function skirt(group,outerW,outerD,innerW,innerD,bottom,top) {
    for(const side of [-1,1]) {
      patch(group,(u,t)=>[(u*2-1)*(innerW+(outerW-innerW)*t)/2,top-(top-bottom)*Math.pow(t,.82)+(.38+.6*Math.pow(Math.abs(u*2-1),8))*t**5,side*(innerD+(outerD-innerD)*t)/2],Math.round(outerW/.66),7);
      patch(group,(u,t)=>[side*(innerW+(outerW-innerW)*t)/2,top-(top-bottom)*Math.pow(t,.82)+(.38+.6*Math.pow(Math.abs(u*2-1),8))*t**5,(u*2-1)*(innerD+(outerD-innerD)*t)/2],Math.round(outerD/.66),7);
    }
    for(const sx of [-1,1])for(const sz of [-1,1])tube(group,'glaze',Array.from({length:12},(_,i)=>{const t=i/11;return[sx*(innerW+(outerW-innerW)*t)/2,top-(top-bottom)*t**.82+.98*t**5+.06,sz*(innerD+(outerD-innerD)*t)/2];}),.16,6);
  }
  skirt(lowerRoof,50,29,38,17,21.0,23.25);
  skirt(middleRoof,45,25,31,12,29.4,31.65);
  box(middleRoof,'teal',31,1.6,12,0,31.55,0);
  for(const z of [-6.05,6.05])for(let i=-7;i<=7;i++) {
    box(middleRoof,'gold',.055,1.3,.1,i*1.9,31.55,z);
    addGeometry(middleRoof,'gold',new THREE.TorusGeometry(.27,.035,4,8),[i*1.9,31.55,z+.05*Math.sign(z)]);
  }
  skirt(crown,43,23.5,30,11,32.45,35.7);
  for(const side of [-1,1])patch(crown,(u,t)=>[(u*2-1)*15.2,40-4.6*t**.82+.3*t**6,side*t*5.65],48,8);
  for(const side of [-1,1]) {
    const shape=new THREE.Shape();shape.moveTo(-5.65,35.7);shape.lineTo(0,40);shape.lineTo(5.65,35.7);shape.closePath();
    addGeometry(crown,'red',new THREE.ShapeGeometry(shape),[side*15.13,0,0],[0,side*Math.PI/2,0]);
    tube(crown,'gold',[[side*15.24,35.8,-5.45],[side*15.24,39.65,0],[side*15.24,35.8,5.45]],.075,5);
    addGeometry(crown,'gold',new THREE.TorusGeometry(.62,.075,5,18),[side*15.26,37.0,0],[0,Math.PI/2,0]);
  }
  box(crown,'glaze',31,.32,.48,0,40.13,0);box(crown,'gold',30.8,.07,.5,0,40.32,0);
  for(const side of [-1,1]) {
    tube(crown,'glaze',[[side*14.7,40.2,0],[side*15.4,40.7,0],[side*15.9,41.55,0],[side*15.7,42,0]],.23,7);
    for(let i=0;i<4;i++)cylinder(crown,'gold',.11+i*.015,.35+i*.06,side*(14+i*.4),40.4+i*.15,0,6);
    box(middleRoof,'gold',2.15,3.0,.22,0,32.1,side*6.3);
    const plaque=new THREE.Mesh(new THREE.PlaneGeometry(1.92,2.78),materials.plaque.clone());plaque.position.set(0,32.1,side*6.43);plaque.rotation.y=side<0?Math.PI:0;plaque.name=side>0?'inscription-front':'inscription-back';middleRoof.add(plaque);
  }
  for(const [group,batch] of batches)for(const [key,list] of batch) {
    const merged=mergeGeometries(list,false);if(!merged)throw Error(`Unable to merge ${group.name}/${key}`);
    const mesh=new THREE.Mesh(merged,materials[key]);mesh.name=`${group.name}_${key}`;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);for(const geometry of list)geometry.dispose();
  }
  return root;
}
