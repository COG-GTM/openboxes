"""Contract tests for BaseApiController (openapi/specs/base-api.yaml).

BaseApiController is an abstract base class with no actions and no URL
mappings, so there is no live endpoint to exercise; this module just pins
that the spec stays an intentionally-empty placeholder.
"""

from oas import Spec

spec = Spec("base-api.yaml")


def test_no_paths_declared():
    assert spec.doc["paths"] == {}, (
        "base-api.yaml documents an abstract controller and must not "
        "declare paths; endpoints belong to the subclasses' specs"
    )
