import json
import logging
import smtplib
import socket
import ssl
import time
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple

from app.core.config import settings

logger = logging.getLogger("moidoctar.email")

# Module-level circuit breaker: if raw TCP SMTP times out (e.g. cloud provider firewall
# blocking ports 465/587), disable SMTP attempts for 5 minutes so subsequent requests don't hang.
_smtp_circuit_broken_until: float = 0.0


def _send_via_brevo(to_email: str, subject: str, html_body: str, text_body: str) -> Tuple[bool, str]:
    """Send an email using Brevo's (formerly Sendinblue) REST API (https://brevo.com).
    
    Brevo operates over standard HTTPS (Port 443), so it is NEVER blocked by cloud
    hosting firewalls or edge platforms. The free tier includes 300 emails/day forever
    and allows sending to ANY recipient using a verified email (no custom domain required).
    """
    api_key = settings.effective_brevo_api_key
    if not api_key:
        return False, "BREVO_API_KEY is not set"

    url = "https://api.brevo.com/v3/smtp/email"
    recipient = to_email.strip().lower()
    from_email = settings.effective_brevo_from_email
    from_name = settings.effective_brevo_from_name

    payload = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": recipient}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_body,
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "MoiDoctar/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            res_data = json.load(response)
            msg_id = res_data.get("messageId")
            logger.info(f"Email successfully delivered via Brevo to {recipient} (messageId: {msg_id})")
            return True, f"Delivered via Brevo (messageId: {msg_id})"
    except urllib.error.HTTPError as exc:
        err_raw = exc.read().decode("utf-8", "replace")
        try:
            err_json = json.loads(err_raw)
            err_msg = err_json.get("message") or err_json.get("code") or err_raw
        except Exception:
            err_msg = err_raw[:300]
        logger.error(f"Brevo API HTTP error {exc.code} for {recipient}: {err_msg}")
        return False, f"Brevo HTTP {exc.code}: {err_msg}"
    except Exception as exc:
        logger.error(f"Brevo network error for {recipient}: {exc}")
        return False, str(exc)


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
        with urllib.request.urlopen(req, timeout=8) as response:
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
    """Send an email via standard SMTP with automatic port/SSL fallback and circuit breaker."""
    global _smtp_circuit_broken_until
    import email.utils

    # Circuit breaker: if SMTP previously timed out due to hosting firewall port blocks,
    # skip raw SMTP immediately so requests finish in milliseconds instead of hanging 30s.
    now = time.time()
    if now < _smtp_circuit_broken_until:
        remaining = int(_smtp_circuit_broken_until - now)
        logger.warning(f"SMTP is paused ({remaining}s remaining) due to cloud firewall port block detection.")
        return False, f"SMTP blocked by cloud firewall (circuit breaker active for {remaining}s)"

    host = settings.effective_smtp_host
    user = settings.effective_smtp_user
    password = settings.effective_smtp_password
    primary_port = settings.effective_smtp_port
    primary_use_ssl = settings.effective_smtp_use_ssl
    use_tls = settings.effective_smtp_use_tls

    from_header = settings.effective_smtp_from
    recipient = to_email.strip().lower()

    # CRITICAL: RFC 5321 envelope sender must be a bare email address,
    # not a formatted display name like "MoiDoctar <user@gmail.com>".
    # For Gmail specifically, envelope sender MUST be the authenticated user.
    _, parsed_from = email.utils.parseaddr(from_header)
    if "gmail.com" in host.lower() and user and "@" in user:
        envelope_from = user
    elif parsed_from:
        envelope_from = parsed_from
    else:
        envelope_from = user if ("@" in user) else from_header

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_header
    msg["To"] = recipient
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    # Build fallback connection strategies:
    # 1. Primary configured port & SSL mode
    # 2. Alternative resilient mode (465 SSL <-> 587 STARTTLS)
    strategies = [(primary_port, primary_use_ssl, "primary")]
    if primary_use_ssl or primary_port == 465:
        strategies.append((587, False, "fallback (587 STARTTLS)"))
    else:
        strategies.append((465, True, "fallback (465 SSL)"))

    last_error_msg = ""
    had_timeout = False

    # Use a fast 3.5s timeout. If the host network blocks port 465/587, it will fail
    # in ~3.5s per port instead of hanging the user's browser for 15-30s.
    for port, use_ssl, label in strategies:
        try:
            logger.info(f"Attempting SMTP connection to {host}:{port} ({label}, ssl={use_ssl})")
            if use_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(host, port, context=context, timeout=3.5) as server:
                    server.login(user, password)
                    server.sendmail(envelope_from, [recipient], msg.as_string())
            else:
                with smtplib.SMTP(host, port, timeout=3.5) as server:
                    server.ehlo()
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(user, password)
                    server.sendmail(envelope_from, [recipient], msg.as_string())

            logger.info(f"Email successfully sent via SMTP ({host}:{port}, {label}) to {recipient}")
            return True, f"Delivered via SMTP ({port})"
        except Exception as e:
            err_name = type(e).__name__
            last_error_msg = f"{err_name}: {e}"
            if isinstance(e, (TimeoutError, socket.timeout)) or "timed out" in str(e).lower():
                had_timeout = True
            logger.warning(
                f"SMTP attempt failed for {recipient} on {host}:{port} ({label}): {last_error_msg}"
            )

    # If both ports timed out, the cloud provider has blocked outbound raw SMTP ports.
    # Activate circuit breaker for 5 minutes so future requests fail fast without lag.
    if had_timeout:
        _smtp_circuit_broken_until = time.time() + 300
        logger.warning(
            f"Outbound SMTP ports blocked by hosting firewall. Activated SMTP circuit breaker for 300s."
        )

    logger.error(f"All SMTP delivery attempts failed for {recipient}: {last_error_msg}")
    return False, f"SMTP Error ({host}): {last_error_msg}"



