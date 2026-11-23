"""Sending email over SMTP (works with any provider)."""
import logging
import smtplib
from email.message import EmailMessage

from .config import settings

log = logging.getLogger(__name__)


def email_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_from)


def send_password_reset(to: str, link: str) -> None:
    """Email a password reset link. Never raises: it runs after the HTTP response is sent."""
    if not email_configured():
        if settings.app_env == "development":
            log.warning("Email is not configured. Password reset link for %s: %s", to, link)
        else:
            log.error("Email is not configured, so a password reset email could not be sent")
        return

    msg = EmailMessage()
    msg["Subject"] = "Reset your NorthShelf password"
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.set_content(
        "Hi,\n\n"
        "Someone asked to reset the password for your NorthShelf account. "
        f"Use this link within {settings.password_reset_minutes} minutes:\n\n"
        f"{link}\n\n"
        "If this wasn't you, you can ignore this email. Your password will not change.\n\n"
        "NorthShelf\n"
    )
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_starttls:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
    except Exception:
        log.exception("Could not send password reset email")
