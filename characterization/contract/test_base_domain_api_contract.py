"""Contract tests for BaseDomainApiController (openapi/specs/base-domain-api.yaml).

BaseDomainApiController only forwards list/read/create/update/delete to
GenericApiController and has no URL mappings of its own; the forwarded
behavior is pinned by test_generic_api_contract.py. This module just pins
that the spec stays an intentionally-empty placeholder.
"""

from oas import Spec

spec = Spec("base-domain-api.yaml")


def test_no_paths_declared():
    assert spec.doc["paths"] == {}, (
        "base-domain-api.yaml documents a forwarding base class and must "
        "not declare paths; per-resource endpoints belong to the concrete "
        "subclasses' specs and the generic behavior to generic-api.yaml"
    )