def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> Tuple[bool, str]:
    """Send an email via Brevo, Resend, or SMTP based on configuration and provider availability."""
    recipient = to_email.strip().lower()
    errors = []

    has_brevo = bool(settings.effective_brevo_api_key)
    has_resend = bool(settings.effective_resend_api_key)
    has_smtp = _smtp_configured()
    pref = settings.email_provider_preference

    # 1. Brevo (HTTPS port 443 - works everywhere, immune to hosting firewall port blocks)
    if has_brevo and pref in ("brevo", "auto"):
        logger.info(f"Attempting email delivery via Brevo to {recipient}")
        ok, detail = _send_via_brevo(recipient, subject, html_body, text_body)
        if ok:
            return True, detail
        errors.append(f"Brevo: {detail}")

    # 2. Resend (HTTPS port 443)
    if has_resend and pref in ("resend", "auto"):
        resend_is_sandbox = "onboarding@resend.dev" in settings.effective_resend_from.lower()
        # If in sandbox mode, only attempt Resend if recipient is the account owner (lateefedidi4@gmail.com)
        # to avoid guaranteed 403 sandbox failure for other recipients
        if not resend_is_sandbox or (recipient == "lateefedidi4@gmail.com"):
            logger.info(f"Attempting email delivery via Resend to {recipient}")
            ok, detail = _send_via_resend(recipient, subject, html_body, text_body)
            if ok:
                return True, detail
            errors.append(f"Resend: {detail}")
        else:
            errors.append("Resend: Sandbox mode only allows delivering to lateefedidi4@gmail.com (verify domain at resend.com/domains)")

    # 3. SMTP (Raw TCP socket - ports 465/587)
    if has_smtp:
        logger.info(f"Attempting email delivery via SMTP to {recipient}")
        ok, detail = _send_via_smtp(recipient, subject, html_body, text_body)
        if ok:
            return True, detail
        errors.append(f"SMTP: {detail}")

    # 4. Fallback to Brevo if not tried yet
    if has_brevo and not any("Brevo:" in e for e in errors):
        ok, detail = _send_via_brevo(recipient, subject, html_body, text_body)
        if ok:
            return True, detail
        errors.append(f"Brevo: {detail}")

    last_error = " | ".join(errors) if errors else "No email service configured"
    logger.error(f"Email delivery could not be completed for {recipient}: {last_error}")
    return False, last_error


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
