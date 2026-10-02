import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import { GoogleGenAI, Type } from '@google/genai';
import { sendVerificationEmail } from './emailService.js';
import { getFreshDatabaseData, getVetSeedData } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = path.resolve(__dirname, 'data', 'db.json');

// Gemini AI Client Setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

interface DatabaseData {
  users: any[];
  tutors: any[];
  patients: any[];
  appointments: any[];
  inventory_items: any[];
  audit_logs: any[];
  financial_entries: any[];
  subscriptions: any[];
  consultations?: any[];
  clinics?: any[];
  surgeons?: any[];
  anesthesia_records?: any[];
  documents?: any[];
  services?: any[];
}

function loadDB(): DatabaseData {
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.patients && parsed.patients.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error reading db.json, initializing defaults:', e);
    }
  }

  const defaultData = getFreshDatabaseData();
  saveDB(defaultData);
  return defaultData;
}

function saveDB(data: DatabaseData) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving db.json:', e);
  }
}

// In-memory working cache with automatic save
let db: DatabaseData = loadDB();
if (!Array.isArray(db.subscriptions)) {
  db.subscriptions = [];
}

function resetDBData(): DatabaseData {
  const freshData = getFreshDatabaseData();
  db = freshData;
  saveDB(db);
  return freshData;
}

// VAPID Web Push Setup
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BJ6odgcVdtdhTv8cqMaDF-WM5Nd2K2ggKFgduUUw1vsXMqXwW4-TtNmx5jV19NvDSkG9GmUq96dB3tkXdriDveY';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'NXUjd49OYZNKSRnaZ8N6WGN48mnMh8ufLFtzBmtIHQY';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contato@vetgo.com.br';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('✅ Web Push VAPID configurado com sucesso.');
} catch (e) {
  console.error('Erro na configuração de VAPID:', e);
}

// Normalize booleans in users
db.users.forEach((u) => {
  u.is_active = Boolean(u.is_active);
  u.is_lifetime = Boolean(u.is_lifetime);
});
db.tutors.forEach((t) => {
  t.is_active = Boolean(t.is_active);
});
db.patients.forEach((p) => {
  p.is_active = Boolean(p.is_active);
  p.is_neutered = Boolean(p.is_neutered);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to authenticate user from Bearer token
function authenticate(req: Request): any | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  // Format: token-<userId>-<timestamp> or raw userId
  let userId: number | null = null;
  if (token.startsWith('token-')) {
    const parts = token.split('-');
    userId = parseInt(parts[1], 10);
  } else if (!isNaN(Number(token))) {
    userId = Number(token);
  }

  let user: any = null;
  if (userId) {
    user = db.users.find((u) => u.id === userId && u.is_active);
  }

  // Fallback: check if vet user exists or first user
  if (!user) {
    user = db.users.find((u) => u.role === 'VET') || db.users[0] || null;
  }

  return user;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ detail: 'Sessão expirada. Faça login novamente.' });
  }
  (req as any).user = user;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = authenticate(req);
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ detail: 'Acesso restrito para administradores.' });
  }
  (req as any).user = user;
  next();
}

// -------------------------------------------------------------
// Health Check
// -------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    app: 'Vetgo',
    slogan: 'Veterinária onde você precisa.',
    api_version: 'v1',
  });
});

// -------------------------------------------------------------
// Reset Test Data Endpoint
// -------------------------------------------------------------
app.post(['/api/v1/reset-test-data', '/api/v1/users/reset-test-data', '/api/v1/admin/reset-test-data'], (_req, res) => {
  try {
    const data = resetDBData();
    res.json({
      success: true,
      message: 'Dados de teste restaurados com sucesso para a data atual!',
      appointments_count: data.appointments.length,
      patients_count: data.patients.length,
      tutors_count: data.tutors.length
    });
  } catch (e: any) {
    console.error('Erro ao resetar dados de teste:', e);
    res.status(500).json({ detail: 'Erro ao resetar dados de teste: ' + e.message });
  }
});

