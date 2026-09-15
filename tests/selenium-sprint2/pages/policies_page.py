from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

from .base_page import BasePage


class PoliciesPage(BasePage):
    TITLE = (By.XPATH, "//h1[normalize-space()='Access Policies']")
    REFRESH = (By.XPATH, "//button[contains(normalize-space(.),'Refresh')]")
    NEW_POLICY = (By.XPATH, "//button[contains(normalize-space(.),'New policy')]")
    ERROR = (By.CSS_SELECTOR, ".policy-error[role='alert']")
    LOADING = (By.CSS_SELECTOR, "[data-testid='policy-loading']")
    EMPTY = (By.CSS_SELECTOR, "[data-testid='policy-empty']")
    TABLE = (By.CSS_SELECTOR, "table[aria-label='Access policies']")
    FORM = (By.CSS_SELECTOR, "form[aria-label='Policy form']")
    CLOSE_FORM = (By.CSS_SELECTOR, "button[aria-label='Close policy form']")

    def wait_page(self) -> None:
        self.visible(self.TITLE)

    def wait_finished_loading(self) -> None:
        self.wait.until(EC.invisibility_of_element_located(self.LOADING))
        self.wait.until(
            lambda d: bool(
                d.find_elements(*self.ERROR)
                or d.find_elements(*self.TABLE)
                or d.find_elements(*self.EMPTY)
            )
        )

    def refresh_data(self) -> None:
        self.click(self.REFRESH)
        self.wait_finished_loading()

    def has_error(self) -> bool:
        return self.is_visible(self.ERROR)

    def error_text(self) -> str:
        if not self.has_error():
            return ""
        return self.driver.find_element(*self.ERROR).text.strip()

    def has_empty_state(self) -> bool:
        return self.is_visible(self.EMPTY)

    def has_table(self) -> bool:
        return self.is_visible(self.TABLE)

    def loading_visible(self) -> bool:
        return self.is_visible(self.LOADING)

    def assert_operational(self) -> None:
        self.wait_finished_loading()
        if self.has_error():
            raise AssertionError(
                "Access Policies page is not operational. UI error: " + self.error_text()
            )

    def open_create_form(self) -> None:
        self.click(self.NEW_POLICY)
        self.visible(self.FORM)
        self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//form[@aria-label='Policy form']//h2[normalize-space()='Create policy']"))
        )

    def close_form(self) -> None:
        if self.is_present(self.FORM):
            self.click(self.CLOSE_FORM)
            self.wait.until(EC.invisibility_of_element_located(self.FORM))

    def fill_form(
        self,
        *,
        role: str,
        resource_type: str,
        environment: str,
        criticality: str,
        max_access_level: int,
        requires_approval: bool = True,
    ) -> None:
        fields = {
            "Role": role,
            "Resource type": resource_type,
            "Environment": environment,
        }
        for label, value in fields.items():
            field = self.label_control(label, "input")
            field.clear()
            field.send_keys(value)

        Select(self.label_control("Criticality", "select")).select_by_visible_text(criticality)

        level = self.label_control("Max access level", "input")
        level.clear()
        level.send_keys(str(max_access_level))

        checkbox = self.driver.find_element(
            By.XPATH,
            "//label[contains(@class,'policy-checkbox')]//input[@type='checkbox']",
        )
        if checkbox.is_selected() != requires_approval:
            checkbox.click()

    def submit_create(self) -> None:
        self.click((By.XPATH, "//form[@aria-label='Policy form']//button[@type='submit' and contains(normalize-space(.),'Create policy')]"))

    def submit_save_changes(self) -> None:
        self.click((By.XPATH, "//form[@aria-label='Policy form']//button[@type='submit' and contains(normalize-space(.),'Save changes')]"))

    def wait_form_closed(self) -> None:
        self.wait.until(EC.invisibility_of_element_located(self.FORM))

    def row_for_role(self, role: str):
        literal = self._xpath_literal(role)
        locator = (
            By.XPATH,
            f"//table[@aria-label='Access policies']//tbody/tr[td[1]//strong[normalize-space()={literal}]]",
        )
        return self.wait.until(EC.visibility_of_element_located(locator))

    def row_text(self, role: str) -> str:
        return self.row_for_role(role).text

    def open_edit(self, role: str) -> None:
        label = f"Edit {role} policy"
        self.click((By.CSS_SELECTOR, f'button[aria-label="{label}"]'))
        self.wait.until(
            EC.visibility_of_element_located((By.XPATH, "//form[@aria-label='Policy form']//h2[normalize-space()='Edit policy']"))
        )

    def deactivate(self, role: str) -> None:
        label = f"Deactivate {role} policy"
        self.click((By.CSS_SELECTOR, f'button[aria-label="{label}"]'))
        alert = self.wait.until(EC.alert_is_present())
        alert.accept()
        self.wait.until(lambda d: "Inactive" in self.row_text(role))

    def wait_for_role(self, role: str) -> None:
        self.row_for_role(role)
