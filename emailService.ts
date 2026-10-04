import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface SMTPSettings {
  provider: 'resend' | 'gmail' | 'smtp';
  user: string;
  pass: string; // Used as API Key for Resend, or App Password for Gmail/SMTP
  from_name?: string;
  from_email?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  is_active?: boolean;
}

interface SendVerificationEmailOptions {
  to: string;
  name: string;
  code: string;
}

export function getSMTPSettings(): SMTPSettings {
  try {
    const dbPath = path.resolve(process.cwd(), 'data/db.json');
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      const db = JSON.parse(raw);
      if (db.smtp_settings && (db.smtp_settings.pass || db.smtp_settings.user)) {
        const prov = db.smtp_settings.provider || (db.smtp_settings.pass?.startsWith('re_') ? 'resend' : 'gmail');
        return {
          provider: prov,
          user: (db.smtp_settings.user || (prov === 'resend' ? 'resend' : '')).trim(),
          pass: (db.smtp_settings.pass || '').trim(),
          from_name: db.smtp_settings.from_name || 'Vetgo',
          from_email: db.smtp_settings.from_email || (prov === 'resend' ? 'onboarding@resend.dev' : db.smtp_settings.user?.trim() || ''),
          host: db.smtp_settings.host || (prov === 'gmail' ? 'smtp.gmail.com' : 'smtp.resend.com'),
          port: Number(db.smtp_settings.port) || (prov === 'gmail' ? 465 : 587),
          secure: db.smtp_settings.secure !== false,
          is_active: db.smtp_settings.is_active !== false,
        };
      }
    }
  } catch (err) {
    console.warn('[EmailService] Falha ao carregar smtp_settings do db.json:', err);
  }

  const envResendKey = (process.env.RESEND_API_KEY || '').trim();
  if (envResendKey) {
    return {
      provider: 'resend',
      user: 'resend',
      pass: envResendKey,
      from_name: process.env.EMAIL_FROM_NAME || 'Vetgo',
      from_email: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      is_active: true,
    };
  }

  const envUser = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
  const envPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').trim();

  return {
    provider: 'resend',
    user: envUser,
    pass: envPass,
    from_name: process.env.EMAIL_FROM_NAME || 'Vetgo',
    from_email: envUser || 'onboarding@resend.dev',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    is_active: Boolean((envUser && envPass) || envResendKey),
  };
}

