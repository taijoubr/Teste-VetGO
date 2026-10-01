import nodemailer from 'nodemailer';

interface SendVerificationEmailOptions {
  to: string;
  name: string;
  code: string;
}

export async function sendVerificationEmail({
  to,
  name,
  code,
}: SendVerificationEmailOptions): Promise<{ success: boolean; mode: 'gmail' | 'dev'; error?: string }> {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || (gmailUser ? `Vetgo <${gmailUser}>` : 'Vetgo <contato@vetgo.com.br>');

  // Modo de Desenvolvimento: Se as credenciais do Gmail ainda não foram configuradas
  if (!gmailUser || !gmailPass || gmailUser.includes('seu-email') || gmailPass.includes('sua-senha')) {
    console.log('---------------------------------------------------------');
    console.log('📧 [VETGO EMAIL SERVICE - MODO DESENVOLVIMENTO]');
    console.log(`Para: ${to} (${name})`);
    console.log(`Código de Verificação: ${code}`);
    console.log('ℹ️ Para envio real via Gmail, insira GMAIL_USER e GMAIL_APP_PASSWORD.');
    console.log('---------------------------------------------------------');
    return { success: true, mode: 'dev' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

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

    await transporter.sendMail({
      from: emailFrom,
      to,
      subject: `Seu código de validação Vetgo: ${code}`,
      text: `Olá ${name || 'Doutor(a)'}!\n\nSeu código de validação do Vetgo é: ${code}\n\nEle é válido por 15 minutos.\n\nEquipe Vetgo`,
      html,
    });

    console.log(`[EMAIL ENVIADO VIA GMAIL] Para: ${to} | Código: ${code}`);
    return { success: true, mode: 'gmail' };
  } catch (error: any) {
    console.error('Erro ao enviar e-mail via Gmail:', error);
    return { success: false, mode: 'gmail', error: error?.message || 'Falha no envio de e-mail.' };
  }
}
