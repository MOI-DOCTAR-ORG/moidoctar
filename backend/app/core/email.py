import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("moidoctar.email")


def _smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Send an email via SMTP.

    Returns True if the message was handed off to the SMTP server
    successfully. If SMTP isn't configured (backend/.env), logs the email
    content instead of sending and returns False - this mirrors how
    Supabase/Gemini/Google auth already degrade gracefully elsewhere in
    this backend when their credentials are unset, so local dev/demo still
    works without real SMTP credentials.
    """
    if not _smtp_configured():
        logger.warning(
            "SMTP not configured (set SMTP_HOST/SMTP_USER/SMTP_PASSWORD in "
            f"backend/.env) - logging email instead of sending.\nTo: {to_email}\n"
            f"Subject: {subject}\n{text_body}"
        )
        return False

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
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_otp_email(to_email: str, code: str, purpose: str) -> bool:
    """Send a 6-digit OTP code for either 'verify_email' or 'reset_password'."""
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
<div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
  <h2 style="color:#2663EB; margin-bottom: 8px;">{heading}</h2>
  <p style="color:#374151; font-size: 15px;">{body_line}</p>
  <div style="margin: 24px 0; padding: 16px 24px; background:#eef2ff; border-radius: 12px; text-align:center;">
    <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color:#1F3A8A;">{code}</span>
  </div>
  <p style="color:#6b7280; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
  <p style="color:#9ca3af; font-size: 12px; margin-top:32px;">MoiDoctar &middot; AI-powered symptom triage</p>
</div>
"""
    return send_email(to_email, subject, html_body, text_body)