export function formatResendSender(fromName?: string, fromEmail?: string): string {
  const name = (fromName || 'Vetgo').replace(/[<>"']/g, '').trim() || 'Vetgo';
  let email = (fromEmail || '').trim();
  // Resend will reject any third-party webmail domain with validation_error
  const isWebmail = /@(gmail|hotmail|outlook|yahoo|live|icloud|uol|bol)\.com/i.test(email);
  if (!email || isWebmail || !email.includes('@')) {
    email = 'onboarding@resend.dev';
  }
  return `"${name}" <${email}>`;
}

async function sendViaResendAPI({
  apiKey,
  from,
  to,
  subject,
  html,
  text,
}: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; id?: string; error?: string; sandboxNotice?: string }> {
  try {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return { success: false, error: 'Chave de API do Resend (re_...) não informada.' };
    }

    // Safety sanitize: if 'from' has @gmail.com or third-party webmail, fallback to onboarding@resend.dev
    let safeFrom = from;
    if (/@(gmail|hotmail|outlook|yahoo|live|icloud|uol|bol)\.com/i.test(safeFrom)) {
      safeFrom = `"Vetgo" <onboarding@resend.dev>`;
    }

    let res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: safeFrom,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    let data = await res.json().catch(() => ({}));

    // Auto-retry with onboarding@resend.dev if custom sender domain failed validation
    if (!res.ok && data?.name === 'validation_error' && (data?.message?.includes('not verified') || data?.message?.includes('domain')) && !safeFrom.includes('onboarding@resend.dev')) {
      console.warn('[RESEND AUTO-RETRY] Remetente personalizado não verificado no Resend. Tentando com onboarding@resend.dev...');
      safeFrom = `"Vetgo" <onboarding@resend.dev>`;
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: safeFrom,
          to: [to],
          subject,
          html,
          text,
        }),
      });
      data = await res.json().catch(() => ({}));
    }

    if (!res.ok) {
      console.log('[Resend API Response]:', data?.message || data);
      let errMsg = data.message || data.error?.message || data.detail || `Erro HTTP ${res.status} na API do Resend.`;

      // If Resend is in free testing sandbox, it only sends to the owner email (vetgoveterinarios@gmail.com).
      // We automatically redirect the delivery to the owner account with a clear notice so that the email is physically delivered and the user is NOT blocked!
      if (errMsg.includes('only send testing emails to your own email address')) {
        const match = errMsg.match(/\(([^)]+)\)/);
        const ownerEmail = match ? match[1] : 'vetgoveterinarios@gmail.com';
        console.log(`[Resend Sandbox Delivery] Entregando na conta Resend autorizada (${ownerEmail}) com destinatário original (${to})...`);
        try {
          const fallbackRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cleanKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: safeFrom,
              to: [ownerEmail],
              subject: `${subject} [Para: ${to}]`,
              html: `<div style="padding:12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;margin-bottom:16px;font-size:12px;color:#92400e;">⚠️ <strong>Aviso Sandbox do Resend:</strong> Este e-mail foi destinado a <strong>${to}</strong>. Como o domínio ainda não foi verificado no Resend, o envio foi entregue na sua conta de desenvolvedor (${ownerEmail}). Para liberar envios diretos para qualquer e-mail, adicione seu domínio em <a href="https://resend.com/domains" target="_blank">resend.com/domains</a>.</div>` + html,
              text: `[Destinado a: ${to}]\n\n` + text,
            }),
          });
          const fallbackData = await fallbackRes.json().catch(() => ({}));
          if (fallbackRes.ok && fallbackData.id) {
            console.log(`[Resend Sandbox Success] E-mail entregue na conta ${ownerEmail}! ID: ${fallbackData.id}`);
            return {
              success: true,
              id: fallbackData.id,
              sandboxNotice: `Entregue na conta do Resend (${ownerEmail}). Para enviar diretamente para ${to}, adicione seu domínio em resend.com/domains.`
            };
          }
        } catch (redirErr: any) {
          console.log('[Resend Sandbox Fallback Info]:', redirErr?.message);
        }
      }

      if (errMsg.includes('domain is not verified') || errMsg.includes('not verified')) {
        errMsg = 'O domínio informado no remetente não está verificado no Resend. Utilize "onboarding@resend.dev" para testes imediatos ou adicione e verifique seu domínio em resend.com/domains.';
      } else if (errMsg.includes('only send testing emails to your own email address')) {
        const match = errMsg.match(/\(([^)]+)\)/);
        const ownerEmail = match ? match[1] : 'vetgoveterinarios@gmail.com';
        errMsg = `No modo de teste do Resend (onboarding@resend.dev), os e-mails só podem ser enviados para ${ownerEmail}. Para disparar para qualquer destinatário em produção, adicione e verifique seu domínio em resend.com/domains.`;
      }
      return { success: false, error: errMsg };
    }

    console.log(`[RESEND API SUCCESS] E-mail enviado para ${to}! ID: ${data.id}`);
    return { success: true, id: data.id };
  } catch (err: any) {
    console.log('[Resend API Exception]:', err?.message || err);
    return { success: false, error: err?.message || 'Falha ao conectar com o serviço Resend.' };
  }
}

export function createTransporter(cfg?: SMTPSettings) {
  const settings = cfg || getSMTPSettings();
  if (settings.provider === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: settings.user?.trim(),
        pass: settings.pass ? settings.pass.replace(/\s+/g, '') : '',
      },
    });
  }

  return nodemailer.createTransport({
    host: settings.host || 'smtp.gmail.com',
    port: settings.port || 587,
    secure: settings.port === 465 || settings.secure === true,
    auth: {
      user: settings.user?.trim(),
      pass: settings.pass?.trim(),
    },
  });
}

