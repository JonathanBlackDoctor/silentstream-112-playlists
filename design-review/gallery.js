function fit() { document.querySelectorAll('.frame').forEach(frame => { const scale=frame.clientWidth/900; frame.querySelector('iframe').style.transform=`scale(${scale})`; }); }
window.addEventListener('resize',fit);fit();
function show(locked){document.querySelectorAll('iframe').forEach((frame,i)=>frame.src=`${'abcd'[i]}.html${locked?'?locked=1':''}`);document.querySelector('#show-list').classList.toggle('active',!locked);document.querySelector('#show-lock').classList.toggle('active',locked);document.querySelectorAll('.card-head a').forEach((a,i)=>a.href=`${'abcd'[i]}.html${locked?'?locked=1':''}`);}
document.querySelector('#show-list').addEventListener('click',()=>show(false));document.querySelector('#show-lock').addEventListener('click',()=>show(true));
