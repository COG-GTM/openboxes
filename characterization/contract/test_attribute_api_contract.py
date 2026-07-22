"""Contract tests for AttributeApiController (openapi/specs/attribute-api.yaml)."""

from oas import Spec, check

spec = Spec("attribute-api.yaml")


def test_list(client):
    check(client, spec, "GET", "/api/attributes")


def test_list_by_entity_type(client):
    check(client, spec, "GET", "/api/attributes",
          params={"entityType": "PRODUCT"})
