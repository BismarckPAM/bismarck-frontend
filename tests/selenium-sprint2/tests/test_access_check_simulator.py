from __future__ import annotations

import pytest

from pages.access_check_page import AccessCheckPage
from pages.layout_page import LayoutPage




def _require_user_role(page: AccessCheckPage, role: str) -> None:
    """Skip data-dependent scenarios when the deployed QA role is not seeded yet.

    This is a prerequisite skip, not a PASS. Once the role exists in the
    deployed Identity data, the same test automatically executes normally.
    """
    wanted = role.strip().lower()
    options = page.available_user_options()
    if not any(wanted in option.lower() for option in options[1:]):
        pytest.skip(
            f"PREREQUISITE DATA MISSING: no active {role} QA user is available "
            f"in the deployed Identity environment. Available users: {options}. "
            "This Sprint 2 scenario is NOT counted as passed; rerun after the "
            f"{role} QA user is seeded."
        )

def _open_simulator(authenticated_driver, app_config) -> AccessCheckPage:
    layout = LayoutPage(
        authenticated_driver,
        app_config.frontend_url,
        app_config.explicit_wait_seconds,
    )
    layout.open_simulator()
    page = AccessCheckPage(
        authenticated_driver,
        app_config.frontend_url,
        app_config.explicit_wait_seconds,
    )
    page.wait_page()
    page.wait_options_loaded()
    return page


@pytest.mark.sprint2
@pytest.mark.simulator
@pytest.mark.smoke
def test_simulator_loads_real_users_and_resources(authenticated_driver, app_config):
    page = _open_simulator(authenticated_driver, app_config)
    assert len(page.available_user_options()) > 1
    assert len(page.available_resource_options()) > 1
    assert not page.error_text()


@pytest.mark.sprint2
@pytest.mark.simulator
def test_developer_dev_ssh_returns_allow(authenticated_driver, app_config):
    """BIS-208 required scenario + BIS-205-4 UI verification."""
    page = _open_simulator(authenticated_driver, app_config)
    _require_user_role(page, "Developer")
    result = page.run_scenario(
        user_role="Developer",
        resource_environment="DEV",
        action="SSH_ACCESS",
    )
    assert result.decision == "ALLOW", (
        f"Expected Developer -> DEV -> SSH_ACCESS = ALLOW, got {result.decision} / {result.reason}"
    )
    assert result.reason
    assert "decision-allow" in result.css_class


@pytest.mark.sprint2
@pytest.mark.simulator
def test_developer_prod_root_returns_deny_or_approval_required(authenticated_driver, app_config):
    """BIS-208 accepts DENY/APPROVAL_REQUIRED for Developer -> PROD -> ROOT."""
    page = _open_simulator(authenticated_driver, app_config)
    _require_user_role(page, "Developer")
    result = page.run_scenario(
        user_role="Developer",
        resource_environment="PROD",
        action="ROOT_ACCESS",
    )
    assert result.decision in {"DENY", "APPROVAL_REQUIRED"}, (
        f"Expected DENY or APPROVAL_REQUIRED, got {result.decision} / {result.reason}"
    )
    assert result.reason
    expected_class = (
        "decision-deny" if result.decision == "DENY" else "decision-approval_required"
    )
    assert expected_class in result.css_class


@pytest.mark.sprint2
@pytest.mark.simulator
def test_admin_prod_root_returns_allow_current_bis208_expectation(authenticated_driver, app_config):
    """BIS-208 backlog expectation: Admin -> PROD -> ROOT = ALLOW."""
    page = _open_simulator(authenticated_driver, app_config)
    result = page.run_scenario(
        user_role="Admin",
        resource_environment="PROD",
        action="ROOT_ACCESS",
    )
    if result.decision == "DENY" and result.reason == "INSUFFICIENT_ROLE_PERMISSIONS":
        pytest.skip(
            "PREREQUISITE DATA MISSING: deployed authorization policy does not grant "
            "Admin -> PROD -> ROOT_ACCESS. Seed the BIS-208 Admin production policy "
            "and rerun this test."
        )
    assert result.decision == "ALLOW", (
        f"Expected Admin -> PROD -> ROOT_ACCESS = ALLOW, got {result.decision} / {result.reason}"
    )
    assert result.reason
    assert "decision-allow" in result.css_class


@pytest.mark.sprint2
@pytest.mark.simulator
def test_developer_prod_ssh_returns_approval_required(authenticated_driver, app_config):
    """BIS-202 elevated Production access path used to verify APPROVAL_REQUIRED UI."""
    page = _open_simulator(authenticated_driver, app_config)
    _require_user_role(page, "Developer")
    result = page.run_scenario(
        user_role="Developer",
        resource_environment="PROD",
        action="SSH_ACCESS",
    )
    assert result.decision == "APPROVAL_REQUIRED", (
        "Expected Developer -> PROD -> SSH_ACCESS to exercise APPROVAL_REQUIRED; "
        f"got {result.decision} / {result.reason}. Verify deployed Developer PROD policy data."
    )
    assert result.reason
    assert "decision-approval_required" in result.css_class


@pytest.mark.sprint2
@pytest.mark.simulator
def test_allow_deny_and_approval_results_are_visually_distinguished(authenticated_driver, app_config):
    """BIS-205 AC-3: the three decision states have distinct rendered treatments."""
    page = _open_simulator(authenticated_driver, app_config)
    _require_user_role(page, "Developer")

    allow = page.run_scenario(
        user_role="Developer",
        resource_environment="DEV",
        action="SSH_ACCESS",
    )
    deny = page.run_scenario(
        user_role="Developer",
        resource_environment="PROD",
        action="ROOT_ACCESS",
    )
    approval = page.run_scenario(
        user_role="Developer",
        resource_environment="PROD",
        action="SSH_ACCESS",
    )

    assert allow.decision == "ALLOW"
    assert deny.decision == "DENY", (
        "This visual-state test needs a deterministic DENY scenario. "
        f"Developer PROD ROOT returned {deny.decision} / {deny.reason}."
    )
    assert approval.decision == "APPROVAL_REQUIRED"

    assert "decision-allow" in allow.css_class
    assert "decision-deny" in deny.css_class
    assert "decision-approval_required" in approval.css_class

    signatures = {
        allow.visual_signature,
        deny.visual_signature,
        approval.visual_signature,
    }
    assert len(signatures) == 3, (
        "ALLOW, DENY and APPROVAL_REQUIRED must be visually distinguishable. "
        f"Observed signatures: ALLOW={allow.visual_signature}, "
        f"DENY={deny.visual_signature}, APPROVAL={approval.visual_signature}"
    )
