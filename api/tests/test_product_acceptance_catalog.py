import json
from pathlib import Path


CATALOG = json.loads(
    (
        Path(__file__).resolve().parents[2]
        / "qa"
        / "product_acceptance_cases.json"
    ).read_text(encoding="utf-8")
)


def test_product_catalog_has_unique_ids_and_complete_fields():
    cases = CATALOG["cases"]
    ids = [case["id"] for case in cases]
    assert len(ids) == len(set(ids))
    for case in cases:
        assert case["priority"] in {"P0", "P1", "P2"}
        assert case["status"] in CATALOG["status_definitions"]
        assert case["requirement"].strip()
        assert case["steps"]
        assert case["expected"].strip()
        assert case["tags"]


def test_product_catalog_covers_all_audit_dimensions_and_backlog():
    cases = CATALOG["cases"]
    all_tags = {tag for case in cases for tag in case["tags"]}
    required_tags = {
        "page",
        "function",
        "exception",
        "input",
        "validation",
        "permission",
        "idor",
        "auth",
        "deployment",
        "backup",
        "session",
        "rate-limit",
        "draft",
        "search",
        "privacy",
        "accessibility",
        "test",
        "database",
        "notification",
        "upload",
        "share",
        "offline",
        "migration",
    }
    assert required_tags <= all_tags
    assert any(case["status"] == "pending" for case in cases)
    assert any(case["status"] == "automated" for case in cases)
    assert any(case["status"] == "deployment-ready" for case in cases)


def test_all_p0_cases_have_an_executable_or_explicit_release_gate():
    allowed = {"automated", "deployment-ready", "pending"}
    p0_cases = [case for case in CATALOG["cases"] if case["priority"] == "P0"]
    assert p0_cases
    assert all(case["status"] in allowed for case in p0_cases)
    pending_p0 = [case for case in p0_cases if case["status"] == "pending"]
    assert pending_p0 == []