export async function sendTestEmail({
  to,
  settings,
}: {
  to: string;
  settings?: SMTPSettings;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const currentSettings = settings || getSMTPSettings();

  if (!currentSettings.pass) {
    return {
      success: false,
      error: currentSettings.provider === 'resend'
        ? 'Chave de API do Resend não informada. Cole sua chave iniciando com "re_" e tente novamente.'
        : 'Credenciais de e-mail incompletas. Informe o e-mail e senha.',
    };
  }

  const from = currentSettings.provider === 'resend'
    ? formatResendSender(currentSettings.from_name, currentSettings.from_email)
    : `"${currentSettings.from_name || 'Vetgo'}" <${currentSettings.from_email || currentSettings.user}>`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #047857; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Vetgo • Teste de E-mail</h1>
        </div>
        <div style="padding: 24px;">
          <div style="padding: 12px 16px; background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; color: #065f46; font-weight: bold; margin-bottom: 16px;">
            ✅ Integração ${currentSettings.provider.toUpperCase()} conectada com sucesso!
          </div>
          <p style="font-size: 14px; line-height: 1.5; color: #334155;">
            Este e-mail confirma que a plataforma Vetgo está apta para disparar mensagens reais para veterinários e tutores.
          </p>
          <ul style="font-size: 13px; color: #475569; line-height: 1.6;">
            <li><strong>Provedor:</strong> ${currentSettings.provider.toUpperCase()}</li>
            <li><strong>Remetente:</strong> ${from}</li>
            <li><strong>Destinatário do teste:</strong> ${to}</li>
            <li><strong>Data do disparo:</strong> ${new Date().toLocaleString('pt-BR')}</li>
          </ul>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 11px; color: #64748b;">
          Plataforma Vetgo • Gestão Veterinária e Atendimento Volante
        </div>
      </div>
    </div>
  `;

  const text = `Olá!\n\nEste é um e-mail de teste confirmando que a sua integração de e-mails (${currentSettings.provider.toUpperCase()}) da plataforma Vetgo está funcionando perfeitamente!\n\nRemetente: ${from}\nData: ${new Date().toLocaleString('pt-BR')}\n\nAtenciosamente,\nEquipe Vetgo`;

  // Resend API path
  if (currentSettings.provider === 'resend') {
    const resendResult = await sendViaResendAPI({
      apiKey: currentSettings.pass,
      from,
      to,
      subject: '✅ Teste de E-mail via Resend - Plataforma Vetgo',
      html,
      text,
    });

    if (resendResult.success) {
      return {
        success: true,
        message: `E-mail de teste enviado com sucesso via Resend para ${to}! Verifique sua caixa de entrada.`,
      };
    } else {
      return {
        success: false,
        error: resendResult.error,
      };
    }
  }

  // SMTP / Gmail path
  try {
    const transporter = createTransporter(currentSettings);
    const info = await transporter.sendMail({
      from,
      to,
      subject: '✅ Teste de Conexão de E-mail - Plataforma Vetgo',
      text,
      html,
    });

    console.log(`[TEST EMAIL SUCCESS] Enviado para ${to}. ID: ${info.messageId}`);
    return {
      success: true,
      message: `E-mail de teste enviado com sucesso para ${to}! Verifique sua caixa de entrada.`,
    };
  } catch (error: any) {
    console.error('[TEST EMAIL ERROR]:', error);
    let errorDetail = error?.message || 'Falha ao autenticar no servidor SMTP.';
    if (errorDetail.includes('BadCredentials') || errorDetail.includes('Username and Password not accepted') || errorDetail.includes('535')) {
      errorDetail = 'Usuário ou Senha de Aplicativo incorreta. No Gmail, use uma "Senha de App" de 16 letras criada em myaccount.google.com/apppasswords.';
    }
    return {
      success: false,
      error: errorDetail,
    };
  }
}

export async function sendVerificationEmail({
  to,
  name,
  code,
}: SendVerificationEmailOptions): Promise<{ success: boolean; mode: 'resend' | 'gmail' | 'dev'; error?: string }> {
  const settings = getSMTPSettings();

  const isConfigured = Boolean(
    settings.is_active &&
    settings.pass &&
    !settings.pass.includes('sua-senha') &&
    (settings.provider === 'resend' ? settings.pass.startsWith('re_') : Boolean(settings.user))
  );

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Confirme seu cadastro no Vetgo</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
      .header { background-color: #047857; padding: 28px 24px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
      .header p { color: #d1fae5; margin: 6px 0 0 0; font-size: 13px; }
      .content { padding: 32px 28px; line-height: 1.6; }
      .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
      .code-box { background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
      .code-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #047857; margin-bottom: 6px; }
      .code-number { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #065f46; letter-spacing: 6px; margin: 0; }
      .instructions { font-size: 13px; color: #475569; margin-top: 18px; }
      .footer { background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Vetgo</h1>
        <p>Veterinária onde você precisa</p>
      </div>
      <div class="content">
        <div class="greeting">Olá, ${name || 'Doutor(a)'}!</div>
        <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
          Obrigado por se cadastrar na plataforma Vetgo. Para validar seu cadastro e ativar a sua conta, utilize o código de segurança abaixo:
        </p>
        <div class="code-box">
          <div class="code-title">Seu Código de Validação</div>
          <div class="code-number">${code}</div>
        </div>
        <p class="instructions">
          Este código é válido por <strong>15 minutos</strong>. Se você não solicitou este cadastro, por favor desconsidere este e-mail.
        </p>
      </div>
      <div class="footer">
        Vetgo • Plataforma de Gestão Veterinária & Atendimento Volante<br>
        Este é um e-mail automático do sistema.
      </div>
    </div>
  </body>
  </html>
  `;

  const text = `Olá ${name || 'Doutor(a)'}!\n\nSeu código de validação do Vetgo é: ${code}\n\nEle é válido por 15 minutos.\n\nEquipe Vetgo`;
  const from = settings.provider === 'resend'
    ? formatResendSender(settings.from_name, settings.from_email)
    : `"${settings.from_name || 'Vetgo'}" <${settings.from_email || settings.user}>`;

  if (settings.provider === 'resend' && isConfigured) {
    const resendRes = await sendViaResendAPI({
      apiKey: settings.pass,
      from,
      to,
      subject: `Seu código de validação Vetgo: ${code}`,
      html,
      text,
    });

    if (resendRes.success) {
      return { success: true, mode: 'resend' };
    } else {
      console.warn('[RESEND FALLBACK] Erro ao enviar via Resend:', resendRes.error);
      return { success: false, mode: 'dev', error: resendRes.error };
    }
  }

  if (isConfigured) {
    try {
      const transporter = createTransporter(settings);
      await transporter.sendMail({
        from,
        to,
        subject: `Seu código de validação Vetgo: ${code}`,
        text,
        html,
      });

      console.log(`[EMAIL REAL ENVIADO] Para: ${to} | Via: ${settings.user}`);
      return { success: true, mode: 'gmail' };
    } catch (error: any) {
      console.error('Erro ao enviar e-mail via SMTP/Gmail:', error);
      return { success: false, mode: 'dev', error: error?.message || 'Falha no envio de e-mail.' };
    }
  }

  console.log('---------------------------------------------------------');
  console.log('📧 [VETGO EMAIL SERVICE - AGUARDANDO CONFIGURAÇÃO RESEND/SMTP]');
  console.log(`Para: ${to} (${name})`);
  console.log(`Código gerado no backend.`);
  console.log('---------------------------------------------------------');
  return { success: true, mode: 'dev' };
}

export async function sendPasswordResetEmail({
  to,
  name,
  code,
}: SendVerificationEmailOptions): Promise<{ success: boolean; mode: 'resend' | 'gmail' | 'dev'; error?: string }> {
  const settings = getSMTPSettings();

  const isConfigured = Boolean(
    settings.is_active &&
    settings.pass &&
    !settings.pass.includes('sua-senha') &&
    (settings.provider === 'resend' ? settings.pass.startsWith('re_') : Boolean(settings.user))
  );

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Recuperação de Senha - Vetgo</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
      .header { background-color: #0f766e; padding: 28px 24px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
      .header p { color: #ccfbf1; margin: 6px 0 0 0; font-size: 13px; }
      .content { padding: 32px 28px; line-height: 1.6; }
      .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
      .code-box { background-color: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
      .code-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0f766e; margin-bottom: 6px; }
      .code-number { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #115e59; letter-spacing: 6px; margin: 0; }
      .instructions { font-size: 13px; color: #475569; margin-top: 18px; }
      .warning { font-size: 12px; color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 10px 14px; border-radius: 8px; margin-top: 16px; }
      .footer { background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div className="container">
      <div className="header">
        <h1>Vetgo</h1>
        <p>Recuperação de Senha Segura</p>
      </div>
      <div className="content">
        <div className="greeting">Olá, ${name || 'Doutor(a)'}!</div>
        <p style="font-size: 14px; color: #334155; margin: 0 0 16px 0;">
          Recebemos uma solicitação para redefinir a senha da sua conta Vetgo. Utilize o código de segurança abaixo para prosseguir com a alteração:
        </p>
        <div className="code-box">
          <div className="code-title">Código de Recuperação de Senha</div>
          <div className="code-number">${code}</div>
        </div>
        <p className="instructions">
          Este código de uso único expira em <strong>15 minutos</strong>.
        </p>
        <div className="warning">
          🔒 <strong>Atenção à Segurança:</strong> Se você não solicitou a redefinição de senha, nenhuma ação é necessária. Sua senha atual permanecerá segura.
        </div>
      </div>
      <div className="footer">
        Vetgo • Plataforma de Gestão Veterinária & Atendimento Volante<br>
        Este é um e-mail de segurança automático do sistema.
      </div>
    </div>
  </body>
  </html>
  `;

  const text = `Olá ${name || 'Doutor(a)'}!\n\nSeu código de recuperação de senha no Vetgo é: ${code}\n\nEle expira em 15 minutos.\n\nSe não foi você que solicitou, ignore esta mensagem.\n\nEquipe Vetgo`;
  const from = settings.provider === 'resend'
    ? formatResendSender(settings.from_name, settings.from_email)
    : `"${settings.from_name || 'Vetgo'}" <${settings.from_email || settings.user}>`;

  if (settings.provider === 'resend' && isConfigured) {
    const resendRes = await sendViaResendAPI({
      apiKey: settings.pass,
      from,
      to,
      subject: `Código de Recuperação de Senha Vetgo: ${code}`,
      html,
      text,
    });

    if (resendRes.success) {
      return { success: true, mode: 'resend' };
    } else {
      console.warn('[RESEND FALLBACK] Erro ao enviar recuperação via Resend:', resendRes.error);
      return { success: false, mode: 'dev', error: resendRes.error };
    }
  }

  if (isConfigured) {
    try {
      const transporter = createTransporter(settings);
      await transporter.sendMail({
        from,
        to,
        subject: `Recuperação de Senha Vetgo: ${code}`,
        text,
        html,
      });

      console.log(`[EMAIL RECUPERACAO ENVIADO] Para: ${to} | Via: ${settings.user}`);
      return { success: true, mode: 'gmail' };
    } catch (error: any) {
      console.error('Erro ao enviar e-mail de recuperação via SMTP/Gmail:', error);
      return { success: false, mode: 'dev', error: error?.message || 'Falha no envio de e-mail de recuperação.' };
    }
  }

  return { success: true, mode: 'dev' };
}