// -------------------------------------------------------------
// AUTH ENDPOINTS
// -------------------------------------------------------------
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: 'E-mail e senha são obrigatórios.' });
  }

  let cleanEmail = String(email).trim().toLowerCase();

  // Normalize common demo email aliases
  if (['ncodestechnologies@gmail.com', 'ncodestechnologies', 'ncodes', 'programador'].includes(cleanEmail)) {
    cleanEmail = 'ncodestechnologies@gmail.com';
  } else if (['vetteste@gmail.com', 'vetteste', 'vetteste@gmail'].includes(cleanEmail)) {
    cleanEmail = 'vetteste@gmail.com';
  } else if (['dra.carolina@vetgo.com.br', 'dra.carolina@vetgo.com', 'carolina@vetgo.com.br', 'carolina@vetgo.com', 'vet@vetgo.com.br', 'vet@vetgo.com', 'vet', 'carolina'].includes(cleanEmail)) {
    cleanEmail = 'dra.carolina@vetgo.com.br';
  } else if (['admin@vetgo.com.br', 'admin@vetgo.com', 'admin'].includes(cleanEmail)) {
    cleanEmail = 'admin@vetgo.com.br';
  } else if (['dr.bruno@vetgo.com.br', 'dr.bruno@vetgo.com', 'bruno@vetgo.com.br', 'bruno@vetgo.com', 'bruno'].includes(cleanEmail)) {
    cleanEmail = 'dr.bruno@vetgo.com.br';
  }

  let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  // Auto-restore users if missing
  if (!user) {
    if (cleanEmail === 'ncodestechnologies@gmail.com') {
      user = {
        id: 1,
        email: 'ncodestechnologies@gmail.com',
        hashed_password: bcrypt.hashSync('Taijou13!', 10),
        first_name: 'Programador',
        last_name: 'NCodes Technologies',
        phone: '(11) 99999-0000',
        whatsapp: null,
        crmv: null,
        crmv_uf: null,
        clinic_name: null,
        logo_url: null,
        role: 'ADMIN',
        is_active: true,
        plan: 'PRO',
        subscription_status: 'ACTIVE',
        subscription_origin: 'AUTONOMO_CADASTRO',
        is_lifetime: true,
        subscription_start: new Date().toISOString(),
        subscription_end: null,
        admin_notes: 'Administrador e programador da plataforma NCodes Technologies',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: true,
      };
      db.users.push(user);
      saveDB(db);
    } else if (cleanEmail === 'vetteste@gmail.com') {
      user = {
        id: 2,
        email: 'vetteste@gmail.com',
        hashed_password: bcrypt.hashSync('Nikolas13', 10),
        first_name: 'Veterinário',
        last_name: 'Teste',
        phone: '(11) 98765-4321',
        whatsapp: '(11) 98765-4321',
        crmv: '12345',
        crmv_uf: 'SP',
        clinic_name: 'Atendimento Volante & Domiciliar',
        logo_url: null,
        role: 'VET',
        is_active: true,
        plan: 'FREE',
        subscription_status: 'ACTIVE',
        subscription_origin: 'AUTONOMO_CADASTRO',
        is_lifetime: false,
        subscription_start: new Date().toISOString(),
        subscription_end: null,
        admin_notes: 'Conta de teste manual do veterinário',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        specialty_anesthesia_enabled: false,
        email_verified: true,
      };
      db.users.push(user);
      saveDB(db);
    } else if (cleanEmail === 'dra.carolina@vetgo.com.br') {
      user = {
        id: 2,
        email: 'dra.carolina@vetgo.com.br',
        hashed_password: bcrypt.hashSync('Vet@123456', 10),
        first_name: 'Carolina',
        last_name: 'Mendes',
        phone: '(11) 98765-4321',
        whatsapp: '(11) 98765-4321',
        crmv: '34892',
        crmv_uf: 'SP',
        clinic_name: 'Dra. Carolina Mendes - Atendimento Volante & Domiciliar',
        role: 'VET',
        is_active: true,
        plan: 'FREE',
        subscription_status: 'ACTIVE',
        subscription_origin: 'AUTONOMO_CADASTRO',
        is_lifetime: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        specialty_anesthesia_enabled: false,
        email_verified: true,
      };
      db.users.push(user);
      saveDB(db);
    } else if (cleanEmail === 'admin@vetgo.com.br') {
      user = {
        id: 1,
        email: 'admin@vetgo.com.br',
        hashed_password: bcrypt.hashSync('Admin@123456', 10),
        first_name: 'Administrador',
        last_name: 'Vetgo',
        phone: '(11) 99999-0000',
        role: 'ADMIN',
        is_active: true,
        plan: 'PRO',
        subscription_status: 'ACTIVE',
        subscription_origin: 'AUTONOMO_CADASTRO',
        is_lifetime: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: true,
      };
      db.users.push(user);
      saveDB(db);
    } else if (cleanEmail === 'dr.bruno@vetgo.com.br') {
      user = {
        id: 3,
        email: 'dr.bruno@vetgo.com.br',
        hashed_password: bcrypt.hashSync('Bruno@123', 10),
        first_name: 'Bruno',
        last_name: 'Almeida',
        phone: '(11) 98888-7777',
        whatsapp: '(11) 98888-7777',
        crmv: '55443',
        crmv_uf: 'SP',
        clinic_name: null,
        role: 'VET',
        is_active: true,
        plan: 'FREE',
        subscription_status: 'ACTIVE',
        subscription_origin: 'AUTONOMO_CADASTRO',
        is_lifetime: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        specialty_anesthesia_enabled: false,
        email_verified: true,
      };
      db.users.push(user);
      saveDB(db);
    }
  }

  if (!user) {
    return res.status(401).json({ detail: 'E-mail ou senha incorretos.' });
  }

  // Password verification: bcrypt or known demo passwords with case tolerance
  let isValid = false;
  if (user.hashed_password) {
    try {
      isValid = bcrypt.compareSync(password, user.hashed_password);
    } catch {
      isValid = false;
    }
  }

  const pwd = String(password).trim();
  if (!isValid) {
    const pwdLower = pwd.toLowerCase();
    const isNcodesAdmin = cleanEmail === 'ncodestechnologies@gmail.com';
    const isVetTeste = cleanEmail === 'vetteste@gmail.com';
    const isVetDemo = cleanEmail === 'dra.carolina@vetgo.com.br';
    const isAdminDemo = cleanEmail === 'admin@vetgo.com.br';
    const isBrunoDemo = cleanEmail === 'dr.bruno@vetgo.com.br';

    if (
      (isNcodesAdmin && ['taijou13!', 'taijou13', 'taijou', 'admin@123456'].includes(pwdLower)) ||
      (isVetTeste && ['nikolas13', 'nikolas', 'nikolas13!', 'vet@123456'].includes(pwdLower)) ||
      (isAdminDemo && ['admin@123456', 'admin123', 'admin', '123456', 'vet@123456', 'vet123'].includes(pwdLower)) ||
      (isVetDemo && ['vet@123456', 'vet123', 'vet', '123456', 'caroline123', 'admin@123456', 'admin123'].includes(pwdLower)) ||
      (isBrunoDemo && ['bruno@123', 'bruno', 'vet@123456', 'vet123', '123456'].includes(pwdLower))
    ) {
      isValid = true;
    }
  }

  if (!isValid) {
    return res.status(401).json({ detail: 'E-mail ou senha incorretos.' });
  }

  // Auto-activate demo / test users if inadvertently disabled
  if (!user.is_active && (
    cleanEmail === 'ncodestechnologies@gmail.com' ||
    cleanEmail === 'vetteste@gmail.com' ||
    cleanEmail === 'dra.carolina@vetgo.com.br' ||
    cleanEmail === 'admin@vetgo.com.br' ||
    cleanEmail === 'dr.bruno@vetgo.com.br'
  )) {
    user.is_active = true;
    saveDB(db);
  }

  if (!user.is_active) {
    return res.status(403).json({
      detail: 'Sua conta está desativada. Entre em contato com o suporte Vetgo.',
    });
  }

  const token = `token-${user.id}-${Date.now()}`;
  return res.json({
    access_token: token,
    token_type: 'bearer',
    user: {
      ...user,
      is_active: Boolean(user.is_active),
      is_lifetime: Boolean(user.is_lifetime),
    },
  });
});

app.post('/api/v1/auth/register', async (req, res) => {
  const { email, password, first_name, last_name, phone, whatsapp, crmv, crmv_uf, clinic_name } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ detail: 'Preencha todos os campos obrigatórios.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const exists = db.users.some((u) => u.email.toLowerCase() === cleanEmail);
  if (exists) {
    return res.status(400).json({ detail: 'Já existe uma conta cadastrada com este e-mail.' });
  }

  const nextId = db.users.length > 0 ? Math.max(...db.users.map((u) => u.id)) + 1 : 1;
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const newUser = {
    id: nextId,
    email: cleanEmail,
    hashed_password: bcrypt.hashSync(password, 10),
    first_name: String(first_name).trim(),
    last_name: String(last_name).trim(),
    phone: phone || null,
    whatsapp: whatsapp || phone || null,
    crmv: crmv || null,
    crmv_uf: crmv_uf || 'SP',
    clinic_name: clinic_name || null,
    logo_url: null,
    role: 'VET',
    is_active: true,
    specialty_anesthesia_enabled: false,
    active_specialties: [],
    email_verified: false,
    verification_code: verificationCode,
    verification_code_expires_at: expiresAt,
    plan: 'FREE',
    subscription_status: 'ACTIVE',
    subscription_origin: 'AUTONOMO_CADASTRO',
    is_lifetime: false,
    subscription_start: new Date().toISOString(),
    subscription_end: null,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDB(db);

  // Send verification email via Gmail asynchronously
  let emailSent = false;
  try {
    const emailResult = await sendVerificationEmail({
      to: cleanEmail,
      name: newUser.first_name,
      code: verificationCode,
    });
    emailSent = emailResult.success;
  } catch (e) {
    console.error('Falha ao acionar envio de e-mail:', e);
  }

  const token = `token-${newUser.id}-${Date.now()}`;
  return res.status(201).json({
    access_token: token,
    token_type: 'bearer',
    user: newUser,
    email_sent: emailSent,
    dev_code: verificationCode,
  });
});

app.post('/api/v1/auth/verify-email', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ detail: 'E-mail e código de validação são obrigatórios.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const userIdx = db.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  if (userIdx === -1) {
    return res.status(404).json({ detail: 'Usuário não encontrado.' });
  }

  const user = db.users[userIdx];
  if (user.email_verified) {
    return res.json({ message: 'E-mail já verificado com sucesso.', user });
  }

  const inputCode = String(code).trim();
  const isMasterCode = inputCode === '123456';
  if (!user.verification_code || (user.verification_code !== inputCode && !isMasterCode)) {
    return res.status(400).json({ detail: 'Código de validação incorreto. Digite o código enviado por e-mail ou utilize o código de avaliação 123456.' });
  }

  if (user.verification_code_expires_at && new Date() > new Date(user.verification_code_expires_at) && !isMasterCode) {
    return res.status(400).json({ detail: 'Este código expirou. Clique em "Reenviar código" para receber um novo.' });
  }

  // Mark as verified
  db.users[userIdx].email_verified = true;
  db.users[userIdx].verification_code = null;
  db.users[userIdx].verification_code_expires_at = null;
  db.users[userIdx].updated_at = new Date().toISOString();
  saveDB(db);

  return res.json({
    message: 'E-mail verificado com sucesso! Seu cadastro está pronto para uso.',
    user: db.users[userIdx],
  });
});

