const boardEl=document.getElementById('board');
const status=document.getElementById('status');
let board=[null,null,null,null,null,null,null,null,null];
let turn='X';
const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function render(){
  boardEl.innerHTML='';
  board.forEach((v,i)=>{
    const c=document.createElement('div');c.className='cell';c.textContent=v||'';c.addEventListener('click',()=>play(i));boardEl.appendChild(c);
  })
}
function play(i){
  if(board[i]||checkWin()) return;
  board[i]=turn; if(checkWin()){ status.textContent=`${turn} gagne !`; } else if(board.every(Boolean)){ status.textContent='Égalité'; } else { turn = turn==='X'?'O':'X'; status.textContent=`Joueur ${turn}` }
  render();
}
function checkWin(){
  return wins.some(w=>{ if(w.every(i=>board[i]===turn)) return true; return false });
}
render();
