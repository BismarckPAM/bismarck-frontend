from __future__ import annotations

import time

import pytest

from pages.layout_page import LayoutPage
from pages.policies_page import PoliciesPage
from utils.network import clear_performance_log, collect_network_responses


@pytest.mark.sprint2
@pytest.mark.policy
@pytest.mark.smoke
def test_policy_page_get_request_returns_200_not_gateway_5xx(authenticated_driver, app_config):
    """BIS-205 AC-1/AC-4 + deployed gateway verification.

    This test is expected to expose the currently observed 502 defect until the
    Authorization Service/gateway deployment is fixed.
    """
    driver = authenticated_driver
    clear_performance_log(driver)

    layout = LayoutPage(driver, app_config.frontend_url, app_config.explicit_wait_seconds)
    layout.open_policies()

    page = PoliciesPage(driver, app_config.frontend_url, app_config.explicit_wait_seconds)
    page.wait_page()
    page.wait_finished_loading()

    responses = collect_network_responses(driver, "/authz/policies")
    statuses = [entry["status"] for entry in responses if entry.get("path") == "/authz/policies"]

    assert statuses, (
        "Chrome did not record the GET /authz/policies response. "
        "Check browser performance logging or deployment connectivity."
    )
    assert 200 in statuses, f"Expected GET /authz/policies -> 200, observed statuses: {statuses}"
    assert not any(status >= 500 for status in statuses), (
        f"Gateway/backend failure detected for /authz/policies: {statuses}"
    )
    assert not page.has_error(), f"Policy page displayed an error: {page.error_text()}"


@pytest.mark.sprint2
@pytest.mark.policy
def test_policy_api_error_must_not_be_misrepresented_as_no_policies(authenticated_driver, app_config):
    """BIS-205 AC-4: an API failure must be an error state, not a false empty state."""
    driver = authenticated_driver
    layout = LayoutPage(driver, app_config.frontend_url, app_config.explicit_wait_seconds)
    layout.open_policies()

    page = PoliciesPage(driver, app_config.frontend_url, app_config.explicit_wait_seconds)
    page.wait_page()
    page.wait_finished_loading()

    if page.has_error():
        assert not page.has_empty_state(), (
            "UI defect: the page shows an API error and 'No policies found' at the same time. "
            f"Error shown: {page.error_text()}"
        )
    else:
        assert page.has_table() or page.has_empty_state()


@pytest.mark.sprint2
@pytest.mark.policy
def test_policy_loading_state_is_visible_during_slow_request(authenticated_driver, app_config):
    """BIS-205 AC-4: loading state is visible while policy data is being fetched."""
    driver = authenticated_driver
    layout = LayoutPage(driver, app_config.frontend_url, app_config.explicit_wait_seconds)

    # The SPA bundle is already loaded. Throttle subsequent requests so the
    # policy API loading state remains visible long enough for deterministic QA.
    driver.execute_cdp_cmd("Network.enable", {})
    driver.execute_cdp_cmd(
        "Network.emulateNetworkConditions",
        {
            "offline": False,
            "latency": 1200,
            "downloadThroughput": 5_000_000,
            "uploadThroughput": 2_000_000,
            "connectionType": "cellular3g",
        },
    )
    try:
        layout.open_policies()
        page = PoliciesPage(driver, app_config.frontend_url, app_config.explicit_wait_seconds)
        page.wait_page()
        assert page.visible(page.LOADING).is_displayed()
    finally:
        driver.execute_cdp_cmd(
            "Network.emulateNetworkConditions",
            {
                "offline": False,
                "latency": 0,
                "downloadThroughput": -1,
                "uploadThroughput": -1,
                "connectionType": "none",
            },
        )


@pytest.mark.sprint2
@pytest.mark.policy
@pytest.mark.destructive
def test_policy_create_duplicate_edit_and_deactivate_full_lifecycle(authenticated_driver, app_config):
    """BIS-203/BIS-205: UI lifecycle test using one unique QA policy.

    The final step deactivates the created policy, matching the product's
    soft-delete behavior. One inactive QA row remains as audit evidence.
    """
    driver = authenticated_driver
    layout = LayoutPage(driver, app_config.frontend_url, app_config.explicit_wait_seconds)
    layout.open_policies()

    page = PoliciesPage(driver, app_config.frontend_url, app_config.explicit_wait_seconds)
    page.wait_page()
    page.assert_operational()

    role = f"SELQA_{int(time.time())}"

    # CREATE
    page.open_create_form()
    page.fill_form(
        role=role,
        resource_type="DATABASE",
        environment="DEV",
        criticality="LOW",
        max_access_level=3,
        requires_approval=True,
    )
    page.submit_create()
    page.wait_form_closed()
    page.wait_for_role(role)
    assert "Level 3" in page.row_text(role)
    assert "Active" in page.row_text(role)

    # DUPLICATE -> must be rejected with an error visible to the user.
    page.open_create_form()
    page.fill_form(
        role=role,
        resource_type="DATABASE",  # duplicate key should still conflict in current backend semantics
        environment="DEV",
        criticality="LOW",
        max_access_level=4,
        requires_approval=True,
    )
    page.submit_create()
    page.visible(page.ERROR)
    assert page.error_text(), "Duplicate policy attempt should show a user-visible error."
    page.close_form()

    # EDIT
    page.open_edit(role)
    page.fill_form(
        role=role,
        resource_type="VM",
        environment="DEV",
        criticality="LOW",
        max_access_level=4,
        requires_approval=True,
    )
    page.submit_save_changes()
    page.wait_form_closed()
    assert "Level 4" in page.row_text(role)

    # DEACTIVATE (soft delete)
    page.deactivate(role)
    assert "Inactive" in page.row_text(role)
