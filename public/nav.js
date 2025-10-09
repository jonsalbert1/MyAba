<script>
(function(){
  const box = document.getElementById('navLinks');
  const btn = document.getElementById('navToggle');
  btn && btn.addEventListener('click', ()=> box.classList.toggle('is-open'));

  const path = location.pathname.toLowerCase();
  document.querySelectorAll('.site-nav__links a').forEach(a=>{
    const href=(a.getAttribute('href')||'').toLowerCase();
    if (href && path.endsWith(href)) a.classList.add('is-active');
  });
})();
</script>