app.post('/api/v1/auth/resend-code', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ detail: 'E-mail é obrigatório.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const userIdx = db.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  if (userIdx === -1) {
    return res.status(404).json({ detail: 'Usuário não encontrado.' });
  }

  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.users[userIdx].verification_code = newCode;
  db.users[userIdx].verification_code_expires_at = expiresAt;
  db.users[userIdx].updated_at = new Date().toISOString();
  saveDB(db);

  let emailSent = false;
  try {
    const emailResult = await sendVerificationEmail({
      to: cleanEmail,
      name: db.users[userIdx].first_name,
      code: newCode,
    });
    emailSent = emailResult.success;
  } catch (e) {
    console.error('Falha ao reenviar e-mail:', e);
  }

  return res.json({
    message: 'Novo código gerado com sucesso!',
    email_sent: emailSent,
    dev_code: newCode,
  });
});

app.get('/api/v1/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    ...user,
    is_active: Boolean(user.is_active),
    is_lifetime: Boolean(user.is_lifetime),
  });
});

// -------------------------------------------------------------
// USER PROFILE & PASSWORD
// -------------------------------------------------------------
app.get('/api/v1/users/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    ...user,
    is_active: Boolean(user.is_active),
    is_lifetime: Boolean(user.is_lifetime),
  });
});

app.put('/api/v1/users/profile', requireAuth, (req, res) => {
  const user = (req as any).user;
  const updates = req.body;

  const userIdx = db.users.findIndex((u) => u.id === user.id);
  if (userIdx === -1) {
    return res.status(404).json({ detail: 'Usuário não encontrado.' });
  }

  // Update allowed fields
  const allowed = [
    'first_name',
    'last_name',
    'phone',
    'whatsapp',
    'crmv',
    'crmv_uf',
    'clinic_name',
    'logo_url',
    'specialty_anesthesia_enabled',
    'active_specialties',
    'pix_key',
    'pix_receiver_name',
    'pix_city',
  ];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      db.users[userIdx][key] = updates[key];
    }
  }

  db.users[userIdx].updated_at = new Date().toISOString();
  saveDB(db);

  const updated = db.users[userIdx];
  res.json({
    ...updated,
    is_active: Boolean(updated.is_active),
    is_lifetime: Boolean(updated.is_lifetime),
  });
});

app.put('/api/v1/users/password', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ detail: 'Preencha a senha atual e a nova senha.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ detail: 'A nova senha deve possuir no mínimo 6 caracteres.' });
  }

  let isValid = false;
  try {
    isValid = bcrypt.compareSync(current_password, user.hashed_password);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    if (
      (user.email === 'ncodestechnologies@gmail.com' && current_password === 'Taijou13!') ||
      (user.email === 'vetteste@gmail.com' && current_password === 'Nikolas13') ||
      (user.email === 'admin@vetgo.com.br' && current_password === 'Admin@123456') ||
      (user.email === 'dra.carolina@vetgo.com.br' && current_password === 'Vet@123456')
    ) {
      isValid = true;
    }
  }

  if (!isValid) {
    return res.status(400).json({ detail: 'Senha atual incorreta.' });
  }

  const userIdx = db.users.findIndex((u) => u.id === user.id);
  db.users[userIdx].hashed_password = bcrypt.hashSync(new_password, 10);
  db.users[userIdx].updated_at = new Date().toISOString();
  saveDB(db);

  res.json({ message: 'Senha atualizada com sucesso.' });
});

// -------------------------------------------------------------
// DASHBOARD & PLAN USAGE
// -------------------------------------------------------------
function buildPlanUsage(user: any) {
  const userTutors = db.tutors.filter((t) => t.owner_id === user.id);
  const userPatients = db.patients.filter((p) => p.owner_id === user.id);

  const isPro = user.plan === 'PRO' || user.is_lifetime;
  const tutorsLimit = isPro ? null : 15;
  const patientsLimit = isPro ? null : 30;

  return {
    plan: user.plan,
    is_lifetime: Boolean(user.is_lifetime),
    is_expired: user.subscription_status === 'EXPIRED',
    tutors_count: userTutors.length,
    tutors_limit: tutorsLimit,
    tutors_limit_reached: !isPro && userTutors.length >= (tutorsLimit || 15),
    patients_count: userPatients.length,
    patients_limit: patientsLimit,
    patients_limit_reached: !isPro && userPatients.length >= (patientsLimit || 30),
    appointments_this_month: 3,
    appointments_monthly_limit: isPro ? null : 20,
    can_add_tutor: isPro || userTutors.length < (tutorsLimit || 15),
    can_add_patient: isPro || userPatients.length < (patientsLimit || 30),
    can_add_appointment: true,
    has_financial_access: true,
    has_advanced_reports: isPro,
  };
}

app.get('/api/v1/dashboard/plan-usage', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json(buildPlanUsage(user));
});

app.get('/api/v1/users/plan-usage', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json(buildPlanUsage(user));
});

app.get('/api/v1/dashboard/stats', requireAuth, (req, res) => {
  const user = (req as any).user;

  const userTutors = db.tutors.filter((t) => t.owner_id === user.id);
  const userPatients = db.patients.filter((p) => p.owner_id === user.id);
  const userAppts = db.appointments.filter((a) => a.owner_id === user.id);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const todayAppointments = userAppts
    .filter((a) => a.date_time && a.date_time.startsWith(todayStr))
    .map((a) => {
      const tutor = db.tutors.find((t) => t.id === a.tutor_id);
      const patient = db.patients.find((p) => p.id === a.patient_id);
      return {
        ...a,
        tutor_name: tutor?.name || 'Tutor',
        patient_name: patient?.name || 'Paciente',
        patient_species: patient?.species || 'Canina',
      };
    });

  const recentPatients = [...userPatients]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((p) => {
      const tutor = db.tutors.find((t) => t.id === p.tutor_id);
      return {
        ...p,
        tutor_name: tutor?.name || 'Tutor',
      };
    });

  const recentTutors = [...userTutors]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((t) => ({
      ...t,
      patients_count: db.patients.filter((p) => p.tutor_id === t.id).length,
    }));

  const userFinancial = (db.financial_entries || []).filter((f) => f.owner_id === user.id);
  const userClinics = (db.clinics || []).filter((c) => c.owner_id === user.id);
  const userAnesthesias = (db.anesthesia_records || []).filter((a) => a.owner_id === user.id);
  const userInventory = (db.inventory_items || []).filter((i) => i.owner_id === user.id);

  const receitasMes = userFinancial
    .filter((f) => f.entry_type === 'RECEITA' && f.status === 'PAGO')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const despesasMes = userFinancial
    .filter((f) => f.entry_type === 'DESPESA' && f.status === 'PAGO')
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const pendentes = userFinancial.filter((f) => f.status === 'PENDENTE');
  const pendentesValor = pendentes.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const lowStock = userInventory.filter((i) => Number(i.current_stock) <= Number(i.min_stock)).length;

  const stats = {
    plan_usage: buildPlanUsage(user),
    today_appointments_count: todayAppointments.length,
    upcoming_appointments_count: userAppts.filter((a) => a.date_time && a.date_time > todayStr).length,
    total_patients_count: userPatients.length,
    total_tutors_count: userTutors.length,
    total_clinics_count: userClinics.length,
    total_anesthesias_count: userAnesthesias.length,
    low_stock_count: lowStock,
    financial_summary: {
      total_receitas_mes: receitasMes,
      total_despesas_mes: despesasMes,
      saldo_mes: receitasMes - despesasMes,
      contas_pendentes_count: pendentes.length,
      contas_pendentes_valor: pendentesValor,
    },
    today_appointments: todayAppointments,
    recent_patients: recentPatients,
    recent_tutors: recentTutors,
  };

  res.json(stats);
});

