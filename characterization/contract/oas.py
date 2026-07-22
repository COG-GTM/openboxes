"""Validate live HTTP responses against the OpenAPI specs under openapi/specs/.

For a (method, path template, response) triple this checks that:
  - the operation is declared in the spec,
  - the response status code is declared,
  - the response content type is declared for that status,
  - a JSON body validates against the declared schema (OpenAPI 3.0 dialect,
    cross-file $refs into openapi/components/common.yaml included).

Non-JSON bodies (text/html, text/csv) are only checked for content-type
declaration; a declared response without content requires an empty body.
"""

from pathlib import Path

import yaml
from openapi_schema_validator import OAS30Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT4

REPO_ROOT = Path(__file__).resolve().parents[2]
OPENAPI_DIR = REPO_ROOT / "openapi"
SPECS_DIR = OPENAPI_DIR / "specs"

_docs = {}


def load_doc(path):
    path = path.resolve()
    if path not in _docs:
        _docs[path] = yaml.safe_load(path.read_text())
    return _docs[path]


def _retrieve(uri):
    assert uri.startswith("file://"), f"Unexpected $ref URI: {uri}"
    path = Path(uri[len("file://"):])
    return Resource(contents=load_doc(path), specification=DRAFT4)


REGISTRY = Registry(retrieve=_retrieve)


def pointer_escape(token):
    return token.replace("~", "~0").replace("/", "~1")


def walk_pointer(doc, pointer):
    node = doc
    for token in pointer.lstrip("#").strip("/").split("/"):
        token = token.replace("~1", "/").replace("~0", "~")
        assert isinstance(node, dict) and token in node, (
            f"Pointer {pointer} not found (missing '{token}')"
        )
        node = node[token]
    return node


class Spec:
    """One per-controller spec file under openapi/specs/."""

    def __init__(self, filename):
        self.path = (SPECS_DIR / filename).resolve()
        self.doc = load_doc(self.path)

    def _deref(self, path, pointer):
        """Follow $refs starting at (file, pointer); return final (file, pointer, node)."""
        node = walk_pointer(load_doc(path), pointer)
        while isinstance(node, dict) and "$ref" in node:
            ref = node["$ref"]
            if ref.startswith("#"):
                pointer = ref
            else:
                file_part, _, frag = ref.partition("#")
                path = (path.parent / file_part).resolve()
                pointer = f"#/{frag.strip('/')}"
            node = walk_pointer(load_doc(path), pointer)
        return path, pointer, node

    def operation(self, method, path_template):
        paths = self.doc.get("paths") or {}
        assert path_template in paths, (
            f"{self.path.name}: path {path_template} not declared"
        )
        op = paths[path_template].get(method.lower())
        assert op is not None, (
            f"{self.path.name}: {method.upper()} {path_template} not declared"
        )
        return op

    def validate_response(self, method, path_template, resp):
        op = self.operation(method, path_template)
        status = str(resp.status_code)
        assert status in op.get("responses", {}), (
            f"{self.path.name}: status {status} not declared for "
            f"{method.upper()} {path_template} "
            f"(declared: {sorted(op.get('responses', {}))})"
        )
        base_pointer = "#/paths/{}/{}/responses/{}".format(
            pointer_escape(path_template), method.lower(), status
        )
        path, pointer, response_spec = self._deref(self.path, base_pointer)

        content = response_spec.get("content")
        actual_ct = resp.headers.get("Content-Type", "").split(";")[0].strip()
        if not content:
            assert not resp.content, (
                f"{self.path.name}: {method.upper()} {path_template} {status} "
                f"declares no content but body is non-empty"
            )
            return
        assert actual_ct in content, (
            f"{self.path.name}: content type {actual_ct!r} not declared for "
            f"{method.upper()} {path_template} {status} "
            f"(declared: {sorted(content)})"
        )
        media = content[actual_ct] or {}
        if "schema" not in media or actual_ct != "application/json":
            return
        schema_ref = "{}#{}/content/{}/schema".format(
            path.as_uri(), pointer.lstrip("#"), pointer_escape(actual_ct)
        )
        validator = OAS30Validator({"$ref": schema_ref}, registry=REGISTRY)
        errors = sorted(validator.iter_errors(resp.json()), key=str)
        assert not errors, (
            f"{self.path.name}: body of {method.upper()} {path_template} {status} "
            "violates the spec:\n"
            + "\n".join(f"- {e.json_path}: {e.message}" for e in errors[:10])
        )


def check(client, spec, method, path_template, path=None, **kwargs):
    """Perform a request via the obx ApiClient and validate the response.

    path_template is the OpenAPI path (with {placeholders}); path is the
    concrete request path (defaults to path_template when it has none).
    """
    resp = client.request(method, path or path_template, **kwargs)
    spec.validate_response(method, path_template, resp)
    return resp
