const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');
menuToggle?.addEventListener('click', () => {
  const opened = menu.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(opened));
});
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));
document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('leadForm');
const message = form.querySelector('.form-message');
const submit = form.querySelector('button[type="submit"]');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  message.className = 'form-message';
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  data.consent = form.elements.consent.checked;
  submit.disabled = true;
  submit.textContent = 'Отправляем…';
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Не удалось отправить заявку.');
    message.textContent = result.message;
    message.classList.add('success');
    form.reset();
  } catch (error) {
    message.textContent = error.message || 'Ошибка соединения. Позвоните нам по телефону.';
    message.classList.add('error');
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Отправить заявку <span>↗</span>';
  }
});