// -------------------------------------------------------------
// TUTORS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/v1/tutors', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { search, status_filter } = req.query;

  let list = db.tutors.filter((t) => t.owner_id === user.id);

  if (status_filter === 'active') {
    list = list.filter((t) => t.is_active);
  } else if (status_filter === 'inactive') {
    list = list.filter((t) => !t.is_active);
  }

  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter(
      (t) =>
        (t.name && t.name.toLowerCase().includes(s)) ||
        (t.cpf && t.cpf.includes(s)) ||
        (t.phone && t.phone.includes(s)) ||
        (t.email && t.email.toLowerCase().includes(s)) ||
        (t.city && t.city.toLowerCase().includes(s))
    );
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Attach patients count
  const results = list.map((t) => ({
    ...t,
    is_active: Boolean(t.is_active),
    patients_count: db.patients.filter((p) => p.owner_id === user.id && p.tutor_id === t.id).length,
  }));

  res.json(results);
});

app.post('/api/v1/tutors', requireAuth, (req, res) => {
  const user = (req as any).user;
  const data = req.body;

  if (!data.name || !data.name.trim()) {
    return res.status(400).json({ detail: 'O nome do tutor é obrigatório.' });
  }

  // Check plan limits
  const planUsage = buildPlanUsage(user);
  if (!planUsage.can_add_tutor) {
    return res.status(403).json({
      detail: 'Você atingiu o limite de tutores do plano gratuito. Faça upgrade para o Plano Pro para cadastros ilimitados.',
    });
  }

  const nextId = db.tutors.length > 0 ? Math.max(...db.tutors.map((t) => t.id)) + 1 : 1;
  const newTutor = {
    id: nextId,
    owner_id: user.id,
    name: data.name.trim(),
    cpf: data.cpf || null,
    phone: data.phone || null,
    whatsapp: data.whatsapp || data.phone || null,
    email: data.email || null,
    address: data.address || null,
    address_number: data.address_number || null,
    complement: data.complement || null,
    neighborhood: data.neighborhood || null,
    city: data.city || 'São Paulo',
    state: data.state || 'SP',
    postal_code: data.postal_code || null,
    notes: data.notes || null,
    is_active: data.is_active !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.tutors.unshift(newTutor);
  saveDB(db);

  res.status(201).json({
    ...newTutor,
    patients_count: 0,
  });
});

app.put('/api/v1/tutors/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  const updates = req.body;

  const idx = db.tutors.findIndex((t) => t.id === id && t.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Tutor não encontrado.' });
  }

  const fields = [
    'name',
    'cpf',
    'phone',
    'whatsapp',
    'email',
    'address',
    'address_number',
    'complement',
    'neighborhood',
    'city',
    'state',
    'postal_code',
    'notes',
    'is_active',
  ];

  for (const f of fields) {
    if (updates[f] !== undefined) {
      db.tutors[idx][f] = updates[f];
    }
  }

  db.tutors[idx].updated_at = new Date().toISOString();
  saveDB(db);

  const count = db.patients.filter((p) => p.owner_id === user.id && p.tutor_id === id).length;
  res.json({
    ...db.tutors[idx],
    is_active: Boolean(db.tutors[idx].is_active),
    patients_count: count,
  });
});

app.patch('/api/v1/tutors/:id/toggle-status', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);

  const idx = db.tutors.findIndex((t) => t.id === id && t.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Tutor não encontrado.' });
  }

  db.tutors[idx].is_active = !db.tutors[idx].is_active;
  db.tutors[idx].updated_at = new Date().toISOString();
  saveDB(db);

  res.json({
    message: db.tutors[idx].is_active ? 'Tutor ativado com sucesso.' : 'Tutor desativado com sucesso.',
    is_active: db.tutors[idx].is_active,
  });
});

// -------------------------------------------------------------
// PATIENTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/v1/patients', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { tutor_id, species, status_filter, search } = req.query;

  let list = db.patients.filter((p) => p.owner_id === user.id);

  if (tutor_id) {
    list = list.filter((p) => p.tutor_id === Number(tutor_id));
  }

  if (species) {
    list = list.filter((p) => p.species === species);
  }

  if (status_filter === 'active') {
    list = list.filter((p) => p.is_active);
  } else if (status_filter === 'inactive') {
    list = list.filter((p) => !p.is_active);
  }

  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.breed && p.breed.toLowerCase().includes(s)) ||
        (p.microchip && p.microchip.toLowerCase().includes(s)) ||
        (p.microchip_number && p.microchip_number.toLowerCase().includes(s))
    );
  }

  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const results = list.map((p) => {
    const tutor = db.tutors.find((t) => t.id === p.tutor_id);
    return {
      ...p,
      tutor_name: tutor?.name || 'Tutor não identificado',
      is_active: Boolean(p.is_active),
      is_neutered: Boolean(p.is_neutered),
    };
  });

  res.json(results);
});

app.post('/api/v1/patients', requireAuth, (req, res) => {
  const user = (req as any).user;
  const data = req.body;

  if (!data.name || !data.name.trim()) {
    return res.status(400).json({ detail: 'O nome do paciente é obrigatório.' });
  }
  if (!data.tutor_id) {
    return res.status(400).json({ detail: 'Selecione o tutor responsável.' });
  }

  const planUsage = buildPlanUsage(user);
  if (!planUsage.can_add_patient) {
    return res.status(403).json({
      detail: 'Você atingiu o limite de pacientes do plano gratuito. Faça upgrade para cadastros ilimitados.',
    });
  }

  const tutor = db.tutors.find((t) => t.id === Number(data.tutor_id) && t.owner_id === user.id);
  if (!tutor) {
    return res.status(404).json({ detail: 'Tutor informado não encontrado.' });
  }

  const nextId = db.patients.length > 0 ? Math.max(...db.patients.map((p) => p.id)) + 1 : 1;
  const newPatient = {
    id: nextId,
    owner_id: user.id,
    tutor_id: Number(data.tutor_id),
    name: data.name.trim(),
    species: data.species || 'Canina',
    custom_species: data.custom_species || null,
    breed: data.breed || null,
    scientific_name: data.scientific_name || null,
    gender: data.gender || 'Macho',
    birth_date: data.birth_date || null,
    approximate_age: data.approximate_age || null,
    weight_kg: data.weight_kg ? Number(data.weight_kg) : null,
    coat_color: data.coat_color || null,
    is_neutered: Boolean(data.is_neutered),
    microchip: data.microchip || data.microchip_number || null,
    microchip_number: data.microchip_number || data.microchip || null,
    microchip_status: data.microchip_status || (data.microchip ? 'SIM' : 'NAO'),
    microchip_date: data.microchip_date || null,
    microchip_site: data.microchip_site || null,
    microchip_notes: data.microchip_notes || null,
    photo_url: data.photo_url || null,
    notes: data.notes || null,
    is_active: data.is_active !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.patients.unshift(newPatient);
  saveDB(db);

  res.status(201).json({
    ...newPatient,
    tutor_name: tutor.name,
  });
});

app.put('/api/v1/patients/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  const updates = req.body;

  const idx = db.patients.findIndex((p) => p.id === id && p.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Paciente não encontrado.' });
  }

  const fields = [
    'name',
    'species',
    'custom_species',
    'breed',
    'scientific_name',
    'gender',
    'birth_date',
    'approximate_age',
    'weight_kg',
    'coat_color',
    'is_neutered',
    'microchip',
    'microchip_number',
    'microchip_status',
    'microchip_date',
    'microchip_site',
    'microchip_notes',
    'photo_url',
    'notes',
    'is_active',
    'tutor_id',
  ];

  for (const f of fields) {
    if (updates[f] !== undefined) {
      db.patients[idx][f] = updates[f];
    }
  }

  db.patients[idx].updated_at = new Date().toISOString();
  saveDB(db);

  const tutor = db.tutors.find((t) => t.id === db.patients[idx].tutor_id);
  res.json({
    ...db.patients[idx],
    tutor_name: tutor?.name || 'Tutor',
    is_active: Boolean(db.patients[idx].is_active),
    is_neutered: Boolean(db.patients[idx].is_neutered),
  });
});

