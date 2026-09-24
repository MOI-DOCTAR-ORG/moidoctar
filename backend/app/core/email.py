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
    api_key = settings.effective_resend_api_key
    if not api_key:
        return False, "RESEND_API_KEY is not set"

    url = "https://api.resend.com/emails"
    from_addr = settings.effective_resend_from
    recipient = to_email.strip().lower()

    payload = {
        "from": from_addr,
        "to": [recipient],
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
            logger.info(f"Email successfully delivered via Resend to {recipient} (id: {email_id})")
            return True, f"Delivered (id: {email_id})"
    except urllib.error.HTTPError as exc:
        err_raw = exc.read().decode("utf-8", "replace")
        try:
            err_json = json.loads(err_raw)
            err_msg = err_json.get("message") or err_json.get("name") or err_raw
        except Exception:
            err_msg = err_raw[:300]

        # Specific diagnosis for Resend testing domain (onboarding@resend.dev)
        if "only send testing emails to your own email address" in err_msg.lower():
            logger.warning(
                f"[Resend Sandbox Restriction] Cannot deliver email to {recipient}. "
                f"Resend's free default domain (onboarding@resend.dev) only allows sending to the Resend account owner. "
                f"To send to any recipient, verify your domain at resend.com/domains and set RESEND_FROM."
            )
            return False, f"Resend sandbox restriction: {err_msg}"

        logger.error(f"Resend API HTTP error {exc.code} for {recipient}: {err_msg}")
        return False, f"HTTP {exc.code}: {err_msg}"
    except Exception as exc:
        logger.error(f"Resend network/request error for {recipient}: {exc}")
        return False, str(exc)


def _smtp_configured() -> bool:
    return bool(settings.effective_smtp_host and settings.effective_smtp_user and settings.effective_smtp_password)


def _send_via_smtp(to_email: str, subject: str, html_body: str, text_body: str) -> Tuple[bool, str]:
    """Send an email via standard SMTP."""
    host = settings.effective_smtp_host
    user = settings.effective_smtp_user
    password = settings.effective_smtp_password
    from_addr = settings.effective_smtp_from or user
    recipient = to_email.strip().lower()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = recipient
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        if settings.SMTP_USE_SSL:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, settings.SMTP_PORT, context=context, timeout=10) as server:
                server.login(user, password)
                server.sendmail(from_addr, [recipient], msg.as_string())
        else:
            with smtplib.SMTP(host, settings.SMTP_PORT, timeout=10) as server:
                server.ehlo()
                if settings.SMTP_USE_TLS:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                server.login(user, password)
                server.sendmail(from_addr, [recipient], msg.as_string())
        logger.info(f"Email successfully sent via SMTP to {recipient}")
        return True, "Delivered via SMTP"
    except Exception as e:
        logger.error(f"Failed to send email via SMTP to {recipient}: {e}")
        return False, f"SMTP Error: {e}"



def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> Tuple[bool, str]:
    """Send an email via Resend (preferred) or SMTP fallback."""
    recipient = to_email.strip().lower()
    last_error = ""

    # 1. Try Resend if configured
    if settings.effective_resend_api_key:
        ok, detail = _send_via_resend(recipient, subject, html_body, text_body)
        if ok:
            return True, detail
        last_error = detail
        logger.warning(f"Resend delivery failed for {recipient} ({detail}); checking for SMTP fallback...")

    # 2. Try SMTP fallback if configured
    if _smtp_configured():
        ok, detail = _send_via_smtp(recipient, subject, html_body, text_body)
        if ok:
            return True, detail
        last_error = f"{last_error} | SMTP: {detail}" if last_error else detail

    # 3. If an email service failed, return its detailed message
    if last_error:
        logger.error(f"Email delivery could not be completed for {recipient}: {last_error}")
        return False, last_error

    logger.warning(
        f"No email service configured (set RESEND_API_KEY in environment). Simulated email delivery for: {recipient}"
    )
    return False, "No email service configured"


def send_otp_email(to_email: str, code: str, purpose: str) -> Tuple[bool, str]:
    """Send a 6-digit OTP code for either 'verify_email' or 'reset_password'."""
    recipient = to_email.strip().lower()
    logger.info(f"[OTP] Verification code generated for {recipient} ({purpose})")

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
    ok, detail = send_email(recipient, subject, html_body, text_body)
    if not ok:
        logger.warning(f"[OTP Fallback] Email delivery not completed for {recipient}. Code: {code}. Reason: {detail}")
    return ok, detail
