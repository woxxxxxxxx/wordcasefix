(function () {
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => siteNav.classList.toggle('open'));
  }

  const form = document.getElementById('insuranceTool');
  const result = document.getElementById('toolResult');
  if (!form || !result) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const type = String(data.get('type') || '');
    const employees = String(data.get('employees') || '');
    const vehicles = String(data.get('vehicles') || '');
    const contracts = String(data.get('contracts') || '');
    const state = String(data.get('state') || '').trim() || 'your state';

    const items = new Set(['General liability insurance', "Business owner's policy or commercial property review"]);
    if (/Consulting|technology|professional/i.test(type)) items.add('Professional liability / errors and omissions insurance');
    if (!/None/i.test(employees)) items.add(`Workers compensation rules in ${state}`);
    if (!/No regular/i.test(vehicles)) items.add('Commercial auto, hired auto, or non-owned auto coverage');
    if (/certificate|specific limits/i.test(contracts)) items.add('Certificate of insurance, limits, and additional insured wording');

    result.innerHTML = [
      '<h2>Research checklist</h2>',
      '<p>Use this list to prepare for a conversation with licensed insurance professionals. It is not a recommendation or legal requirement determination.</p>',
      '<ul>',
      ...Array.from(items).map(item => `<li>${item}</li>`),
      '</ul>',
      '<p><strong>Next step:</strong> gather revenue, payroll, employee count, vehicle details, property values, contracts, and prior claims before comparing quotes.</p>'
    ].join('');
  });
})();

// Back to top button
(function(){
  var btn = document.createElement('button');
  btn.id = 'btt';
  btn.innerHTML = '&#8679;';
  btn.title = 'Back to top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.style.cssText = 'position:fixed;bottom:28px;right:24px;width:48px;height:48px;background:#1d4ed8;color:#fff;border:none;border-radius:50%;font-size:22px;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.2);z-index:9999;transition:opacity .3s;opacity:0;';
  document.body.appendChild(btn);
  btn.addEventListener('click', function(){
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
  window.addEventListener('scroll', function(){
    if((window.pageYOffset || document.documentElement.scrollTop) > 200){
      btn.style.display = 'flex';
      setTimeout(function(){ btn.style.opacity = '1'; }, 10);
    } else {
      btn.style.opacity = '0';
      setTimeout(function(){ btn.style.display = 'none'; }, 300);
    }
  });
})();
