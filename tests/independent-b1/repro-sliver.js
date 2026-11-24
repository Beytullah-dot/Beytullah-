'use strict';
const L=require('./lib.js'),G=require('./gen.js');
const [,, fam='generic', seedS='910003']=process.argv;
const data=G.family(fam,+seedS);
const rel=L.oracle(data,{sliver:'relaxed',wantLayout:true}),str=L.oracle(data,{sliver:'strict'});
console.log(JSON.stringify({kerf:data.kerf,trim:data.trim,parts:data.parts.map(p=>[p.id,p.l,p.w,p.rotate===false?'norot':'rot',p.grain||'']),stocks:data.stocks.map(s=>[s.id,s.l,s.w,'qty',s.qty,'price',s.price])}));
console.log('strict min count',str.count,'relaxed',rel.count);
for(const {ti,mask} of rel.plan_count){const lay=rel.layoutFor(ti,mask);console.log(rel.types[ti].id,JSON.stringify(lay.placed.map(p=>[p.id,p.x,p.y,p.w,p.h])))}
// slack analysis per sheet: width/height leftovers adjacent to each piece
