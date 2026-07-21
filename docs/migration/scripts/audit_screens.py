#!/usr/bin/env python3
"""Phase 0.4 dead-screen audit for OpenBoxes GSP views.

Static analysis that classifies every .gsp under grails-app/views as:
  LIVE       - user-reachable via a controller action, URL mapping, menu link,
               or explicit render(view:)/redirect
  TEMPLATE   - a partial (filename starts with '_') included by a live page
               (transitively, via g:render/g:include/tmpl./layouts)
  SUPERSEDED - the GSP still exists but its controller/action route is served
               by the React SPA (route listed in src/js/components/Router.jsx)
  DEAD       - no controller action, URL mapping, menu, render, or include
               reference found

Usage: python3 docs/migration/scripts/audit_screens.py [repo_root]
Outputs JSON to docs/migration/scripts/screen_inventory.json
"""
import json
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", ".."))
VIEWS = os.path.join(ROOT, "grails-app", "views")
CONTROLLERS = os.path.join(ROOT, "grails-app", "controllers")


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


def read(p):
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()


def lower_first(s):
    return s[:1].lower() + s[1:]


# ---------------------------------------------------------------- enumerate gsps
gsps = []  # view key -> path; view key like "product/list" or "common/_menu"
for dirpath, _, files in os.walk(VIEWS):
    for fn in files:
        if fn.endswith(".gsp"):
            gsps.append(os.path.join(dirpath, fn))
gsps.sort()
key_of = {}  # gsp path -> key relative to views without .gsp
for p in gsps:
    key_of[p] = os.path.relpath(p, VIEWS)[:-4].replace(os.sep, "/")
by_key = {v: k for k, v in key_of.items()}

# ---------------------------------------------------------- controller actions
# controllerName -> {action -> (file, line)}
actions = defaultdict(dict)
controller_files = {}
ACTION_RE = re.compile(r"^\s*def\s+(\w+)\s*(?:\(\s*[^)]*\)\s*\{|=\s*\{)", re.M)
explicit_renders = []  # (view_key, file, line)
flow_prefixes = []  # (view_dir_prefix, file, line) from webflow definitions
for dirpath, _, files in os.walk(CONTROLLERS):
    for fn in files:
        if not fn.endswith("Controller.groovy"):
            continue
        path = os.path.join(dirpath, fn)
        src = read(path)
        cname = lower_first(fn[: -len("Controller.groovy")])
        controller_files[cname] = path
        for m in ACTION_RE.finditer(src):
            line = src[: m.start()].count("\n") + 1
            actions[cname].setdefault(m.group(1), (rel(path), line))
            if m.group(1).endswith("Flow"):
                flow_prefixes.append((cname + "/" + m.group(1)[:-4] + "/", rel(path), line))
        # render(view: "...") / redirect within controllers
        for m in re.finditer(r"""render\s*\(?\s*view:\s*["']([^"']+)["']""", src):
            line = src[: m.start()].count("\n") + 1
            v = m.group(1)
            vkey = v.lstrip("/") if v.startswith("/") else cname + "/" + v
            explicit_renders.append((vkey, rel(path), line))

# render(view:) in other groovy sources (services, taglibs)
for base in ("grails-app/services", "grails-app/taglib", "src/main/groovy"):
    d = os.path.join(ROOT, base)
    for dirpath, _, files in os.walk(d):
        for fn in files:
            if not fn.endswith(".groovy"):
                continue
            path = os.path.join(dirpath, fn)
            src = read(path)
            for m in re.finditer(r"""render\s*\(?\s*view:\s*["']([^"']+)["']""", src):
                v = m.group(1).lstrip("/")
                if "/" in v:
                    line = src[: m.start()].count("\n") + 1
                    explicit_renders.append((v, rel(path), line))

# ------------------------------------------------------------------ react routes
react_routes = []  # (controller, action, file, line)
router = os.path.join(ROOT, "src", "js", "components", "Router.jsx")
rsrc = read(router)
for m in re.finditer(r"""path=\{?["'`]\*\*/([\w/]*)""", rsrc):
    seg = m.group(1).strip("/").split("/")
    line = rsrc[: m.start()].count("\n") + 1
    if seg and seg[0]:
        react_routes.append((seg[0], seg[1] if len(seg) > 1 else "index", "src/js/components/Router.jsx", line))