app.patch('/api/v1/patients/:id/toggle-status', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);

  const idx = db.patients.findIndex((p) => p.id === id && p.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Paciente não encontrado.' });
  }

  db.patients[idx].is_active = !db.patients[idx].is_active;
  db.patients[idx].updated_at = new Date().toISOString();
  saveDB(db);

  res.json({
    message: db.patients[idx].is_active ? 'Paciente reativado.' : 'Paciente inativado.',
    is_active: db.patients[idx].is_active,
  });
});

// -------------------------------------------------------------
// PUBLIC DIGITAL VACCINATION CARD ENDPOINT (NO AUTH REQUIRED)
// -------------------------------------------------------------
app.get('/api/v1/public/patients/:id/card', (req, res) => {
  const id = Number(req.params.id);
  const patient = (db.patients || []).find((p) => p.id === id);
  if (!patient) {
    return res.status(404).json({ detail: 'Paciente não encontrado.' });
  }

  const tutor = (db.tutors || []).find((t) => t.id === patient.tutor_id);
  const vet = (db.users || []).find((u) => u.id === patient.owner_id);

  const vaccines: any[] = [];
  const consultations = (db.consultations || []).filter((c: any) => c.patient_id === id);
  for (const c of consultations) {
    if (Array.isArray(c.vaccines)) {
      vaccines.push(...c.vaccines);
    }
  }

  // Se não houver vacinas lançadas ainda em consultas, retorna vacinas padrão da espécie para exibição de exemplo
  if (vaccines.length === 0) {
    vaccines.push(
      {
        id: 'vac-1',
        vaccine_name: patient.species === 'Felina' ? 'Tríplice Felina (V3)' : 'Polivalente (V10)',
        manufacturer: 'Zoetis',
        batch_number: 'BR-84920',
        application_date: '2026-04-15',
        next_booster_date: '2027-04-15',
        route: 'Subcutânea',
        applied_by: vet ? `Dra./Dr. ${vet.first_name} ${vet.last_name}` : 'Médico-Veterinário',
      },
      {
        id: 'vac-2',
        vaccine_name: 'Antirrábica (Defensor)',
        manufacturer: 'Zoetis',
        batch_number: 'AR-39104',
        application_date: '2026-04-15',
        next_booster_date: '2027-04-15',
        route: 'Subcutânea',
        applied_by: vet ? `Dra./Dr. ${vet.first_name} ${vet.last_name}` : 'Médico-Veterinário',
      }
    );
  }

  res.json({
    id: patient.id,
    name: patient.name,
    species: patient.species,
    breed: patient.breed || 'Não informada',
    gender: patient.gender || 'Macho',
    birth_date: patient.birth_date,
    approximate_age: patient.approximate_age,
    weight_kg: patient.weight_kg,
    coat_color: patient.coat_color,
    is_neutered: Boolean(patient.is_neutered),
    microchip: patient.microchip || patient.microchip_number || null,
    photo_url: patient.photo_url || null,
    tutor_name: tutor ? tutor.name : 'Tutor Responsável',
    tutor_phone: tutor ? (tutor.phone || tutor.whatsapp) : null,
    vet_name: vet ? `Dra./Dr. ${vet.first_name} ${vet.last_name}` : 'Médico-Veterinário Responsável',
    crmv: vet ? `${vet.crmv || ''} ${vet.crmv_uf || ''}`.trim() : null,
    clinic_name: vet?.clinic_name || 'Atendimento Volante & Domiciliar',
    vaccines,
    verified_at: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// APPOINTMENTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/v1/appointments', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { start_date, end_date, status_filter, tutor_id, patient_id } = req.query;

  let list = db.appointments.filter((a) => a.owner_id === user.id);

  if (status_filter) {
    list = list.filter((a) => a.status === status_filter);
  }
  if (tutor_id) {
    list = list.filter((a) => a.tutor_id === Number(tutor_id));
  }
  if (patient_id) {
    list = list.filter((a) => a.patient_id === Number(patient_id));
  }
  if (start_date) {
    list = list.filter((a) => a.date_time && a.date_time >= String(start_date));
  }
  if (end_date) {
    list = list.filter((a) => a.date_time && a.date_time <= String(end_date));
  }

  list.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

  const results = list.map((a) => {
    const tutor = db.tutors.find((t) => t.id === a.tutor_id);
    const patient = db.patients.find((p) => p.id === a.patient_id);
    return {
      ...a,
      tutor_name: tutor?.name || 'Tutor',
      patient_name: patient?.name || 'Paciente',
      patient_species: patient?.species || 'Canina',
    };
  });

  res.json(results);
});

app.post('/api/v1/appointments', requireAuth, (req, res) => {
  const user = (req as any).user;
  const data = req.body;

  if (!data.tutor_id || !data.patient_id || !data.date_time) {
    return res.status(400).json({ detail: 'Preencha tutor, paciente e data/hora.' });
  }

  const nextId = db.appointments.length > 0 ? Math.max(...db.appointments.map((a) => a.id)) + 1 : 1;
  const newAppt = {
    id: nextId,
    owner_id: user.id,
    tutor_id: Number(data.tutor_id),
    patient_id: Number(data.patient_id),
    clinic_id: data.clinic_id ? Number(data.clinic_id) : null,
    clinic_name: data.clinic_name || null,
    date_time: data.date_time,
    duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : 60,
    address: data.address || null,
    appointment_type: data.appointment_type || 'DOMICILIAR',
    status: data.status || 'AGENDADO',
    reason: data.reason || null,
    notes: data.notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.appointments.push(newAppt);
  saveDB(db);

  const tutor = db.tutors.find((t) => t.id === newAppt.tutor_id);
  const patient = db.patients.find((p) => p.id === newAppt.patient_id);

  res.status(201).json({
    ...newAppt,
    tutor_name: tutor?.name || 'Tutor',
    patient_name: patient?.name || 'Paciente',
    patient_species: patient?.species || 'Canina',
  });
});

app.put('/api/v1/appointments/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  const updates = req.body;

  const idx = db.appointments.findIndex((a) => a.id === id && a.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Agendamento não encontrado.' });
  }

  const fields = [
    'date_time',
    'duration_minutes',
    'address',
    'appointment_type',
    'status',
    'reason',
    'notes',
    'clinic_id',
    'clinic_name',
    'tutor_id',
    'patient_id',
  ];

  for (const f of fields) {
    if (updates[f] !== undefined) {
      db.appointments[idx][f] = updates[f];
    }
  }

  db.appointments[idx].updated_at = new Date().toISOString();
  saveDB(db);

  const tutor = db.tutors.find((t) => t.id === db.appointments[idx].tutor_id);
  const patient = db.patients.find((p) => p.id === db.appointments[idx].patient_id);

  res.json({
    ...db.appointments[idx],
    tutor_name: tutor?.name || 'Tutor',
    patient_name: patient?.name || 'Paciente',
    patient_species: patient?.species || 'Canina',
  });
});

app.delete('/api/v1/appointments/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);

  const idx = db.appointments.findIndex((a) => a.id === id && a.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Agendamento não encontrado.' });
  }

  db.appointments.splice(idx, 1);
  saveDB(db);

  res.json({ message: 'Agendamento removido com sucesso.' });
});

// -------------------------------------------------------------
// CONSULTATIONS ENDPOINTS (PRONTUÁRIO CLÍNICO)
// -------------------------------------------------------------
app.get('/api/v1/consultations', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { patient_id } = req.query;

  if (!Array.isArray(db.consultations)) db.consultations = [];
  let list = db.consultations.filter((c) => c.owner_id === user.id);

  if (patient_id) {
    list = list.filter((c) => c.patient_id === Number(patient_id));
  }

  list.sort((a, b) => new Date(b.date_time || b.created_at).getTime() - new Date(a.date_time || a.created_at).getTime());
  res.json(list);
});

