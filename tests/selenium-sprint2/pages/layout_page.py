from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class LayoutPage(BasePage):
    PROFILE = (By.CSS_SELECTOR, "[data-testid='user-profile-chip']")
    LOGOUT = (By.CSS_SELECTOR, "[data-testid='logout-btn']")

    NAV_USERS = (By.XPATH, "//a[.//span[normalize-space()='Identities & Users']]")
    NAV_RESOURCES = (By.XPATH, "//a[.//span[normalize-space()='Privileged Resources']]")
    NAV_POLICIES = (By.XPATH, "//a[.//span[normalize-space()='Access Policies']]")
    NAV_SIMULATOR = (By.XPATH, "//a[.//span[normalize-space()='Check Simulator']]")

    def wait_ready(self) -> None:
        self.visible(self.PROFILE)
        self.visible(self.NAV_POLICIES)
        self.visible(self.NAV_SIMULATOR)

    def open_policies(self) -> None:
        self.click(self.NAV_POLICIES)
        self.wait.until(EC.url_contains("/policies"))

    def open_simulator(self) -> None:
        self.click(self.NAV_SIMULATOR)
        self.wait.until(EC.url_contains("/access-check"))

    def logout(self) -> None:
        self.click(self.LOGOUT)
        self.wait.until(EC.url_contains("/login"))
