from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parent
ENV_FILE = ROOT_DIR / ".env.selenium"

# Load local Selenium secrets/config without overriding explicitly supplied
# process environment variables (useful in CI).
load_dotenv(ENV_FILE, override=False)


@dataclass(frozen=True)
class SeleniumConfig:
    frontend_url: str
    gateway_url: str
    admin_email: str
    admin_password: str
    headless: bool
    explicit_wait_seconds: int
    page_load_timeout_seconds: int


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def get_config(require_credentials: bool = True) -> SeleniumConfig:
    # These defaults were derived from the uploaded production deployment source.
    frontend_url = os.getenv(
        "FRONTEND_URL",
        "https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io",
    ).rstrip("/")
    gateway_url = os.getenv(
        "GATEWAY_URL",
        "https://gateway.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io",
    ).rstrip("/")

    admin_email = os.getenv("QA_ADMIN_EMAIL", "").strip()
    admin_password = os.getenv("QA_ADMIN_PASSWORD", "")

    if require_credentials:
        missing: list[str] = []
        if not admin_email:
            missing.append("QA_ADMIN_EMAIL")
        if not admin_password:
            missing.append("QA_ADMIN_PASSWORD")
        if missing:
            raise RuntimeError(
                "Missing Selenium credentials: "
                + ", ".join(missing)
                + ". Run ./setup_env.ps1 once to create .env.selenium."
            )

    return SeleniumConfig(
        frontend_url=frontend_url,
        gateway_url=gateway_url,
        admin_email=admin_email,
        admin_password=admin_password,
        headless=_as_bool(os.getenv("SELENIUM_HEADLESS"), default=False),
        explicit_wait_seconds=int(os.getenv("SELENIUM_WAIT_SECONDS", "20")),
        page_load_timeout_seconds=int(os.getenv("SELENIUM_PAGELOAD_SECONDS", "45")),
    )
