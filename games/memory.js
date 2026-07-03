const icons=['🐶','🐱','🦊','🐼','🐵','🦁','🐸','🐷'];
let deck=icons.concat(icons).sort(()=>Math.random()-0.5);
const board=document.getElementById('board');
const status=document.getElementById('status');
let first=null,second=null,lock=false,score=0;
function render(){
  board.innerHTML='';
  deck.forEach((v,i)=>{
    const el=document.createElement('div');el.className='card';el.dataset.idx=i;el.textContent='';el.addEventListener('click',flip);board.appendChild(el);
  })
}
function flip(e){
  if(lock) return; const el=e.currentTarget; const i=+el.dataset.idx; if(el.textContent) return;
  el.textContent=deck[i];
  if(!first){ first={el,i}; } else { second={el,i}; lock=true; setTimeout(check,800); }
}
function check(){
  if(deck[first.i]===deck[second.i]){ score++; status.textContent=`Paires trouvées: ${score}`; } else { first.el.textContent=''; second.el.textContent=''; }
  first=null; second=null; lock=false;
}
render();
