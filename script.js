document.addEventListener('DOMContentLoaded',()=>{
  const nav=document.getElementById('site-nav');
  const toggle=document.getElementById('nav-toggle');
  const links=document.querySelectorAll('.nav-link');
  
  // Toggle mobile menu
  toggle.addEventListener('click',()=>nav.classList.toggle('show'));

  // Close menu on link click
  links.forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    const target=document.querySelector(a.getAttribute('href'));
    if(target) target.scrollIntoView({behavior:'smooth'});
    nav.classList.remove('show');
  }));

  // Update active link on scroll
  const sections=[...document.querySelectorAll('main section')];
  const onScroll=()=>{
    const y=window.scrollY+150;
    let current='home';
    sections.forEach(s=>{ if(s.offsetTop<=y) current=s.id });
    links.forEach(a=>{
      const isActive=a.getAttribute('href')==`#${current}`;
      a.classList.toggle('active', isActive);
    });
  }
  
  onScroll();
  window.addEventListener('scroll',onScroll);
  
  // Close menu when clicking outside
  document.addEventListener('click',e=>{
    if(!nav.contains(e.target) && !toggle.contains(e.target) && nav.classList.contains('show')){
      nav.classList.remove('show');
    }
  });
});