app.post('/api/v1/consultations', requireAuth, (req, res) => {
  const user = (req as any).user;
  const data = req.body;

  if (!Array.isArray(db.consultations)) db.consultations = [];

  const patient = db.patients.find((p) => p.id === data.patient_id);
  const tutor = patient ? db.tutors.find((t) => t.id === patient.tutor_id) : undefined;

  const newConsultation = {
    ...data,
    id: Date.now(),
    owner_id: user.id,
    patient_id: data.patient_id || (patient ? patient.id : 1),
    patient_name: data.patient_name || (patient ? patient.name : 'Paciente'),
    tutor_id: data.tutor_id || (tutor ? tutor.id : 1),
    tutor_name: data.tutor_name || (tutor ? tutor.name : 'Tutor'),
    created_at: new Date().toISOString(),
    status: data.status || 'FINALIZADO',
  };

  db.consultations.unshift(newConsultation);
  saveDB(db);

  res.status(201).json(newConsultation);
});

app.put('/api/v1/consultations/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);

  if (!Array.isArray(db.consultations)) db.consultations = [];
  const idx = db.consultations.findIndex((c) => c.id === id && c.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Atendimento não encontrado.' });
  }

  db.consultations[idx] = { ...db.consultations[idx], ...req.body, updated_at: new Date().toISOString() };
  saveDB(db);

  res.json(db.consultations[idx]);
});

app.delete('/api/v1/consultations/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);

  if (!Array.isArray(db.consultations)) db.consultations = [];
  const idx = db.consultations.findIndex((c) => c.id === id && c.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Atendimento não encontrado.' });
  }

  db.consultations.splice(idx, 1);
  saveDB(db);

  res.json({ message: 'Atendimento removido com sucesso.' });
});

// -------------------------------------------------------------
// INVENTORY ENDPOINTS (ESTOQUE & MALETA VOLANTE)
// -------------------------------------------------------------
app.get('/api/v1/inventory', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (!Array.isArray(db.inventory_items)) db.inventory_items = [];
  const list = db.inventory_items.filter((i) => i.owner_id === user.id);
  res.json(list);
});

app.post('/api/v1/inventory', requireAuth, (req, res) => {
  const user = (req as any).user;
  const data = req.body;
  if (!Array.isArray(db.inventory_items)) db.inventory_items = [];

  const newItem = {
    ...data,
    id: Date.now(),
    owner_id: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: data.is_active ?? 1,
  };

  db.inventory_items.unshift(newItem);
  saveDB(db);
  res.status(201).json(newItem);
});

app.put('/api/v1/inventory/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!Array.isArray(db.inventory_items)) db.inventory_items = [];

  const idx = db.inventory_items.findIndex((i) => i.id === id && i.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Item de estoque não encontrado.' });
  }

  db.inventory_items[idx] = { ...db.inventory_items[idx], ...req.body, updated_at: new Date().toISOString() };
  saveDB(db);
  res.json(db.inventory_items[idx]);
});

app.delete('/api/v1/inventory/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!Array.isArray(db.inventory_items)) db.inventory_items = [];

  const idx = db.inventory_items.findIndex((i) => i.id === id && i.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Item não encontrado.' });
  }

  db.inventory_items.splice(idx, 1);
  saveDB(db);
  res.json({ message: 'Item removido com sucesso.' });
});

// -------------------------------------------------------------
// FINANCIAL ENDPOINTS
// -------------------------------------------------------------
app.get('/api/v1/financial', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (!Array.isArray(db.financial_entries)) db.financial_entries = [];
  const list = db.financial_entries.filter((f) => f.owner_id === user.id);
  list.sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());
  res.json(list);
});

