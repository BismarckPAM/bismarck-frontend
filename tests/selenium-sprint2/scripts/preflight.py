from __future__ import annotations

import sys
from pathlib import Path

import requests

# Allow running as: python scripts/preflight.py
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from config import get_config  # noqa: E402


def show(name: str, ok: bool, detail: str) -> bool:
    marker = "PASS" if ok else "FAIL"
    print(f"[{marker}] {name}: {detail}")
    return ok


def main() -> int:
    config = get_config(require_credentials=True)
    session = requests.Session()
    session.headers.update({"Accept": "application/json"})
    overall = True

    print("Bismarck Sprint 2 Selenium preflight")
    print(f"Frontend: {config.frontend_url}")
    print(f"Gateway : {config.gateway_url}")
    print("Credentials: loaded locally (password is not printed)\n")

    try:
        response = session.get(f"{config.frontend_url}/login", timeout=20)
        overall &= show("Frontend /login", response.status_code == 200, str(response.status_code))
    except Exception as exc:
        overall &= show("Frontend /login", False, repr(exc))

    try:
        response = session.get(f"{config.gateway_url}/health", timeout=20)
        overall &= show(
            "Gateway /health",
            response.status_code == 200,
            f"HTTP {response.status_code}",
        )
    except Exception as exc:
        overall &= show("Gateway /health", False, repr(exc))

    try:
        login = session.post(
            f"{config.gateway_url}/api/identity/auth/login",
            json={"email": config.admin_email, "password": config.admin_password},
            timeout=20,
        )
        login_ok = login.status_code == 200
        overall &= show("Admin login API", login_ok, f"HTTP {login.status_code}")
        if not login_ok:
            return 1
        payload = login.json()
        token = payload.get("token")
        if not token:
            show("JWT response shape", False, "token field missing")
            return 1
        session.headers.update({"Authorization": f"Bearer {token}"})
    except Exception as exc:
        show("Admin login API", False, repr(exc))
        return 1

    checks = [
        ("Identity users", "/api/identity/users"),
        ("Resources", "/api/resources"),
        ("Access policies", "/authz/policies"),
    ]
    for name, path in checks:
        try:
            response = session.get(f"{config.gateway_url}{path}", timeout=20)
            ok = response.status_code == 200
            overall &= show(name, ok, f"HTTP {response.status_code}")
        except Exception as exc:
            overall &= show(name, False, repr(exc))

    print("\nPreflight is diagnostic only. Selenium still should run so failures produce screenshots/report evidence.")
    return 0 if overall else 1


if __name__ == "__main__":
    raise SystemExit(main())
