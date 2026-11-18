"""Static checks for the simulator: self-contained pages, registry and sim files agree.

A 'coming' entry may have no file yet; a 'ready' entry must have sims/<id>.html.
Run: python3 tests/test_page.py   (no dependencies; exit code 1 on any problem)
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "assets" / "sims.js"
ALLOWED_URLS = {"http://www.w3.org/2000/svg"}  # SVG namespace inside inline icons, not a request
# Credit links in a sim's (i) note: a link the trainer may click, never loaded by the page. Only as href="...".
CREDIT_LINKS = set()
FRAME_FILES = ("../assets/frame.css", "../assets/sims.js", "../assets/frame.js")
EXPECTED_IDS = (
    "idempotence", "desired-state", "imperative-declarative",
    "golden-image", "bake-or-boot",
    "push-pull", "partial-state",
    "plan-and-state", "dependency-graph", "state-locking",
    "module-versions", "quality-pipeline",
    "gitops-loop", "change-flow",
)
EXPECTED_GROUPS = ("concepts", "images", "servers", "resources", "modularity", "workflows")  # start page sections, in order
LECTURES = {
    "idempotence": 1, "desired-state": 1, "imperative-declarative": 1,
    "golden-image": 2, "bake-or-boot": 2,
    "push-pull": 3, "partial-state": 3,
    "plan-and-state": 5, "dependency-graph": 5, "state-locking": 5,
    "module-versions": 7, "quality-pipeline": 7,
    "gitops-loop": 9, "change-flow": 9,
}
RECAP_KEYS = ("remember", "mistake", "simplified", "lecture")
MAX_CAPTION = 120
MAX_WHY = 340
DASHES = {"\u2013": "en dash", "\u2014": "em dash"}  # course writing rule: plain hyphens only


def web_files():
    files = [ROOT / "index.html"] if (ROOT / "index.html").exists() else []
    for folder in ("assets", "sims"):
        files += sorted(p for p in (ROOT / folder).rglob("*") if p.suffix in {".html", ".js", ".css"})
    return files


def registry_entries(errors):
    if not REGISTRY.exists():
        errors.append("assets/sims.js is missing")
        return []
    text = REGISTRY.read_text(encoding="utf-8").split("window.SIMS", 1)[-1]
    entries = []
    for block in re.findall(r"\{\s*id:.*?\}\s*(?=,\s*\{|\s*\];)", text, flags=re.S):
        fields = dict(re.findall(r"\b(id|group|title|status|idea)\s*:\s*'((?:[^'\\]|\\.)*)'", block))
        if not {"id", "title", "status", "idea"} <= fields.keys():
            errors.append(f"registry entry misses id/title/idea/status: {block[:60]}...")
            continue
        num = re.search(r"\blecture\s*:\s*(\d+)", block)
        fields["lecture"] = int(num.group(1)) if num else None
        if fields["lecture"] is None:
            errors.append(f"registry entry without numeric lecture: {fields['id']}")
        elif fields["id"] in LECTURES and fields["lecture"] != LECTURES[fields["id"]]:
            errors.append(f"{fields['id']}: lecture {fields['lecture']} should be {LECTURES[fields['id']]}")
        if "icon:" not in block:
            errors.append(f"registry entry without icon: {fields['id']}")
        entries.append(fields)
    return entries


def registry_groups(errors):
    if not REGISTRY.exists():
        return []
    text = REGISTRY.read_text(encoding="utf-8")
    m = re.search(r"window\.SIM_GROUPS\s*=\s*\[(.*?)\];", text, flags=re.S)
    if not m:
        errors.append("registry has no window.SIM_GROUPS")
        return []
    return re.findall(r"\{\s*id:\s*'([\w-]+)',\s*title:\s*'[^']+'", m.group(1))


def check_groups(entries, groups, errors):
    if tuple(groups) != EXPECTED_GROUPS:
        errors.append(f"SIM_GROUPS should be {EXPECTED_GROUPS}, not {tuple(groups)}")
    seen = []
    for e in entries:
        g = e.get("group")
        if g not in groups:
            errors.append(f"{e['id']}: group '{g}' is not in SIM_GROUPS")
            continue
        if not seen or seen[-1] != g:
            if g in seen:
                errors.append(f"{e['id']}: group '{g}' is split; keep a group's entries together")
            seen.append(g)
    if [g for g in groups if g in seen] != seen:
        errors.append(f"registry order {seen} does not follow the order of SIM_GROUPS")


def check_external(path, text, errors):
    rel = path.relative_to(ROOT)
    decoded = text.replace("%3A", ":").replace("%2F", "/")
    for url in re.findall(r"(?:https?:)?//[\w.-]+\.[a-z]{2,}[^\s'\"<>)]*", decoded):
        if url in CREDIT_LINKS and f'href="{url}"' in text:
            continue
        if url not in ALLOWED_URLS:
            errors.append(f"{rel}: external URL {url}")
    for pattern, what in ((r"@import", "CSS @import"), (r"\bfetch\(", "fetch()"), (r"XMLHttpRequest", "XMLHttpRequest"),
                          (r"\bimport\s*\(", "dynamic import"), (r"<script[^>]+type=\"module\"", "module script (blocked on file://)")):
        if re.search(pattern, text):
            errors.append(f"{rel}: {what}")
    if path.suffix == ".css":
        check_css(path, text, errors)
    if path.suffix != ".html":
        return
    for ref in re.findall(r"\b(?:src|href)=\"([^\"#?]+)", text):
        if ref.startswith(("data:", "http:", "https:", "//")):
            continue  # data URIs are inline; external URLs are reported above
        if not (path.parent / ref).exists():
            errors.append(f"{rel}: missing local file {ref}")


def check_css(path, text, errors):
    rel = path.relative_to(ROOT)
    for ref in re.findall(r"url\(\s*['\"]?([^'\")]+?)['\"]?\s*\)", text):
        if ref.startswith("data:") or ref.startswith(("http:", "https:", "//")):
            continue  # external URLs are reported by check_external
        if not (path.parent / ref.split("#", 1)[0].split("?", 1)[0]).exists():
            errors.append(f"{rel}: css url({ref}) points to a missing local file")
    if "@font-face" in text and not (ROOT / "assets" / "fonts" / "OFL.txt").exists():
        errors.append(f"{rel}: has @font-face but assets/fonts/OFL.txt is missing")


def check_sim_text(page, sim_id, text, errors):
    rel = page.relative_to(ROOT)
    captions = re.findall(r"\bcaption:\s*'((?:[^'\\]|\\.)*)'", text)
    whys = re.findall(r"\bwhy:\s*'((?:[^'\\]|\\.)*)'", text)
    for c in captions:
        if len(c) > MAX_CAPTION:
            errors.append(f"{rel}: caption of {len(c)} characters (max {MAX_CAPTION}): {c[:50]}...")
    for w in whys:
        if len(w) > MAX_WHY:
            errors.append(f"{rel}: why of {len(w)} characters (max {MAX_WHY}): {w[:50]}...")
    if len(whys) < len(captions):
        errors.append(f"{rel}: {len(whys)} why strings for {len(captions)} captions (every step and button needs a why)")
    m = re.search(r"recap:\s*\{(.*?)\}", text, flags=re.S)
    if not m:
        errors.append(f"{rel}: no recap: {{ ... }}")
        return
    for key in RECAP_KEYS:
        if not re.search(r"\b" + key + r"\s*:", m.group(1)):
            errors.append(f"{rel}: recap misses '{key}'")
    if sim_id in LECTURES and f"lecture: 'Lecture {LECTURES[sim_id]}'" not in text:
        errors.append(f"{rel}: recap.lecture should be 'Lecture {LECTURES[sim_id]}'")


def check_text(path, text, errors):
    rel = path.relative_to(ROOT)
    for char, name in DASHES.items():
        if char in text:
            line = text[: text.index(char)].count("\n") + 1
            errors.append(f"{rel}:{line}: {name} (use a plain hyphen)")


def main() -> int:
    errors = []
    for path in web_files():
        text = path.read_text(encoding="utf-8")
        check_external(path, text, errors)
        check_text(path, text, errors)
    readme = ROOT / "README.md"
    if readme.exists():
        check_text(readme, readme.read_text(encoding="utf-8"), errors)

    entries = registry_entries(errors)
    ids = [e["id"] for e in entries]
    check_groups(entries, registry_groups(errors), errors)
    if len(ids) != len(set(ids)):
        errors.append("duplicate ids in the registry")
    for missing in sorted(set(EXPECTED_IDS) - set(ids)):
        errors.append(f"registry misses the planned sim '{missing}'")
    for e in entries:
        if e["status"] not in ("ready", "coming"):
            errors.append(f"{e['id']}: status must be ready or coming, not {e['status']}")
        if e["status"] == "ready" and not (ROOT / "sims" / f"{e['id']}.html").exists():
            errors.append(f"{e['id']}: marked ready but sims/{e['id']}.html is missing")

    ready_ids = {e["id"] for e in entries if e["status"] == "ready"}
    for page in sorted((ROOT / "sims").glob("*.html")):
        text = page.read_text(encoding="utf-8")
        sim_id = page.stem
        if sim_id not in ids:
            errors.append(f"sims/{page.name}: no registry entry with id '{sim_id}'")
        for needed in FRAME_FILES:
            if f'"{needed}"' not in text:
                errors.append(f"sims/{page.name}: does not load {needed}")
        if not re.search(r"Sim\.create\(\{\s*id:\s*'" + re.escape(sim_id) + "'", text):
            errors.append(f"sims/{page.name}: no Sim.create({{ id: '{sim_id}', ... }})")
        if sim_id in ready_ids:
            check_sim_text(page, sim_id, text, errors)
        if re.search(r"\bsql\s*:", text):
            errors.append(f"sims/{page.name}: uses an 'sql' field; the frame reads 'code' (the In code: line)")

    index_file = ROOT / "index.html"
    index = index_file.read_text(encoding="utf-8") if index_file.exists() else ""
    if not index_file.exists():
        errors.append("index.html is missing")
    for needed in ("assets/frame.css", "assets/sims.js", "assets/frame.js"):
        if f'"{needed}"' not in index:
            errors.append(f"index.html: does not load {needed}")

    for error in errors:
        print("FAIL", error)
    ready = sum(1 for e in entries if e["status"] == "ready")
    print(f"ok: {len(entries)} sims in the registry, {ready} ready" if not errors else f"{len(errors)} problem(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
