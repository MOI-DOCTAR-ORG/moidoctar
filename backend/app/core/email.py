import json
import logging
import smtplib
import ssl
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple

from app.core.config import settings

logger = logging.getLogger("moidoctar.email")


def _send_via_resend(to_email: str, subject: str, html_body: str, text_body: str) -> Tuple[bool, str]:
    """Send an email using Resend's REST API (https://resend.com).
    
    Returns (success, detail_message).
    """
    api_key = (settings.RESEND_API_KEY or "").strip()
    if not api_key:
        return False, "RESEND_API_KEY is not set"

    url = "https://api.resend.com/emails"
    from_addr = (settings.RESEND_FROM or "MoiDoctar <onboarding@resend.dev>").strip()

    payload = {
        "from": from_addr,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "MoiDoctar/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.load(response)
            email_id = res_data.get("id")
            logger.info(f"Email successfully delivered via Resend to {to_email} (id: {email_id})")
            return True, f"Delivered (id: {email_id})"
    except urllib.error.HTTPError as exc:
        err_detail = exc.read().decode("utf-8", "replace")[:400]
        logger.error(f"Resend API HTTP error {exc.code} for {to_email}: {err_detail}")
        return False, f"HTTP {exc.code}: {err_detail}"
    except Exception as exc:
        logger.error(f"Resend network/request error for {to_email}: {exc}")
        return False, str(exc)


def _smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def _send_via_smtp(to_email: str, subject: str, html_body: str, text_body: str) -> Tuple[bool, str]:
    """Send an email via standard SMTP."""
    from_addr = settings.SMTP_FROM.strip() or settings.SMTP_USER

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        if settings.SMTP_USE_SSL:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=10) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.ehlo()
                if settings.SMTP_USE_TLS:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, [to_email], msg.as_string())
        logger.info(f"Email successfully sent via SMTP to {to_email}")
        return True, "Delivered via SMTP"
    except Exception as e:
        logger.error(f"Failed to send email via SMTP to {to_email}: {e}")
        return False, f"SMTP Error: {e}"


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> Tuple[bool, str]:
    """Send an email via Resend (preferred) or SMTP fallback."""
    # 1. Try Resend if configured
    if settings.RESEND_API_KEY:
        ok, detail = _send_via_resend(to_email, subject, html_body, text_body)
        if ok:
            return True, detail
        logger.warning(f"Resend delivery failed ({detail}); checking for SMTP fallback...")

    # 2. Try SMTP fallback if configured
    if _smtp_configured():
        return _send_via_smtp(to_email, subject, html_body, text_body)

    # 3. Graceful degradation: Log email delivery attempt without leaking OTP
    logger.warning(
        f"No email service configured (set RESEND_API_KEY in environment). Simulated email delivery for: {to_email}"
    )
    return False, "Logged to console (no email service active)"


def send_otp_email(to_email: str, code: str, purpose: str) -> Tuple[bool, str]:
    """Send a 6-digit OTP code for either 'verify_email' or 'reset_password'."""
    logger.info(f"[OTP] Verification code generated for {to_email} ({purpose})")

    if purpose == "reset_password":
        subject = "Your MoiDoctar password reset code"
        heading = "Reset your password"
        body_line = "Use the code below to reset your MoiDoctar password."
    else:
        subject = "Verify your MoiDoctar email"
        heading = "Verify your email"
        body_line = "Use the code below to verify your MoiDoctar account."

    text_body = (
        f"{heading}\n\n{body_line}\n\nYour code: {code}\n\n"
        "This code expires in 10 minutes. If you didn't request this, you can "
        "safely ignore this email."
    )
    html_body = f"""\
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
  <div style="margin-bottom: 24px;">
    <span style="font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px;">Moi<span style="color: #2563eb;">Doctar</span></span>
  </div>
  <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">{heading}</h2>
  <p style="color: #4b5563; font-size: 15px; line-height: 1.5; margin: 0 0 24px 0;">{body_line}</p>
  <div style="margin: 24px 0; padding: 20px 24px; background: #eff6ff; border-radius: 12px; text-align: center; border: 1px dashed #93c5fd;">
    <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1d4ed8; font-family: monospace;">{code}</span>
  </div>
  <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 24px 0;">This code will expire in <strong>10 minutes</strong>. If you did not request this verification, no action is needed.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">MoiDoctar &middot; AI-powered clinical symptom triage & health navigation</p>
</div>
"""
    return send_email(to_email, subject, html_body, text_body)