react_map = {}  # (controller, action) -> (file, line)
for c, a, f, l in react_routes:
    react_map[(c, a)] = (f, l)

# ------------------------------------------------------------- menu references
menu_refs = {}  # (controller, action) -> (file, line)
menu_sources = [
    os.path.join(ROOT, "grails-app", "conf", "runtime.groovy"),
    os.path.join(ROOT, "grails-app", "conf", "application.groovy"),
]
for dirpath, _, files in os.walk(VIEWS):
    for fn in files:
        if "menu" in fn.lower() or dirpath.endswith("layouts"):
            menu_sources.append(os.path.join(dirpath, fn))
LINK_RE = re.compile(r"""controller:\s*["'](\w+)["']\s*,\s*action:\s*["'](\w+)["']|controller\s*=\s*["'](\w+)["'][^>\n]*action\s*=\s*["'](\w+)["']|controller:\s*["'](\w+)["']""")
for path in menu_sources:
    if not os.path.isfile(path):
        continue
    src = read(path)
    for m in LINK_RE.finditer(src):
        line = src[: m.start()].count("\n") + 1
        c = m.group(1) or m.group(3) or m.group(5)
        a = m.group(2) or m.group(4) or "index"
        menu_refs.setdefault((c, a), (rel(path), line))

# ------------------------------------- link/redirect refs across gsps + groovy
link_refs = {}  # (controller, action) -> (file, line)
scan_dirs = [VIEWS, CONTROLLERS, os.path.join(ROOT, "grails-app", "taglib"), os.path.join(ROOT, "grails-app", "services")]
GLINK_RE = re.compile(r"""controller\s*[:=]\s*["'](\w+)["'][^>\n{]{0,120}?action\s*[:=]\s*["'](\w+)["']|action\s*[:=]\s*["'](\w+)["'][^>\n{]{0,120}?controller\s*[:=]\s*["'](\w+)["']""")
gsp_link_lines = defaultdict(list)  # source gsp path -> [(controller, action)]
for d in scan_dirs:
    for dirpath, _, files in os.walk(d):
        for fn in files:
            if not (fn.endswith(".gsp") or fn.endswith(".groovy")):
                continue
            path = os.path.join(dirpath, fn)
            src = read(path)
            for m in GLINK_RE.finditer(src):
                line = src[: m.start()].count("\n") + 1
                c = m.group(1) or m.group(4)
                a = m.group(2) or m.group(3)
                link_refs.setdefault((c, a), (rel(path), line))
                if fn.endswith(".gsp"):
                    gsp_link_lines[path].append((c, a))

# ---------------------------------------------------- template include edges
# g:render template="..." / g:include / tmpl. from each gsp
include_edges = defaultdict(list)  # source gsp path -> [(target_key, line)]
TEMPLATE_RE = re.compile(r"""template\s*[:=]\s*["']([^"'$]+)["']""")
TEMPLATE_NAME_RE = re.compile(r"""templateName=(\w+)""")
DYNAMIC_TMPL_RE = re.compile(r"""template\s*=\s*"\$\{""")
LAYOUT_RE = re.compile(r"""layout\s*[:=]\s*["'](\w+)["']|name=["']layout["']\s+content=["'](\w+)["']|applyLayout\s+name=["'](\w+)["']""")
layout_edges = defaultdict(list)
dynamic_tmpl_dirs = defaultdict(list)  # source gsp path -> True if dynamic template render
for p in gsps:
    src = read(p)
    src_dir = os.path.dirname(key_of[p]).split("/")[0]
    for m in TEMPLATE_RE.finditer(src):
        line = src[: m.start()].count("\n") + 1
        t = m.group(1)
        if t.startswith("../"):
            t = "/" + t[3:]
        if t.startswith("/"):
            parts = t.lstrip("/").rsplit("/", 1)
            tkey = parts[0] + "/_" + parts[1] if len(parts) == 2 else "_" + parts[0]
        else:
            if "/" in t:
                parts = t.rsplit("/", 1)
                tkey = src_dir + "/" + parts[0] + "/_" + parts[1]
            else:
                tkey = src_dir + "/_" + t
        if tkey in by_key:
            include_edges[p].append((tkey, line))
    for m in TEMPLATE_NAME_RE.finditer(src):
        line = src[: m.start()].count("\n") + 1
        tkey = src_dir + "/_" + m.group(1)
        if tkey in by_key:
            include_edges[p].append((tkey, line))
    for m in DYNAMIC_TMPL_RE.finditer(src):
        line = src[: m.start()].count("\n") + 1
        dynamic_tmpl_dirs[p].append((src_dir, line))
    for m in LAYOUT_RE.finditer(src):
        line = src[: m.start()].count("\n") + 1
        lname = m.group(1) or m.group(2) or m.group(3)
        lkey = "layouts/" + lname
        if lkey in by_key:
            layout_edges[p].append((lkey, line))

