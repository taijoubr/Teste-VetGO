import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_current_admin
from app.models.user import User

router = APIRouter()

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "../../../smtp_config.json")

# Default SMTP settings
DEFAULT_SMTP = {
    "provider": "gmail",
    "user": "vetgoveterinarios@gmail.com",
    "pass": "zwhuxcxyfqtewqrb",
    "from_name": "Vetgo",
    "from_email": "vetgoveterinarios@gmail.com",
    "host": "smtp.gmail.com",
    "port": 465,
    "secure": True,
    "is_active": True,
    "is_configured": True
}

def load_smtp_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {**DEFAULT_SMTP, **data}
        except Exception:
            pass
    return DEFAULT_SMTP.copy()

def save_smtp_config(cfg: dict):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print("[SMTP CONFIG SAVE ERROR]:", e)

class SMTPSettingsIn(BaseModel):
    provider: Optional[str] = "gmail"
    user: Optional[str] = ""
    pass_: Optional[str] = None
    from_name: Optional[str] = "Vetgo"
    from_email: Optional[str] = ""
    host: Optional[str] = "smtp.gmail.com"
    port: Optional[int] = 465
    secure: Optional[bool] = True
    is_active: Optional[bool] = True

    class Config:
        fields = {'pass_': 'pass'}

class TestEmailIn(BaseModel):
    to: str
    provider: Optional[str] = None
    user: Optional[str] = None
    pass_: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    secure: Optional[bool] = None

    class Config:
        fields = {'pass_': 'pass'}

@router.get("/smtp")
def get_smtp_settings(admin: User = Depends(get_current_admin)):
    cfg = load_smtp_config()
    clean_pass = (cfg.get("pass") or "").replace(" ", "")
    has_pwd = bool(clean_pass)
    return {
        "provider": cfg.get("provider", "gmail"),
        "user": cfg.get("user", ""),
        "from_name": cfg.get("from_name", "Vetgo"),
        "from_email": cfg.get("from_email", cfg.get("user", "")),
        "host": cfg.get("host", "smtp.gmail.com"),
        "port": cfg.get("port", 465),
        "secure": cfg.get("secure", True),
        "is_active": cfg.get("is_active", True),
        "is_configured": True if cfg.get("user") and has_pwd else False,
        "has_password": has_pwd,
        "pass": cfg.get("pass", "")
    }

@router.post("/smtp")
def update_smtp_settings(data: dict, admin: User = Depends(get_current_admin)):
    current = load_smtp_config()
    
    provider = data.get("provider", current.get("provider", "gmail"))
    user = data.get("user", current.get("user", "")).strip()
    raw_pass = data.get("pass")
    
    # If password is placeholder or not provided, keep existing password
    if raw_pass and raw_pass != "••••••••":
        password = raw_pass.replace(" ", "").strip()
    else:
        password = current.get("pass", "")

    new_cfg = {
        "provider": provider,
        "user": user,
        "pass": password,
        "from_name": data.get("from_name", current.get("from_name", "Vetgo")).strip(),
        "from_email": data.get("from_email", current.get("from_email", user)).strip(),
        "host": data.get("host", "smtp.gmail.com" if provider == "gmail" else "smtp.resend.com"),
        "port": int(data.get("port") or (465 if provider == "gmail" else 587)),
        "secure": bool(data.get("secure", True)),
        "is_active": bool(data.get("is_active", True)),
        "is_configured": bool(user and password)
    }
    save_smtp_config(new_cfg)
    return {"message": "Configurações SMTP salvas com sucesso!", "is_configured": new_cfg["is_configured"]}

@router.post("/smtp/test")
def send_test_smtp_email(payload: dict, admin: User = Depends(get_current_admin)):
    to_email = payload.get("to", "").strip()
    if not to_email:
        raise HTTPException(status_code=400, detail="E-mail destinatário é obrigatório.")

    cfg = load_smtp_config()
    provider = payload.get("provider") or cfg.get("provider", "gmail")
    user = (payload.get("user") or cfg.get("user", "")).strip()
    pwd = (payload.get("pass") or cfg.get("pass", "")).replace(" ", "").strip()

    if not user or not pwd:
        raise HTTPException(status_code=400, detail="Credenciais de e-mail (usuário e senha) não configuradas.")

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{cfg.get('from_name', 'Vetgo')} <{user}>"
    msg["To"] = to_email
    msg["Subject"] = "Teste de Conexão SMTP - Vetgo"

    html = f"""
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; padding: 24px;">
        <h2 style="color: #047857; margin-top: 0;">✅ Conexão SMTP Bem-Sucedida!</h2>
        <p style="color: #334155; font-size: 14px;">Este é um e-mail de teste disparado pelo painel administrativo do <strong>Vetgo</strong>.</p>
        <p style="color: #64748b; font-size: 12px;">Provedor: {provider.upper()} | Remetente: {user}</p>
      </div>
    </div>
    """
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=12) as server:
            server.login(user, pwd)
            server.send_message(msg)
        return {"success": True, "message": f"E-mail de teste enviado com sucesso para {to_email}!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Falha ao enviar e-mail de teste: {str(e)}")

# GOOGLE AUTHENTICATION / SIGN-IN SETTINGS
DEFAULT_CLIENT_ID = "916489101501-qc2u92j7nhj0ou9j5et1frfu912eve3k.apps.googleusercontent.com"
GOOGLE_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "../../../google_auth_config.json")
GOOGLE_CONFIG_FILE_ALT = os.path.join(os.path.dirname(__file__), "../../../../google_auth_config.json")

def load_google_config() -> dict:
    env_client_id = os.environ.get("VITE_GOOGLE_CLIENT_ID", "")
    for path in [GOOGLE_CONFIG_FILE, GOOGLE_CONFIG_FILE_ALT]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    cid = data.get("client_id")
                    if cid:
                        return {"client_id": cid}
            except Exception:
                pass
    return {"client_id": env_client_id or DEFAULT_CLIENT_ID}

def save_google_config(cfg: dict):
    try:
        with open(GOOGLE_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print("[GOOGLE CONFIG SAVE ERROR]:", e)

@router.get("/public")
def get_public_settings():
    google_cfg = load_google_config()
    return {
        "google_client_id": google_cfg.get("client_id", "")
    }

@router.get("/google")
def get_google_settings(admin: User = Depends(get_current_admin)):
    cfg = load_google_config()
    cid = cfg.get("client_id", "")
    return {
        "client_id": cid,
        "is_configured": bool(cid and ".apps.googleusercontent.com" in cid)
    }

@router.post("/google")
def update_google_settings(data: dict, admin: User = Depends(get_current_admin)):
    cid = str(data.get("client_id", "")).strip()
    save_google_config({"client_id": cid})
    return {
        "message": "Configurações do Google salvas com sucesso!",
        "client_id": cid,
        "is_configured": bool(cid and ".apps.googleusercontent.com" in cid)
    }
