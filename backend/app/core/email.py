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
# blocking ports 465/587), disable SMTP attempts for 3 minutes so subsequent requests don't hang.
_smtp_circuit_broken_until: float = 0.0


def _connect_smtp_ipv4(host: str, port: int, use_ssl: bool, timeout: float = 6.0) -> Tuple[smtplib.SMTP, str]:
    """Connect to SMTP forcing IPv4 (socket.AF_INET).
    
    This avoids the Linux/Debian dual-stack IPv6 black hole where getaddrinfo returns
    an IPv6 address that has no outbound route in Docker/containerized cloud environments,
    causing connections to silently hang until timeout.
    """
    try:
        addr_infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        ipv4_addrs = [ai[4][0] for ai in addr_infos]
    except Exception as e:
        logger.warning(f"Failed to resolve IPv4 for {host}: {e}")
        ipv4_addrs = [host]

    last_exc = None
    for ip in ipv4_addrs:
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            sock.connect((ip, port))

            if use_ssl:
                ctx = ssl.create_default_context()
                ssl_sock = ctx.wrap_socket(sock, server_hostname=host)
                server = smtplib.SMTP_SSL(host=host, port=port, timeout=timeout)
                server.sock = ssl_sock
                server.file = ssl_sock.makefile('rb')
                (code, msg) = server.getreply()
                if code >= 400:
                    raise smtplib.SMTPResponseError(code, msg)
                return server, ip
            else:
                server = smtplib.SMTP(host=host, port=port, timeout=timeout)
                server.sock = sock
                server.file = sock.makefile('rb')
                (code, msg) = server.getreply()
                if code >= 400:
                    raise smtplib.SMTPResponseError(code, msg)
                server.ehlo()
                ctx = ssl.create_default_context()
                server.starttls(context=ctx)
                server.ehlo()
                return server, ip
        except Exception as e:
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass
            last_exc = e

    raise last_exc or TimeoutError(f"Could not connect to {host}:{port}")


def _send_via_emailjs(to_email: str, subject: str, html_body: str, text_body: str, code: str = "", heading: str = "") -> Tuple[bool, str]:
    """Send an email using EmailJS REST API (https://emailjs.com).
    
    EmailJS bridges HTTP requests directly into your connected personal Gmail account,
    allowing 100% compliant delivery to any recipient without custom domains or open SMTP ports.
    """
    service_id = settings.effective_emailjs_service_id
    template_id = settings.effective_emailjs_template_id
    public_key = settings.effective_emailjs_public_key
    private_key = settings.effective_emailjs_private_key

    if not (service_id and template_id and public_key):
        return False, "EmailJS credentials not configured (set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY)"

    url = "https://api.emailjs.com/api/v1.0/email/send"
    recipient = to_email.strip().lower()

    # Calculate formatted 10-minute expiry time
    import datetime
    now = datetime.datetime.now()
    expiry_dt = now + datetime.timedelta(minutes=10)
    expiry_str = expiry_dt.strftime("%I:%M %p")

    payload = {
        "service_id": service_id,
        "template_id": template_id,
        "user_id": public_key,
        "template_params": {
            # Recipient variables
            "to_email": recipient,
            "email": recipient,
            "user_email": recipient,
            "to": recipient,
            "recipient": recipient,
            "to_name": recipient.split("@")[0].title(),

            # OTP / code variables across all standard naming conventions
            "otp": code,
            "otp_code": code,
            "code": code,
            "passcode": code,
            "pin": code,
            "token": code,
            "password": code,
            "verification_code": code,

            # Branding variables
            "company_name": "MoiDoctar",
            "Company_Name": "MoiDoctar",
            "company": "MoiDoctar",
            "app_name": "MoiDoctar",
            "from_name": "MoiDoctar",

            # Expiration and timing
            "time": expiry_str,
            "valid_till": expiry_str,
            "expiry_time": expiry_str,
            "expiry": "10 minutes",
            "expiration": "10 minutes",

            # Subject and body variables
            "subject": subject,
            "heading": heading or "Verify your email",
            "message": text_body,
            "body": text_body,
            "html_content": html_body,
            "html_message": html_body,
            "content": html_body,
        },
    }
    if private_key:
        payload["accessToken"] = private_key

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "MoiDoctar/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_text = response.read().decode("utf-8", "replace").strip()
            logger.info(f"Email successfully delivered via EmailJS to {recipient} ({res_text})")
            return True, f"Delivered via EmailJS ({res_text})"
    except urllib.error.HTTPError as exc:
        err_raw = exc.read().decode("utf-8", "replace")
        logger.error(f"EmailJS HTTP error {exc.code} for {recipient}: {err_raw}")
        return False, f"EmailJS HTTP {exc.code}: {err_raw}"
    except Exception as exc:
        logger.error(f"EmailJS error for {recipient}: {exc}")
        return False, str(exc)


