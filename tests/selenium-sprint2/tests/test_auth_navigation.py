from __future__ import annotations

import pytest
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from pages.layout_page import LayoutPage
from pages.login_page import LoginPage


@pytest.mark.regression
@pytest.mark.smoke
def test_protected_sprint2_route_redirects_unauthenticated_user_to_login(driver, app_config):
    driver.get(f"{app_config.frontend_url}/policies")
    WebDriverWait(driver, app_config.explicit_wait_seconds).until(EC.url_contains("/login"))
    assert "/login" in driver.current_url


@pytest.mark.regression
def test_invalid_login_shows_standardized_error_without_backend_details(driver, app_config):
    page = LoginPage(driver, app_config.frontend_url, app_config.explicit_wait_seconds)
    page.open()
    page.login(app_config.admin_email, "definitely-wrong-password")
    assert page.wait_for_success_or_error() == "error"
    assert page.error_text() == "Invalid email or password"


@pytest.mark.regression
@pytest.mark.smoke
def test_admin_login_exposes_sprint2_navigation(authenticated_driver, app_config):
    layout = LayoutPage(
        authenticated_driver,
        app_config.frontend_url,
        app_config.explicit_wait_seconds,
    )
    layout.wait_ready()
    assert authenticated_driver.find_element(*layout.NAV_POLICIES).is_displayed()
    assert authenticated_driver.find_element(*layout.NAV_SIMULATOR).is_displayed()


@pytest.mark.regression
def test_logout_returns_user_to_login(authenticated_driver, app_config):
    layout = LayoutPage(
        authenticated_driver,
        app_config.frontend_url,
        app_config.explicit_wait_seconds,
    )
    layout.wait_ready()
    layout.logout()

    # Logout triggers a React route transition. Wait for both the URL and
    # the login form to finish rendering before asserting the final state.
    WebDriverWait(
        authenticated_driver,
        app_config.explicit_wait_seconds,
    ).until(EC.url_contains("/login"))

    login_submit = WebDriverWait(
        authenticated_driver,
        app_config.explicit_wait_seconds,
    ).until(EC.visibility_of_element_located(LoginPage.SUBMIT))

    assert "/login" in authenticated_driver.current_url
    assert login_submit.is_displayed()
