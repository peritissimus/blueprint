import test from 'node:test';
import assert from 'node:assert/strict';
import { computeQiFlow, segmentDistance } from '../src/qi-flow.js';
const room = extra => ({ bounds:[0,0,10,10], contains:(x,z)=>x>=0&&x<=10&&z>=0&&z<=10, walls:[], furniture:[], entrance:[0,5], ...extra });
test('open floor is reachable and trails start at the entrance',()=>{
  const result=computeQiFlow(room());
  assert.equal(result.reached,result.total); assert.ok(result.paths.length);
  result.paths.forEach(p=>assert.deepEqual(p[0],[0,5]));
});
test('solid walls disconnect space; door gaps connect it without crossing walls',()=>{
  const sealed=computeQiFlow(room({walls:[[[5,0],[5,10],0.3]]}));
  assert.ok(sealed.reached<sealed.total);
  assert.ok(sealed.paths.every(p=>p.every(([x])=>x<5)));
  const walls=[[[5,0],[5,3.5],0.3],[[5,6.5],[5,10],0.3]];
  const open=computeQiFlow(room({walls})); assert.equal(open.reached,open.total);
  open.paths.forEach(path=>path.slice(1).forEach((b,i)=>{
    const a=path[i]; for(let j=0;j<=20;j++) {
      const x=a[0]+(b[0]-a[0])*j/20,z=a[1]+(b[1]-a[1])*j/20;
      assert.ok(walls.every(([c,d])=>segmentDistance(x,z,c,d)>=0.15));
    }
  }));
});
test('furniture blocking a doorway changes connectivity',()=>{
  const walls=[[[5,0],[5,3.5],0.3],[[5,6.5],[5,10],0.3]];
  const result=computeQiFlow(room({walls,furniture:[{x:5,z:5,w:1,d:3,rot:0}]}));
  assert.ok(result.reached<result.total);
});
test('missing and obstructed entrances return actionable empty states',()=>{
  assert.equal(computeQiFlow(room({entrance:null})).paths.length,0);
  const result=computeQiFlow(room({furniture:[{x:0.5,z:5,w:4,d:6,rot:0}]}));
  assert.match(result.reason,/blocked/); assert.equal(result.paths.length,0);
});
test('footprint clips routes and large layouts use a bounded grid',()=>{
  const result=computeQiFlow(room({contains:(x,z)=>x<4&&z<8, entrance:[0,3]}));
  assert.ok(result.paths.every(path=>path.every(([x,z])=>x<4&&z<8)));
  const large=computeQiFlow(room({bounds:[0,0,1000,1000],contains:()=>true,entrance:[5,5]}));
  assert.ok(large.total<=10201);
});
test('routes avoid rotated furniture footprints',()=>{
  const item={x:5,z:5,w:5,d:2,rot:Math.PI/4};
  const result=computeQiFlow(room({furniture:[item]}));
  assert.ok(result.paths.length);
  result.paths.forEach(path=>path.slice(1).forEach((b,i)=>{
    const a=path[i]; for(let j=0;j<=40;j++) {
      const dx=a[0]+(b[0]-a[0])*j/40-item.x,dz=a[1]+(b[1]-a[1])*j/40-item.z;
      const x=Math.cos(item.rot)*dx-Math.sin(item.rot)*dz,z=Math.sin(item.rot)*dx+Math.cos(item.rot)*dz;
      assert.ok(Math.abs(x)>=item.w/2 || Math.abs(z)>=item.d/2);
    }
  }));
});
test('extremely long narrow bounds do not allocate an unbounded grid',()=>{
  const result=computeQiFlow(room({bounds:[0,0,1000000,1],contains:()=>true}));
  assert.ok(result.total<=200);
});