# templates rendered from controllers/taglibs: render(template: "...")
tmpl_ctrl_refs = {}  # key -> (file, line)
for d in (CONTROLLERS, os.path.join(ROOT, "grails-app", "taglib"), os.path.join(ROOT, "grails-app", "services")):
    for dirpath, _, files in os.walk(d):
        for fn in files:
            if not fn.endswith(".groovy"):
                continue
            path = os.path.join(dirpath, fn)
            src = read(path)
            cname = lower_first(fn[: -len("Controller.groovy")]) if fn.endswith("Controller.groovy") else None
            for m in re.finditer(r"""(?:template:\s*|Template\(\s*)["']([^"'$]+)["']""", src):
                line = src[: m.start()].count("\n") + 1
                t = m.group(1)
                if t.startswith("../"):
                    t = "/" + t[3:]
                if t.startswith("/"):
                    parts = t.lstrip("/").rsplit("/", 1)
                    tkey = parts[0] + "/_" + parts[1] if len(parts) == 2 else "_" + parts[0]
                elif cname:
                    tkey = cname + "/_" + t
                else:
                    continue
                if tkey in by_key:
                    tmpl_ctrl_refs.setdefault(tkey, (rel(path), line))

# ---------------------------------------------------------------- classification
result = {}
evidence = {}

SPECIAL_LIVE = {
    "index": ("grails-app/controllers/org/pih/warehouse/UrlMappings.groovy", 0, "root URL mapping"),
    "error": ("grails-app/controllers/org/pih/warehouse/UrlMappings.groovy", 0, "error handler mapping"),
    "exception": ("grails-app/controllers/org/pih/warehouse/UrlMappings.groovy", 0, "exception handler"),
}

for p in gsps:
    key = key_of[p]
    parts = key.split("/")
    fname = parts[-1]
    is_template = fname.startswith("_")
    cdir = parts[0]
    result[p] = None
    if is_template or cdir == "layouts":
        continue  # resolved in fixpoint below
    if key in SPECIAL_LIVE:
        f, l, why = SPECIAL_LIVE[key]
        result[p] = "LIVE"
        evidence[p] = f"{f}:{l} ({why})"
        continue
    action = fname
    reachable = None
    for pref, f, l in flow_prefixes:
        if key.startswith(pref):
            reachable = (f, l, "webflow state view")
            break
    if cdir in actions and action in actions[cdir]:
        f, l = actions[cdir][action]
        reachable = (f, l, "controller action (convention)")
    if not reachable:
        for vkey, f, l in explicit_renders:
            if vkey == key:
                reachable = (f, l, "explicit render(view:)")
                break
    if not reachable and (cdir, action) in menu_refs:
        f, l = menu_refs[(cdir, action)]
        reachable = (f, l, "menu/nav link")
    if not reachable and (cdir, action) in link_refs:
        f, l = link_refs[(cdir, action)]
        reachable = (f, l, "g:link/redirect reference")
    # superseded check: exact controller/action React route
    sup = react_map.get((cdir, action))
    if sup:
        result[p] = "SUPERSEDED"
        evidence[p] = f"{sup[0]}:{sup[1]} (React SPA route **/{cdir}/{action})"
    elif reachable:
        result[p] = "LIVE"
        evidence[p] = f"{reachable[0]}:{reachable[1]} ({reachable[2]})"
    else:
        result[p] = "DEAD"
        evidence[p] = "no controller action, URL mapping, menu, render, or link reference found"

