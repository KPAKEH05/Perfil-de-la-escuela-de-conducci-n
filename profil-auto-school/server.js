const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]', 'utf8');

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Простое ограничение частоты отправки заявок по IP.
const attempts = new Map();
function leadRateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(t => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) return res.status(429).json({ ok: false, message: 'Слишком много заявок. Попробуйте позже.' });
  recent.push(now);
  attempts.set(key, recent);
  next();
}

app.post('/api/leads', leadRateLimit, (req, res) => {
  const { name, phone, message = '', consent, website = '' } = req.body || {};
  // Honeypot: поле website скрыто от обычного посетителя.
  if (website) return res.json({ ok: true });
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    return res.status(400).json({ ok: false, message: 'Укажите имя (от 2 до 80 символов).' });
  }
  if (typeof phone !== 'string' || !/^[+()\d\s-]{7,24}$/.test(phone.trim())) {
    return res.status(400).json({ ok: false, message: 'Проверьте номер телефона.' });
  }
  if (consent !== true && consent !== 'true' && consent !== 'on') {
    return res.status(400).json({ ok: false, message: 'Необходимо согласие на обработку персональных данных.' });
  }
  const lead = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    phone: phone.trim(),
    message: typeof message === 'string' ? message.trim().slice(0, 1000) : '',
    createdAt: new Date().toISOString(),
    status: 'new'
  };
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    leads.push(lead);
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
    res.status(201).json({ ok: true, message: 'Заявка отправлена! Мы свяжемся с вами.' });
  } catch (error) {
    console.error('Lead storage error:', error);
    res.status(500).json({ ok: false, message: 'Не удалось сохранить заявку. Позвоните нам, пожалуйста.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'profil-site' }));

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Профиль: http://localhost:${PORT}`));