def _send_via_brevo(to_email: str, subject: str, html_body: str, text_body: str) -> Tuple[bool, str]:
    """Send an email using Brevo's (formerly Sendinblue) REST API (https://brevo.com).
    
    Brevo operates over standard HTTPS (Port 443).
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
    """Send an email via standard SMTP with IPv4 forced socket, dual-port fallback, and circuit breaker."""
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

    from_header = settings.effective_smtp_from
    recipient = to_email.strip().lower()

    # CRITICAL: RFC 5321 envelope sender must be a bare email address,
    # not a formatted display name like "MoiDoctar <user@gmail.com>".
    # For Gmail specifically, envelope sender MUST be the authenticated user.
    _, parsed_from = email.utils.parseaddr(from_header)
    if ("gmail.com" in host.lower() or "googlemail" in host.lower()) and user and "@" in user:
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
    # 1. Primary configured port & SSL mode on primary host
    # 2. Alternative resilient mode (465 SSL <-> 587 STARTTLS)
    # 3. Googlemail host fallback for Gmail accounts
    hosts_to_try = [host]
    if "gmail.com" in host.lower() and "googlemail" not in host.lower():
        hosts_to_try.append("smtp.googlemail.com")

    strategies = []
    for h in hosts_to_try:
        strategies.append((h, primary_port, primary_use_ssl, "primary" if h == host else "alternate-host"))
        if primary_use_ssl or primary_port == 465:
            strategies.append((h, 587, False, "fallback 587 STARTTLS"))
        else:
            strategies.append((h, 465, True, "fallback 465 SSL"))

    last_error_msg = ""
    had_timeout = False

    # Each attempt forces IPv4 with a 5.0s timeout to bypass IPv6 black holes
    for target_host, port, use_ssl, label in strategies:
        server = None
        try:
            logger.info(f"Attempting SMTP connection to {target_host}:{port} ({label}, ssl={use_ssl}, ipv4=True)")
            server, connected_ip = _connect_smtp_ipv4(target_host, port, use_ssl, timeout=5.0)
            server.login(user, password)
            server.sendmail(envelope_from, [recipient], msg.as_string())
            server.quit()
            logger.info(f"Email successfully sent via SMTP ({target_host}:{port} @ {connected_ip}, {label}) to {recipient}")
            return True, f"Delivered via SMTP ({port})"
        except Exception as e:
            err_name = type(e).__name__
            last_error_msg = f"{err_name}: {e}"
            if isinstance(e, (TimeoutError, socket.timeout)) or "timed out" in str(e).lower():
                had_timeout = True
            logger.warning(
                f"SMTP attempt failed for {recipient} on {target_host}:{port} ({label}): {last_error_msg}"
            )
        finally:
            if server:
                try:
                    server.close()
                except Exception:
                    pass

    # If all attempts timed out, activate circuit breaker for 3 minutes
    if had_timeout:
        _smtp_circuit_broken_until = time.time() + 180
        logger.warning(
            f"Outbound SMTP ports blocked or unreachable. Activated SMTP circuit breaker for 180s."
        )

    logger.error(f"All SMTP delivery attempts failed for {recipient}: {last_error_msg}")
    return False, f"SMTP Error ({host}): {last_error_msg}"



def send_email(to_email: str, subject: str, html_body: str, text_body: str, code: str = "", heading: str = "") -> Tuple[bool, str]:
    """Send an email via EmailJS, SMTP, Resend, or Brevo based on configuration and provider availability."""
    recipient = to_email.strip().lower()
    errors = []

    has_emailjs = bool(settings.effective_emailjs_service_id and settings.effective_emailjs_public_key)
    has_smtp = _smtp_configured()
    has_resend = bool(settings.effective_resend_api_key)
    has_brevo = bool(settings.effective_brevo_api_key)
    pref = settings.email_provider_preference

    # 1. EmailJS (HTTPS port 443 - connects directly to user's Gmail account, no domain needed!)
    if has_emailjs and pref in ("emailjs", "auto"):
        logger.info(f"Attempting email delivery via EmailJS to {recipient}")
        ok, detail = _send_via_emailjs(recipient, subject, html_body, text_body, code=code, heading=heading)
        if ok:
            return True, detail
        errors.append(f"EmailJS: {detail}")

    # 2. SMTP (Direct Gmail SMTP connection)
    if has_smtp and pref in ("smtp", "auto"):
        import time
        if time.time() >= _smtp_circuit_broken_until:
            logger.info(f"Attempting email delivery via SMTP to {recipient}")
            ok, detail = _send_via_smtp(recipient, subject, html_body, text_body)
            if ok:
                return True, detail
            errors.append(f"SMTP: {detail}")

    # 3. Resend (HTTPS port 443)
    if has_resend and pref in ("resend", "auto"):
        resend_is_sandbox = "onboarding@resend.dev" in settings.effective_resend_from.lower()
        if not resend_is_sandbox or (recipient == "lateefedidi4@gmail.com"):
            logger.info(f"Attempting email delivery via Resend to {recipient}")
            ok, detail = _send_via_resend(recipient, subject, html_body, text_body)
            if ok:
                return True, detail
            errors.append(f"Resend: {detail}")
        else:
            errors.append("Resend: Sandbox mode only allows delivering to lateefedidi4@gmail.com (verify domain at resend.com/domains)")

    # 4. Brevo (HTTPS port 443)
    if has_brevo and pref in ("brevo", "auto"):
        logger.info(f"Attempting email delivery via Brevo to {recipient}")
        ok, detail = _send_via_brevo(recipient, subject, html_body, text_body)
        if ok:
            return True, detail
        errors.append(f"Brevo: {detail}")

    # 5. Fallback to EmailJS if not tried yet
    if has_emailjs and not any("EmailJS:" in e for e in errors):
        ok, detail = _send_via_emailjs(recipient, subject, html_body, text_body, code=code, heading=heading)
        if ok:
            return True, detail
        errors.append(f"EmailJS: {detail}")

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
    ok, detail = send_email(recipient, subject, html_body, text_body, code=code, heading=heading)
    if not ok:
        logger.warning(f"[OTP Fallback] Email delivery not completed for {recipient}. Code: {code}. Reason: {detail}")
    return ok, detail
