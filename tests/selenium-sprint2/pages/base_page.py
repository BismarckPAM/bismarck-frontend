from __future__ import annotations

from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


class BasePage:
    def __init__(self, driver: WebDriver, base_url: str, wait_seconds: int = 20):
        self.driver = driver
        self.base_url = base_url.rstrip("/")
        self.wait = WebDriverWait(driver, wait_seconds)

    def open_path(self, path: str) -> None:
        normalized = path if path.startswith("/") else f"/{path}"
        self.driver.get(f"{self.base_url}{normalized}")

    def visible(self, locator: tuple[str, str]) -> WebElement:
        return self.wait.until(EC.visibility_of_element_located(locator))

    def present(self, locator: tuple[str, str]) -> WebElement:
        return self.wait.until(EC.presence_of_element_located(locator))

    def clickable(self, locator: tuple[str, str]) -> WebElement:
        return self.wait.until(EC.element_to_be_clickable(locator))

    def click(self, locator: tuple[str, str]) -> None:
        self.clickable(locator).click()

    def is_present(self, locator: tuple[str, str]) -> bool:
        try:
            self.driver.find_element(*locator)
            return True
        except NoSuchElementException:
            return False

    def is_visible(self, locator: tuple[str, str]) -> bool:
        try:
            return self.driver.find_element(*locator).is_displayed()
        except NoSuchElementException:
            return False

    def wait_until_absent(self, locator: tuple[str, str], timeout: float | None = None) -> bool:
        waiter = self.wait if timeout is None else WebDriverWait(self.driver, timeout)
        try:
            return bool(waiter.until(EC.invisibility_of_element_located(locator)))
        except TimeoutException:
            return False

    def label_control(self, label_text: str, tag: str = "input") -> WebElement:
        # The Sprint 2 React forms wrap controls in <label> elements and render
        # a <span class="form-label">...</span>. This locator intentionally
        # follows the current production source instead of brittle nth-child CSS.
        xpath = (
            "//label[.//span[contains(@class,'form-label') and "
            f"normalize-space()={self._xpath_literal(label_text)}]]//{tag}"
        )
        return self.wait.until(EC.presence_of_element_located((By.XPATH, xpath)))

    @staticmethod
    def _xpath_literal(value: str) -> str:
        if "'" not in value:
            return f"'{value}'"
        if '"' not in value:
            return f'"{value}"'
        pieces = value.split("'")
        return "concat(" + ", \"'\", ".join(f"'{piece}'" for piece in pieces) + ")"