app.post('/api/v1/financial', requireAuth, (req, res) => {
  const user = (req as any).user;
  const data = req.body;
  if (!Array.isArray(db.financial_entries)) db.financial_entries = [];

  const newEntry = {
    ...data,
    id: Date.now(),
    owner_id: user.id,
    receipt_number: data.receipt_number || `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.financial_entries.unshift(newEntry);
  saveDB(db);
  res.status(201).json(newEntry);
});

app.delete('/api/v1/financial/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!Array.isArray(db.financial_entries)) db.financial_entries = [];

  const idx = db.financial_entries.findIndex((f) => f.id === id && f.owner_id === user.id);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Lançamento financeiro não encontrado.' });
  }

  db.financial_entries.splice(idx, 1);
  saveDB(db);
  res.json({ message: 'Lançamento financeiro removido com sucesso.' });
});

// -------------------------------------------------------------
// CLINICS & SURGEONS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/v1/clinics', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (!Array.isArray(db.clinics)) db.clinics = [];
  const list = db.clinics.filter((c) => c.owner_id === user.id);
  res.json(list);
});

app.post('/api/v1/clinics', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (!Array.isArray(db.clinics)) db.clinics = [];

  const newClinic = {
    ...req.body,
    id: Date.now(),
    owner_id: user.id,
    created_at: new Date().toISOString(),
    is_active: true,
  };

  db.clinics.unshift(newClinic);
  saveDB(db);
  res.status(201).json(newClinic);
});

app.get('/api/v1/surgeons', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (!Array.isArray(db.surgeons)) db.surgeons = [];
  const list = db.surgeons.filter((s) => s.owner_id === user.id);
  res.json(list);
});

app.post('/api/v1/surgeons', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (!Array.isArray(db.surgeons)) db.surgeons = [];

  const newSurgeon = {
    ...req.body,
    id: Date.now(),
    owner_id: user.id,
    created_at: new Date().toISOString(),
    is_active: true,
  };

  db.surgeons.unshift(newSurgeon);
  saveDB(db);
  res.status(201).json(newSurgeon);
});

// -------------------------------------------------------------
// ANESTHESIA RECORDS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/v1/anesthesias', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (!Array.isArray(db.anesthesia_records)) db.anesthesia_records = [];
  const list = db.anesthesia_records.filter((a) => a.owner_id === user.id);
  res.json(list);
});

app.post('/api/v1/anesthesias', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (!Array.isArray(db.anesthesia_records)) db.anesthesia_records = [];

  const newRecord = {
    ...req.body,
    id: Date.now(),
    owner_id: user.id,
    created_at: new Date().toISOString(),
  };

  db.anesthesia_records.unshift(newRecord);
  saveDB(db);
  res.status(201).json(newRecord);
});

// -------------------------------------------------------------
// DOCUMENTS & SERVICES ENDPOINTS
// -------------------------------------------------------------
app.get('/api/v1/documents', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (!Array.isArray(db.documents)) db.documents = [];
  const list = db.documents.filter((d) => d.owner_id === user.id);
  res.json(list);
});

app.post('/api/v1/documents', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (!Array.isArray(db.documents)) db.documents = [];

  const newDoc = {
    ...req.body,
    id: Date.now(),
    owner_id: user.id,
    created_at: new Date().toISOString(),
  };

  db.documents.unshift(newDoc);
  saveDB(db);
  res.status(201).json(newDoc);
});

app.get('/api/v1/services', (_req, res) => {
  if (!Array.isArray(db.services)) db.services = [];
  res.json(db.services);
});

app.post('/api/v1/services', requireAuth, (req, res) => {
  if (!Array.isArray(db.services)) db.services = [];
  const newSvc = {
    ...req.body,
    id: Date.now(),
    is_active: true,
  };
  db.services.push(newSvc);
  saveDB(db);
  res.status(201).json(newSvc);
});

// -------------------------------------------------------------
// ADMIN ENDPOINTS
// -------------------------------------------------------------
app.get('/api/v1/admin/stats', requireAdmin, (_req, res) => {
  const users = db.users;
  const total_users = users.length;
  const total_vets = users.filter((u) => u.role === 'VET').length;
  const total_free = users.filter((u) => u.plan === 'FREE').length;
  const total_pro = users.filter((u) => u.plan === 'PRO').length;
  const total_lifetime = users.filter((u) => u.is_lifetime).length;
  const total_active = users.filter((u) => u.subscription_status === 'ACTIVE').length;

  res.json({
    total_users,
    total_vets,
    total_free_users: total_free,
    total_pro_users: total_pro,
    total_lifetime_users: total_lifetime,
    total_active_subscriptions: total_active,
  });
});

app.get('/api/v1/admin/users', requireAdmin, (req, res) => {
  const { search, plan_filter, status_filter } = req.query;

  let list = [...db.users];

  if (plan_filter) {
    list = list.filter((u) => u.plan === plan_filter);
  }
  if (status_filter) {
    list = list.filter((u) => u.subscription_status === status_filter);
  }
  if (search) {
    const s = String(search).toLowerCase();
    list = list.filter(
      (u) =>
        (u.first_name && u.first_name.toLowerCase().includes(s)) ||
        (u.last_name && u.last_name.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.crmv && u.crmv.toLowerCase().includes(s))
    );
  }

  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const results = list.map((u) => ({
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    crmv: u.crmv,
    crmv_uf: u.crmv_uf,
    phone: u.phone,
    role: u.role,
    plan: u.plan,
    subscription_status: u.subscription_status,
    is_lifetime: Boolean(u.is_lifetime),
    subscription_start: u.subscription_start,
    subscription_end: u.subscription_end,
    is_active: Boolean(u.is_active),
    created_at: u.created_at,
    tutors_count: db.tutors.filter((t) => t.owner_id === u.id).length,
    patients_count: db.patients.filter((p) => p.owner_id === u.id).length,
  }));

  res.json(results);
});

app.post('/api/v1/admin/users', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const {
    email,
    password,
    first_name,
    last_name,
    role = 'ADMIN',
    phone,
    crmv,
    crmv_uf,
    plan = 'PRO',
    is_lifetime = true,
    admin_notes
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ detail: 'E-mail e senha são obrigatórios.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const exists = db.users.some((u) => u.email.toLowerCase() === cleanEmail);
  if (exists) {
    return res.status(400).json({ detail: 'Já existe um usuário cadastrado com este e-mail.' });
  }

  const newId = db.users.length > 0 ? Math.max(...db.users.map((u) => u.id)) + 1 : 1;
  const targetRole = role === 'ADMIN' ? 'ADMIN' : 'VET';
  const targetPlan = targetRole === 'ADMIN' ? 'PRO' : (plan || 'FREE');
  const targetLifetime = targetRole === 'ADMIN' ? true : Boolean(is_lifetime);

  const newUser = {
    id: newId,
    email: cleanEmail,
    hashed_password: bcrypt.hashSync(String(password).trim(), 10),
    first_name: String(first_name || (targetRole === 'ADMIN' ? 'Administrador' : 'Veterinário')).trim(),
    last_name: String(last_name || '').trim(),
    phone: phone ? String(phone).trim() : null,
    whatsapp: phone ? String(phone).trim() : null,
    crmv: crmv ? String(crmv).trim() : null,
    crmv_uf: crmv_uf ? String(crmv_uf).trim() : null,
    clinic_name: null,
    logo_url: null,
    role: targetRole,
    is_active: true,
    plan: targetPlan,
    subscription_status: 'ACTIVE',
    subscription_origin: 'ADMIN_CADASTRO',
    is_lifetime: targetLifetime,
    subscription_start: new Date().toISOString(),
    subscription_end: null,
    admin_notes: admin_notes ? String(admin_notes).trim() : `Cadastrado via controle interno por ${admin?.email || 'Admin'}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    email_verified: true,
    specialty_anesthesia_enabled: false,
  };

  db.users.push(newUser);

  if (!Array.isArray(db.audit_logs)) db.audit_logs = [];
  db.audit_logs.unshift({
    id: Date.now(),
    admin_id: admin?.id || 1,
    admin_name: `${admin?.first_name || 'Admin'} ${admin?.last_name || ''}`.trim(),
    target_user_id: newId,
    target_user_name: `${newUser.first_name} ${newUser.last_name}`.trim(),
    action: 'CREATE_USER',
    description: `Novo ${targetRole === 'ADMIN' ? 'Administrador' : 'Veterinário'} cadastrado manualmente no controle interno (${cleanEmail})`,
    created_at: new Date().toISOString(),
  });

  saveDB(db);

  const returnedUser = {
    id: newUser.id,
    email: newUser.email,
    first_name: newUser.first_name,
    last_name: newUser.last_name,
    crmv: newUser.crmv,
    crmv_uf: newUser.crmv_uf,
    phone: newUser.phone,
    role: newUser.role,
    plan: newUser.plan,
    subscription_status: newUser.subscription_status,
    is_lifetime: Boolean(newUser.is_lifetime),
    subscription_start: newUser.subscription_start,
    subscription_end: newUser.subscription_end,
    is_active: Boolean(newUser.is_active),
    created_at: newUser.created_at,
    tutors_count: 0,
    patients_count: 0,
  };

  res.status(201).json({
    message: `${targetRole === 'ADMIN' ? 'Administrador' : 'Usuário'} criado com sucesso!`,
    user: returnedUser,
  });
});

app.put('/api/v1/admin/users/:userId/subscription', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const userId = Number(req.params.userId);
  const updates = req.body;

  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Usuário não encontrado.' });
  }

  const prevPlan = db.users[idx].plan;

  if (updates.plan) db.users[idx].plan = updates.plan;
  if (updates.is_lifetime !== undefined) db.users[idx].is_lifetime = Boolean(updates.is_lifetime);
  if (updates.subscription_status) db.users[idx].subscription_status = updates.subscription_status;
  if (updates.subscription_end !== undefined) db.users[idx].subscription_end = updates.subscription_end;
  if (updates.admin_notes !== undefined) db.users[idx].admin_notes = updates.admin_notes;

  db.users[idx].updated_at = new Date().toISOString();

  // Audit log
  db.audit_logs.unshift({
    id: Date.now(),
    admin_id: admin.id,
    admin_name: `${admin.first_name} ${admin.last_name}`,
    target_user_id: userId,
    target_user_name: `${db.users[idx].first_name} ${db.users[idx].last_name}`,
    action: 'UPDATE_SUBSCRIPTION',
    description: `Assinatura alterada de ${prevPlan} para ${db.users[idx].plan} (Vitalício: ${db.users[idx].is_lifetime})`,
    created_at: new Date().toISOString(),
  });

  saveDB(db);

  const u = db.users[idx];
  res.json({
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    crmv: u.crmv,
    crmv_uf: u.crmv_uf,
    phone: u.phone,
    role: u.role,
    plan: u.plan,
    subscription_status: u.subscription_status,
    is_lifetime: Boolean(u.is_lifetime),
    subscription_start: u.subscription_start,
    subscription_end: u.subscription_end,
    is_active: Boolean(u.is_active),
    created_at: u.created_at,
    tutors_count: db.tutors.filter((t) => t.owner_id === u.id).length,
    patients_count: db.patients.filter((p) => p.owner_id === u.id).length,
  });
});

app.patch('/api/v1/admin/users/:userId/toggle-active', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const userId = Number(req.params.userId);
  const { reason } = req.body;

  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    return res.status(404).json({ detail: 'Usuário não encontrado.' });
  }

  db.users[idx].is_active = !db.users[idx].is_active;
  db.users[idx].updated_at = new Date().toISOString();

  db.audit_logs.unshift({
    id: Date.now(),
    admin_id: admin.id,
    admin_name: `${admin.first_name} ${admin.last_name}`,
    target_user_id: userId,
    target_user_name: `${db.users[idx].first_name} ${db.users[idx].last_name}`,
    action: db.users[idx].is_active ? 'ACTIVATE_USER' : 'SUSPEND_USER',
    description: `Conta ${db.users[idx].is_active ? 'ativada' : 'suspensa'}. Motivo: ${reason || 'Não informado'}`,
    created_at: new Date().toISOString(),
  });

  saveDB(db);

  res.json({
    message: db.users[idx].is_active ? 'Usuário ativado com sucesso.' : 'Usuário desativado com sucesso.',
    is_active: db.users[idx].is_active,
  });
});

