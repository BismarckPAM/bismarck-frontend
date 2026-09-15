from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlparse

from selenium.webdriver.remote.webdriver import WebDriver


def clear_performance_log(driver: WebDriver) -> None:
    """Consume old Chrome performance entries so the next read is test-local."""
    try:
        driver.get_log("performance")
    except Exception:
        # Performance logging is Chrome-specific. The test suite still works
        # without it, but the policy HTTP-status assertion will explain the gap.
        pass


def collect_network_responses(driver: WebDriver, path_contains: str) -> list[dict[str, Any]]:
    """Return Chrome Network.responseReceived events matching a URL/path fragment."""
    matches: list[dict[str, Any]] = []
    try:
        logs = driver.get_log("performance")
    except Exception:
        return matches

    for entry in logs:
        try:
            outer = json.loads(entry["message"])
            message = outer.get("message", {})
            if message.get("method") != "Network.responseReceived":
                continue
            response = message.get("params", {}).get("response", {})
            url = str(response.get("url", ""))
            if path_contains not in url:
                continue
            parsed = urlparse(url)
            matches.append(
                {
                    "url": url,
                    "path": parsed.path,
                    "status": int(response.get("status", 0)),
                    "status_text": response.get("statusText", ""),
                    "mime_type": response.get("mimeType", ""),
                }
            )
        except Exception:
            continue
    return matches
