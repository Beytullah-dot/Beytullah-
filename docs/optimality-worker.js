/* Beythaus Cut — bounded, cancelable global cost/area proof worker.
 * Receives an already independently audited physical plan from the UI.
 * Proof uses relaxed exact integer stock quantity-cover optimization.
 */
'use strict';
importScripts('./engine/material-policy.js','./engine/optimality-certificate.js');
self.onmessage=event=>{
 const job=event.data||{};
 if(job.type!=='certify')return;
 try{
  const options={auditOK:true,maxStates:120000,maxMs:2500,
   allowMaterialAssignment:!!job.allowMaterialAssignment,
   priceMode:job.priceMode,m3:job.m3};
  const area=self.BeythausOptimalityCertificate.certify(job.plan,job.data,
   {...options,objective:'area'});
  const cost=self.BeythausOptimalityCertificate.certify(job.plan,job.data,
   {...options,objective:'cost'});
  const count=self.BeythausOptimalityCertificate.certify(job.plan,job.data,
   {...options,objective:'count'});
  self.postMessage({type:'certificate',requestId:job.requestId,area,cost,count});
 }catch(error){
  self.postMessage({type:'error',requestId:job.requestId,
   message:String(error?.message||error)});
 }
};
