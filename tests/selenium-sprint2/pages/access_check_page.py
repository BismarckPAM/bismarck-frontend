from __future__ import annotations

from dataclasses import dataclass
import re

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

from .base_page import BasePage


@dataclass(frozen=True)
class DecisionView:
    decision: str
    reason: str
    details: str
    css_class: str
    background_color: str
    border_color: str
    text_color: str

    @property
    def visual_signature(self) -> tuple[str, str, str, str]:
        return (self.css_class, self.background_color, self.border_color, self.text_color)


class AccessCheckPage(BasePage):
    TITLE = (By.XPATH, "//h1[normalize-space()='Access Check Simulator']")
    ERROR = (By.CSS_SELECTOR, ".policy-error[role='alert']")
    LOADING = (By.CSS_SELECTOR, ".simulator-loading[role='status']")
    SUBMIT = (By.CSS_SELECTOR, "button.simulator-submit[type='submit']")
    RESULT = (By.CSS_SELECTOR, "[data-testid='decision-result']")

    def wait_page(self) -> None:
        self.visible(self.TITLE)

    def wait_options_loaded(self) -> None:
        self.wait.until(EC.invisibility_of_element_located(self.LOADING))
        if self.is_visible(self.ERROR):
            raise AssertionError("Simulator failed to load users/resources: " + self.error_text())
        self.wait.until(lambda _d: len(Select(self.label_control("User", "select")).options) > 1)
        self.wait.until(lambda _d: len(Select(self.label_control("Resource", "select")).options) > 1)

    def error_text(self) -> str:
        if not self.is_visible(self.ERROR):
            return ""
        return self.driver.find_element(*self.ERROR).text.strip()

    def available_user_options(self) -> list[str]:
        return [option.text.strip() for option in Select(self.label_control("User", "select")).options]

    def available_resource_options(self) -> list[str]:
        return [option.text.strip() for option in Select(self.label_control("Resource", "select")).options]

    @staticmethod
    def _select_option_containing(select: Select, *parts: str) -> str:
        wanted = [part.strip().lower() for part in parts if part.strip()]
        for option in select.options:
            text = option.text.strip()
            lowered = text.lower()
            if option.get_attribute("value") and all(part in lowered for part in wanted):
                select.select_by_value(option.get_attribute("value"))
                return text
        options = [opt.text.strip() for opt in select.options]
        raise AssertionError(
            f"Required option containing {parts!r} was not found. Available options: {options}"
        )

    def select_user_by_role(self, role: str) -> str:
        # UI option format from production source: "<full name> · <role>"
        return self._select_option_containing(Select(self.label_control("User", "select")), role)

    def select_resource_by_environment(self, environment: str) -> str:
        # UI option format from production source: "<resource name> · <environment>"
        select = Select(self.label_control("Resource", "select"))
        wanted = environment.strip().lower()
        aliases = {"prod": "production", "dev": "development"}
        wanted_environment = aliases.get(wanted, wanted)

        for option in select.options:
            text = option.text.strip()
            if not option.get_attribute("value"):
                continue
            option_environment = text.rsplit("·", 1)[-1].strip().lower()
            if option_environment in {wanted, wanted_environment}:
                select.select_by_value(option.get_attribute("value"))
                return text

        # Keep the existing diagnostic, but avoid selecting NON-PROD when PROD
        # is requested if the deployed UI uses an unexpected label format.
        return self._select_option_containing(
            select, re.sub(r"[^a-z0-9]+", " ", wanted_environment).strip()
        )

    def select_action(self, value: str) -> None:
        Select(self.label_control("Action", "select")).select_by_value(value)

    def set_session_duration(self, minutes: int) -> None:
        field = self.label_control("Session duration (minutes)", "input")
        field.clear()
        field.send_keys(str(minutes))

    def evaluate(self) -> DecisionView:
        button = self.clickable(self.SUBMIT)
        button.click()
        self.wait.until(lambda d: d.find_element(*self.SUBMIT).text.strip() == "Evaluate access")
        panel = self.visible(self.RESULT)

        decision_label = panel.find_element(By.CSS_SELECTOR, ".decision-label").text.strip()
        decision = decision_label.replace(" ", "_").upper()
        reason = panel.find_element(By.TAG_NAME, "h2").text.strip()
        paragraphs = panel.find_elements(By.TAG_NAME, "p")
        details = "\n".join(p.text.strip() for p in paragraphs if p.text.strip())
        css_class = panel.get_attribute("class") or ""
        style = self.driver.execute_script(
            "const s = window.getComputedStyle(arguments[0]);"
            "return {backgroundColor:s.backgroundColor,borderColor:s.borderColor,color:s.color};",
            panel,
        )
        return DecisionView(
            decision=decision,
            reason=reason,
            details=details,
            css_class=css_class,
            background_color=str(style.get("backgroundColor", "")),
            border_color=str(style.get("borderColor", "")),
            text_color=str(style.get("color", "")),
        )

    def run_scenario(
        self,
        *,
        user_role: str,
        resource_environment: str,
        action: str,
        session_minutes: int = 120,
    ) -> DecisionView:
        self.select_user_by_role(user_role)
        self.select_resource_by_environment(resource_environment)
        self.select_action(action)
        self.set_session_duration(session_minutes)
        return self.evaluate()
