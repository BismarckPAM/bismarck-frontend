from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from .base_page import BasePage


class LoginPage(BasePage):
    EMAIL = (By.ID, "email")
    PASSWORD = (By.ID, "password")
    SUBMIT = (By.ID, "login-submit-btn")
    ERROR = (By.CSS_SELECTOR, ".error-banner[role='alert']")
    BRAND = (By.CSS_SELECTOR, "h1.brand-title")

    def open(self) -> "LoginPage":
        self.open_path("/login")
        self.visible(self.BRAND)
        return self

    def login(self, email: str, password: str) -> None:
        email_box = self.visible(self.EMAIL)
        password_box = self.visible(self.PASSWORD)
        email_box.clear()
        email_box.send_keys(email)
        password_box.clear()
        password_box.send_keys(password)
        self.click(self.SUBMIT)

    def wait_for_success_or_error(self) -> str:
        def outcome(driver):
            if "/login" not in driver.current_url:
                return "success"
            errors = driver.find_elements(*self.ERROR)
            if errors and errors[0].is_displayed():
                return "error"
            return False

        return str(self.wait.until(outcome))

    def assert_login_successful(self) -> None:
        outcome = self.wait_for_success_or_error()
        if outcome != "success":
            raise AssertionError(f"Login failed. UI message: {self.error_text()!r}")
        self.wait.until(EC.url_contains("/users"))

    def error_text(self) -> str:
        return self.visible(self.ERROR).text.strip()
