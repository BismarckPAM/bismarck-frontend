from __future__ import annotations

import re
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

from config import get_config
from pages.login_page import LoginPage


ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
SCREENSHOT_DIR = ARTIFACT_DIR / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


@pytest.fixture(scope="session")
def app_config():
    return get_config(require_credentials=True)


@pytest.fixture
def driver(app_config):
    options = Options()
    if app_config.headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1600,1000")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--ignore-certificate-errors")
    options.set_capability(
        "goog:loggingPrefs",
        {
            "browser": "ALL",
            "performance": "ALL",
        },
    )

    # Selenium Manager (bundled with Selenium 4) automatically resolves a
    # compatible ChromeDriver when Chrome is installed on the machine.
    browser = webdriver.Chrome(options=options)
    browser.set_page_load_timeout(app_config.page_load_timeout_seconds)
    browser.implicitly_wait(0)

    yield browser

    browser.quit()


@pytest.fixture
def authenticated_driver(driver, app_config):
    login = LoginPage(driver, app_config.frontend_url, app_config.explicit_wait_seconds)
    login.open()
    login.login(app_config.admin_email, app_config.admin_password)
    login.assert_login_successful()
    return driver


def _safe_name(nodeid: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", nodeid)[-180:]


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    if report.when != "call" or not report.failed:
        return

    browser = item.funcargs.get("driver") or item.funcargs.get("authenticated_driver")
    if browser is None:
        return

    screenshot_path = SCREENSHOT_DIR / f"{_safe_name(item.nodeid)}.png"
    try:
        browser.save_screenshot(str(screenshot_path))
    except Exception:
        return

    # Add screenshot + browser console logs to pytest-html when available.
    try:
        pytest_html = item.config.pluginmanager.getplugin("html")
        if pytest_html is not None:
            from pytest_html import extras

            extra = getattr(report, "extras", [])
            extra.append(extras.image(browser.get_screenshot_as_base64(), name="Failure screenshot"))
            try:
                browser_logs = browser.get_log("browser")
                if browser_logs:
                    rendered = "\n".join(
                        f"{entry.get('level')}: {entry.get('message')}" for entry in browser_logs
                    )
                    extra.append(extras.text(rendered, name="Browser console"))
            except Exception:
                pass
            report.extras = extra
    except Exception:
        # Reporting helpers must never hide the real Selenium failure.
        pass