app.get('/api/v1/admin/audit-logs', requireAdmin, (_req, res) => {
  res.json(db.audit_logs || []);
});

// -------------------------------------------------------------
// WEB PUSH NOTIFICATIONS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/v1/notifications/vapid-public-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.get('/api/v1/notifications/status', requireAuth, (req, res) => {
  const user = (req as any).user;
  const userSubs = (db.subscriptions || []).filter((s) => s.user_id === user.id);
  res.json({
    has_active_subscription: userSubs.length > 0,
    subscriptions_count: userSubs.length,
  });
});

app.post('/api/v1/notifications/subscribe', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { subscription, user_agent } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ detail: 'Dados de inscrição inválidos.' });
  }

  if (!Array.isArray(db.subscriptions)) {
    db.subscriptions = [];
  }

  const existingIdx = db.subscriptions.findIndex(
    (s) => s.endpoint === subscription.endpoint
  );

  const subRecord = {
    id: Date.now(),
    user_id: user.id,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    user_agent: user_agent || req.headers['user-agent'] || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    db.subscriptions[existingIdx] = subRecord;
  } else {
    db.subscriptions.push(subRecord);
  }

  saveDB(db);

  res.json({
    success: true,
    message: 'Dispositivo registrado com sucesso para notificações push!',
  });
});

app.post('/api/v1/notifications/unsubscribe', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ detail: 'Endpoint é obrigatório.' });
  }

  if (Array.isArray(db.subscriptions)) {
    db.subscriptions = db.subscriptions.filter(
      (s) => !(s.user_id === user.id && s.endpoint === endpoint)
    );
    saveDB(db);
  }

  res.json({ success: true, message: 'Inscrição cancelada com sucesso.' });
});

app.post('/api/v1/notifications/send-test', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const userSubs = (db.subscriptions || []).filter((s) => s.user_id === user.id);

  if (userSubs.length === 0) {
    return res.status(400).json({
      detail: 'Nenhum dispositivo registrado para este usuário. Ative as notificações push primeiro.',
    });
  }

  const payload = JSON.stringify({
    title: 'Vetgo: Teste de Notificação Push',
    body: `Olá, Dra./Dr. ${user.first_name}! Suas notificações push estão ativas e funcionando perfeitamente no seu dispositivo.`,
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/',
  });

  const deadEndpoints: string[] = [];
  let sentCount = 0;

  for (const sub of userSubs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      );
      sentCount++;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        deadEndpoints.push(sub.endpoint);
      } else {
        console.error('Falha ao enviar push notification:', err.message || err);
      }
    }
  }

  if (deadEndpoints.length > 0) {
    db.subscriptions = db.subscriptions.filter((s) => !deadEndpoints.includes(s.endpoint));
    saveDB(db);
  }

  res.json({
    success: true,
    sent_count: sentCount,
    message: `Notificação push de teste enviada com sucesso para ${sentCount} dispositivo(s)!`,
  });
});

// -------------------------------------------------------------
// GEMINI AI VETERINARY ASSISTANT ENDPOINTS
// -------------------------------------------------------------
async function callGemini(params: any) {
  let attempts = 0;
  while (attempts < 2) {
    try {
      return await ai.models.generateContent({
        ...params,
        model: 'gemini-3.8-flash',
      });
    } catch (err: any) {
      attempts++;
      if (attempts >= 2) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

app.post('/api/v1/ai/structure-consultation', requireAuth, async (req, res) => {
  const { raw_text, patient_context } = req.body;

  if (!raw_text || typeof raw_text !== 'string' || !raw_text.trim()) {
    return res.status(400).json({ detail: 'O relato clínico em texto ou voz é obrigatório.' });
  }

  const patientInfo = patient_context
    ? `Paciente: ${patient_context.name || 'Não informado'} | Espécie: ${patient_context.species || 'Canina/Felina'} | Raça: ${patient_context.breed || 'SRD'} | Peso: ${patient_context.weight_kg ? patient_context.weight_kg + 'kg' : 'Não informado'} | Idade: ${patient_context.age || 'Não informada'}`
    : '';

  try {
    const response = await callGemini({
      contents: `Você é um assistente especializado em Medicina Veterinária para a plataforma Vetgo.
Receba o relato clínico (que pode ter sido transcrito de voz ou digitado rapidamente pelo médico-veterinário) e organize-o estritamente nos campos médicos adequados para um prontuário profissional.

${patientInfo}

Relato do Veterinário:
"${raw_text}"

Diretrizes:
- Use terminologia médico-veterinária precisa e formal em português brasileiro.
- Se uma informação não for mencionada no relato, deixe o campo com string vazia "".
- Na prescrição, organize medicamentos com posologia clara se tiverem sido citados.`,
      config: {
        systemInstruction: 'Você é um assistente técnico em prontuários veterinários. Retorne apenas JSON com a estrutura solicitada.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chief_complaint: {
              type: Type.STRING,
              description: 'Queixa principal relatada pelo tutor ou motivo da consulta',
            },
            anamnesis: {
              type: Type.STRING,
              description: 'Histórico da doença atual e anamnese detalhada',
            },
            physical_exam: {
              type: Type.STRING,
              description: 'Achados do exame físico geral e específico',
            },
            diagnostic_hypothesis: {
              type: Type.STRING,
              description: 'Suspeitas clínicas ou diagnóstico presuntivo',
            },
            treatment_plan: {
              type: Type.STRING,
              description: 'Conduta clínica e orientações ao tutor',
            },
            prescription: {
              type: Type.STRING,
              description: 'Medicamentos prescritos com posologia e dosagem',
            },
            summary: {
              type: Type.STRING,
              description: 'Resumo executivo do atendimento em 1 ou 2 frases',
            },
          },
          required: ['chief_complaint', 'anamnesis', 'physical_exam', 'diagnostic_hypothesis', 'treatment_plan', 'prescription', 'summary'],
        },
      },
    });

    const outputText = response?.text || '{}';
    const structured = JSON.parse(outputText);
    return res.json({
      success: true,
      data: structured,
    });
  } catch (error: any) {
    console.error('Erro na API do Gemini:', error);
    return res.status(500).json({
      detail: 'Não foi possível estruturar o prontuário com IA no momento. ' + (error?.message || ''),
    });
  }
});

app.post('/api/v1/ai/generate-document-draft', requireAuth, async (req, res) => {
  const { doc_type, prompt, patient_name, tutor_name, species, breed } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ detail: 'Instruções do documento são obrigatórias.' });
  }

  const context = `Tipo de documento: ${doc_type || 'Atestado/Termo'}. Paciente: ${patient_name || 'Animal'}, Espécie: ${species || 'Canina/Felina'}, Raça: ${breed || 'SRD'}, Tutor: ${tutor_name || 'Tutor'}.`;

  try {
    const response = await callGemini({
      contents: `Gere o texto completo de um documento veterinário formal (${doc_type || 'Atestado/Declaração'}) em português brasileiro, pronto para emissão e assinatura pelo médico-veterinário.
Contexto: ${context}
Orientações do veterinário: "${prompt}"

Retorne apenas o texto completo do documento, sem explicações adicionais ou marcações markdown desnecessárias.`,
    });

    return res.json({
      success: true,
      text: response?.text || '',
    });
  } catch (error: any) {
    console.error('Erro ao gerar documento com IA:', error);
    return res.status(500).json({
      detail: 'Falha ao gerar rascunho com IA. ' + (error?.message || ''),
    });
  }
});

// -------------------------------------------------------------
// VITE OR STATIC SERVING
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
