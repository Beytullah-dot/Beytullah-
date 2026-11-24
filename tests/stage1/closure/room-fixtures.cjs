'use strict';
const fs=require('fs'),path=require('path'),L=require('../../independent-b1/lib.js');
const rooms=[
 {id:'mutfak',title:'Mutfak - alt dolap modülleri',board:[2450,1230],parts:[[810,560,6,'Yan panel'],[564,560,4,'Taban ve raf']]},
 {id:'banyo',title:'Banyo - lavabo dolabı',board:[1455,910],parts:[[720,450,2,'Yan panel'],[564,450,2,'Taban ve raf'],[716,296,2,'Kapak'],[600,470,1,'Üst tabla']]},
 {id:'wc',title:'WC - duvar dolabı',board:[1215,920],parts:[[600,300,2,'Yan panel'],[364,300,3,'Taban ve raf'],[596,196,2,'Kapak']]}
];
for(const room of rooms){
 const state={project:room.title,unit:'mm',kerf:4,trim:5,allowNarrowScrapCuts:true,mode:'guillotine',objective:'area',priceMode:'panel',materialMode:'single',singleMaterial:'Beyaz panel',singleCategory:'panel',partsThicknessEnabled:true,stocksThicknessEnabled:true,useRemnantStock:false,offcutMinEdgeMm:50,offcutMinAreaCm2:100,
  parts:room.parts.map(([l,w,qty,label],i)=>({id:'p'+i,l,w,qty,label,t:18,category:'panel',material:'Beyaz panel',grain:'length',rotate:false})),
  stocks:[{id:'s0',l:room.board[0],w:room.board[1],qty:8,t:18,category:'panel',material:'Beyaz panel',price:1000,priceUnit:'panel'}]};
 fs.writeFileSync(path.join(__dirname,`../results/${room.id}-input.json`),JSON.stringify({synthetic:true,witnessProvided:false,state},null,2));
}
module.exports=rooms;
