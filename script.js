document.addEventListener('DOMContentLoaded',()=>{
  const nav=document.getElementById('site-nav');
  const toggle=document.getElementById('nav-toggle');
  toggle.addEventListener('click',()=>nav.classList.toggle('show'));

  // Smooth scroll and active link
  const links=document.querySelectorAll('.nav-link');
  links.forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    document.querySelector(a.getAttribute('href')).scrollIntoView({behavior:'smooth'});
    if(nav.classList.contains('show')) nav.classList.remove('show');
  }));

  const sections=[...document.querySelectorAll('main section')];
  const onScroll=()=>{
    const y=window.scrollY+120;
    let current='home';
    sections.forEach(s=>{ if(s.offsetTop<=y) current=s.id });
    links.forEach(a=>a.classList.toggle('active', a.getAttribute('href')==`#${current}`));
  }
  onScroll();
  window.addEventListener('scroll',onScroll);
});
