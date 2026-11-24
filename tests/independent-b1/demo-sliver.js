'use strict';
const L=require('./lib.js');
const {engine}=L.loadEngine();
function run(name,partDims,stock,kerf,trim){
  const parts=partDims.map((d,i)=>L.mkPart(i,d[0],d[1],{rotate:false}));
  const data=L.mkData(parts,[L.mkStock(0,stock[0],stock[1],stock[2],100)],kerf,trim);
  const o=L.oracle(data,{sliver:'relaxed',wantLayout:true}); // may be big; keep n small
  const plan=engine.optimize(JSON.parse(JSON.stringify(data)),true,false,'minimum');
  console.log(name,'| engine sheets:',plan.bins.length,'unplaced:',plan.unplaced.length,'| physical optimum (blade may overhang the edge/trim):',o.count);
}
run('A 3 strips 810x1220 on 2440x1220, kerf 4, trim 0 ',[[810,1220],[810,1220],[810,1220]],[2440,1220,5],4,0);
run('B same, trim 10 (803 wide strips)               ',[[803,1200],[803,1200],[803,1200]],[2440,1220,5],4,10);
run('C 2 strips 10+8 on 22, kerf 3 (tiny)            ',[[10,5],[8,5]],[22,5,3],3,0);
