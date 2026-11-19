/* One canonical adapter for the actual shipped calculation module.
 * Tests no longer parse a function range from the HTML page.
 * This runs the exact browser module, not a copied solver implementation.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const filename=path.join(__dirname,'../docs/engine/cutting-engine.js');
const source=fs.readFileSync(filename,'utf8');
const windowLike={};
new Function('window',source)(windowLike);
const facade=windowLike.BeythausCutEngine;
if(!facade||facade.contractVersion!==1)
 throw Error('Cutting engine contract mismatch in test harness');
function createEngine(state,val,mkey,fmt){
 return facade.createEngine({getState:()=>state,val,mkey,fmt})
}
module.exports={createEngine,contractVersion:facade.contractVersion};