# fixpoint for templates & layouts: live if included by LIVE/TEMPLATE page,
# or rendered directly from a controller/taglib
changed = True
while changed:
    changed = False
    for src_p, targets in list(include_edges.items()) + list(layout_edges.items()):
        if result.get(src_p) in ("LIVE", "TEMPLATE"):
            for tkey, line in targets:
                tp = by_key[tkey]
                if result.get(tp) is None:
                    result[tp] = "TEMPLATE"
                    evidence[tp] = f"{rel(src_p)}:{line} (included by live page)"
                    changed = True
for tkey, (f, l) in tmpl_ctrl_refs.items():
    tp = by_key[tkey]
    if result.get(tp) is None:
        result[tp] = "TEMPLATE"
        evidence[tp] = f"{f}:{l} (rendered from controller/taglib)"

# generic groovy string literals "/dir/name" that resolve to a view template
# (covers templates passed as plain string arguments, e.g. sendAlerts(subject, "/email/expiryAlerts", ...))
for base in ("grails-app", "src/main/groovy"):
    d = os.path.join(ROOT, base)
    for dirpath, _, files in os.walk(d):
        for fn in files:
            if not fn.endswith(".groovy"):
                continue
            path = os.path.join(dirpath, fn)
            src = read(path)
            for m in re.finditer(r"""["']/(\w+)/(\w+)["']""", src):
                tkey = m.group(1) + "/_" + m.group(2)
                if tkey in by_key:
                    tp = by_key[tkey]
                    if result.get(tp) is None:
                        line = src[: m.start()].count("\n") + 1
                        result[tp] = "TEMPLATE"
                        evidence[tp] = f"{rel(path)}:{line} (template path string literal)"

# React SPA shell layout: controllers render(view: "/common/react") which is
# served through the react layout
react_layout = by_key.get("layouts/react")
if react_layout is not None and result.get(react_layout) is None:
    result[react_layout] = "TEMPLATE"
    evidence[react_layout] = "grails-app/controllers/org/pih/warehouse/putaway/PutAwayController.groovy:25 (React SPA shell, render(view: \"/common/react\"))"

# grails default layout
main_layout = by_key.get("layouts/main")
if main_layout is not None and result.get(main_layout) is None:
    result[main_layout] = "TEMPLATE"
    evidence[main_layout] = "grails-app/views/layouts/main.gsp:1 (Grails default layout)"

# second fixpoint pass now that controller-rendered templates / default layout are live
changed = True
while changed:
    changed = False
    for src_p, targets in list(include_edges.items()) + list(layout_edges.items()):
        if result.get(src_p) in ("LIVE", "TEMPLATE"):
            for tkey, line in targets:
                tp = by_key[tkey]
                if result.get(tp) is None:
                    result[tp] = "TEMPLATE"
                    evidence[tp] = f"{rel(src_p)}:{line} (included by live page)"
                    changed = True
    # dynamic template renders: mark unresolved templates in same dir
    for src_p, dirs in dynamic_tmpl_dirs.items():
        if result.get(src_p) in ("LIVE", "TEMPLATE"):
            for src_dir, line in dirs:
                for tkey, tp in by_key.items():
                    if tkey.startswith(src_dir + "/_") and result.get(tp) is None:
                        result[tp] = "TEMPLATE"
                        evidence[tp] = f"{rel(src_p)}:{line} (dynamic template render in live page)"
                        changed = True

for p in gsps:
    if result.get(p) is None:
        result[p] = "DEAD"
        evidence[p] = "template/layout not included by any live page"

# ------------------------------------------------------------------------ output
out = []
for p in gsps:
    out.append({
        "gsp": rel(p),
        "key": key_of[p],
        "classification": result[p],
        "evidence": evidence.get(p, ""),
    })
counts = defaultdict(int)
for r in out:
    counts[r["classification"]] += 1
dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screen_inventory.json")
with open(dest, "w", encoding="utf-8") as f:
    json.dump({"counts": dict(counts), "screens": out}, f, indent=1)
print(json.dumps(dict(counts), indent=1))
print("wrote", dest)
