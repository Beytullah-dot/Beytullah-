/* Beythaus Cut — mobile keyboard ergonomics. Never mutates project/inventory data. */
(()=>{'use strict';
const media=window.matchMedia('(max-width:640px)');
const isEditor=el=>!!el&&typeof el.matches==='function'&&el.matches(
 'input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea,select,[contenteditable=true]'
);
function update(){
 const editing=media.matches&&isEditor(document.activeElement);
 document.body.classList.toggle('bh-editing',editing);
 const viewport=window.visualViewport;
 const keyboard=editing&&!!viewport&&(window.innerHeight-viewport.height)>145;
 document.body.classList.toggle('bh-keyboard-open',keyboard);
}
document.addEventListener('focusin',update);
document.addEventListener('focusout',()=>window.requestAnimationFrame(update));
media.addEventListener?.('change',update);
window.visualViewport?.addEventListener('resize',update,{passive:true});
window.addEventListener('pageshow',update);
window.addEventListener('orientationchange',()=>window.requestAnimationFrame(update));
update();
})();