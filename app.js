'use strict';
// Gate local: as respostas são validadas e descartadas, sem armazenamento ou envio externo.
const leadDialog = document.querySelector('#lead-dialog');
const leadForm = document.querySelector('#lead-form');
const leadError = document.querySelector('#lead-error');
let reportUnlocked = false;
let reportTrigger = null;
let reportScrollY = 0;
function downloadReport() {
  if (!reportUnlocked) return;
  const link = document.createElement('a');
  link.href = 'assets/relatorio/analise-visc11.pdf';
  link.download = 'Analise-VISC11-Eleven.pdf';
  document.body.append(link);
  link.click();
  link.remove();
}
document.querySelectorAll('.report-link, [data-report-link]').forEach(trigger => {
  trigger.addEventListener('click', event => {
    event.preventDefault();
    reportTrigger = trigger;
    reportScrollY = window.scrollY;
    closeMenu();
    if (reportUnlocked) { downloadReport(); return; }
    leadError.hidden = true;
    leadDialog.showModal();
    leadDialog.scrollTop = 0;
    lenis?.stop();
    leadForm.querySelector('input').focus({ preventScroll: true });
    window.scrollTo({ top: reportScrollY, behavior: 'instant' });
  });
});
leadDialog.querySelector('.lead-close').addEventListener('click', () => leadDialog.close());
for (const dialog of [leadDialog]) {
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (!leadDialog.open) {
      lenis?.start();
      reportTrigger?.focus({ preventScroll: true });
      window.scrollTo({ top: reportScrollY, behavior: 'instant' });
    }
  });
}
leadForm.querySelector('input[type="tel"]').addEventListener('input', event => {
  let digits = event.target.value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  event.target.value = digits.length > 7
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, -4)}-${digits.slice(-4)}`
    : digits.length > 2 ? `(${digits.slice(0, 2)}) ${digits.slice(2)}` : digits;
});
leadForm.addEventListener('submit', event => {
  event.preventDefault();
  const field = name => leadForm.elements[`form_fields[${name}]`];
  const checks = [
    ['suno_FirstName', value => !!value.trim(), 'Informe seu nome.'],
    ['suno_Email', value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()), 'Informe um e-mail válido.'],
    ['suno_Phone', value => /^\d{10,11}$/.test(value.replace(/\D/g, '')), 'Informe um telefone válido com DDD.'],
    ['suno_Aporte', value => !!value, 'Selecione quanto pretende aportar.'],
    ['suno_Patrimonio', value => !!value, 'Selecione seu patrimônio investido.'],
  ];
  leadForm.querySelectorAll('[aria-invalid]').forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
  for (const [name, valid, message] of checks) {
    const input = field(name);
    if (valid(input.value)) continue;
    leadError.textContent = message;
    leadError.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', 'lead-error');
    input.focus();
    return;
  }
  reportUnlocked = true;
  leadError.hidden = true;
  leadForm.reset();
  leadDialog.close();
  downloadReport();
});

// Eventos dos CTAs (data-cta). O projeto ainda não tem plataforma de analytics:
// os eventos entram na fila window.dataLayer (lida pelo Google Tag Manager/GA4 quando instalado)
// e também são disparados como CustomEvent 'visc11:cta' no document.
let lastCta = null;
document.addEventListener('click', event => {
  const cta = event.target.closest('[data-cta]');
  if (!cta) return;
  const name = cta.dataset.cta;
  const detail = name === 'abrir_relatorio' ? { dobra: 8, cta_origem: lastCta || 'acesso_direto' } : { dobra: Number(name.replace('cta_dobra_', '')) };
  if (name !== 'abrir_relatorio') lastCta = name;
  (window.dataLayer = window.dataLayer || []).push({ event: name, ...detail });
  document.dispatchEvent(new CustomEvent('visc11:cta', { detail: { event: name, ...detail } }));
});

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menu');
  mobileNav.hidden = true;
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  mobileNav.hidden = !open;
});
mobileNav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); }
});
const desktopQuery = matchMedia('(min-width: 1051px)');
desktopQuery.addEventListener('change', event => { if(event.matches) closeMenu(); });

const gallery = document.querySelector('.portfolio-gallery');
const previous = document.querySelector('#previous-asset');
const next = document.querySelector('#next-asset');
const progress = document.querySelector('.gallery-progress span');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

const lenis = !motionQuery.matches && window.Lenis ? new Lenis({ lerp: 0.1, autoRaf: true }) : null;
document.addEventListener('click', event => {
  if (event.defaultPrevented) return;
  const link = event.target.closest('a[href^="#"]:not(.skip-link)');
  const target = link && lenis && document.querySelector(link.getAttribute('href'));
  if (!target) return;
  event.preventDefault();
  // Reajusta ao final caso imagens lazy carreguem no caminho e desloquem o destino.
  lenis.scrollTo(target, { onComplete: () => lenis.scrollTo(target) });
  history.pushState(null, '', link.hash);
});
function scrollGallery(direction) {
  const cardWidth = gallery.querySelector('.asset-card').getBoundingClientRect().width;
  const gap = parseFloat(getComputedStyle(gallery).gap);
  gallery.scrollBy({ left: direction * (cardWidth + gap), behavior: motionQuery.matches ? 'instant' : 'smooth' });
}
function updateGallery() {
  const max = Math.max(0, gallery.scrollWidth - gallery.clientWidth);
  previous.disabled = gallery.scrollLeft < 2;
  next.disabled = gallery.scrollLeft >= max - 2;
  const ratio = gallery.clientWidth / gallery.scrollWidth;
  progress.style.width = `${ratio * 100}%`;
  progress.style.transform = `translateX(${max ? gallery.scrollLeft / max * (1 - ratio) / ratio * 100 : 0}%)`;
}
previous.addEventListener('click', () => scrollGallery(-1));
next.addEventListener('click', () => scrollGallery(1));
gallery.addEventListener('scroll', updateGallery, { passive: true });
gallery.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault(); scrollGallery(event.key === 'ArrowRight' ? 1 : -1);
  }
});
new ResizeObserver(updateGallery).observe(gallery);
updateGallery();

const faqItems = [...document.querySelectorAll('.faq-list details')];
function setFaq(item, open) {
  const answer = item.querySelector('.faq-answer');
  const from = item.open ? answer.getBoundingClientRect().height : 0;
  item.faqAnimation?.cancel();
  item.classList.toggle('is-open', open);
  if (open) item.open = true;
  if (motionQuery.matches) { item.open = open; return; }
  item.faqAnimation = answer.animate(
    [{ height: `${from}px`, opacity: open ? 0 : 1 }, { height: `${open ? answer.scrollHeight : 0}px`, opacity: open ? 1 : 0 }],
    { duration: 420, easing: 'cubic-bezier(.22,.61,.36,1)' }
  );
  item.faqAnimation.onfinish = () => {
    item.faqAnimation = null;
    if (!open) item.open = false;
  };
}
faqItems.forEach(item => {
  item.classList.toggle('is-open', item.open);
  item.querySelector('summary').addEventListener('click', event => {
    event.preventDefault();
    const open = !item.classList.contains('is-open');
    setFaq(item, open);
    if (open) faqItems.forEach(other => { if (other !== item && other.classList.contains('is-open')) setFaq(other, false); });
  });
});
const navLinks = [...document.querySelectorAll('.desktop-nav a')];
const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) navLinks.forEach(link => {
      const active = link.hash === `#${entry.target.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
sections.forEach(section => observer.observe(section));
if (!motionQuery.matches) document.querySelector('.hero-copy').classList.add('reveal');
