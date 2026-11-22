# ICA0024 concept simulators

Small animated simulations for TalTech course ICA0024 (Infrastructure as Code), one concept each: idempotence,
desired state, images, push and pull, plan and state, locking, module versions, checks, GitOps. Each one fits on one
projector screen (1280x720): a big diagram, one caption per step, a few big buttons. One UI per concept, with no modes: the
instructor projects it in a lecture, students step through the same page alone, and a short "why" is shown under every
step. Static files only, nothing loaded from elsewhere: open `index.html` straight from disk, or
serve the folder. The look is the eXtreme Automation (XA) design system, light only, with PT Sans and JetBrains Mono
self-hosted in `assets/fonts/` (SIL Open Font License, see `assets/fonts/OFL.txt`).

```
index.html          start page: the simulations in six groups, one card each, built from the registry
assets/sims.js      the registry: groups (SIM_GROUPS), then per sim id, group, title, one-line idea, lecture, status, card icon
assets/frame.css    XA colour tokens, the frame, the start page
assets/frame.js     the frame: top bar, stage, caption, why line, buttons, step engine, keyboard
assets/logo.svg     the XA logo used in the top bar
assets/icons/       tool logos used beside code snippets (sources in NOTICE.txt)
sims/<id>.html      one simulation per file
tests/test_page.py  static checks (run: python3 tests/test_page.py)
```

In a simulation: Right arrow or Space = next step, Left arrow = step back, R = reset, A = auto-play, 1-4 = the visible
buttons, Esc = back to all simulations. The (i) button in the top bar opens the recap: Remember, Common mistake, Simplified here, Lecture.

Shortcuts: the `justfile` wraps these commands for [just](https://just.systems). `just` lists the recipes:
`just serve` (http://127.0.0.1:8000), `just test` (the page checks), `just ci` (page checks, then the Pages
build into `public/`), `just clean`.

## How to add a simulation

1. Pick its entry in `assets/sims.js` (all 14 planned ones are there; not built yet = `status: 'coming'`). The `id`
   is the file name: `sims/<id>.html`. `group` is its section on the start page (`concepts`, `images`, `servers`,
   `resources`, `modularity`, `workflows`); keep a group's entries together, because the order is also the order of
   the "next sim" links. `lecture` is the number of the lecture that taught the concept first or most fully.
2. Copy a finished sim from `sims/` to `sims/<id>.html`. Keep the `<head>` as is (it loads `../assets/frame.css`,
   `../assets/sims.js`, `../assets/frame.js`); change the `<title>`, the sim's own `<style>` and the script.
3. In the script call `Sim.create({...})` with:
   - `id`: same as the registry entry (the frame takes the title and the "next sim" link from there);
   - `size: [1200, 540]`: your drawing's coordinate space; the frame scales it to fit. Optional
     `portrait: [640, 900]` for phones and tall windows (then check `sim.portrait` in `render`);
   - `state()`: returns a fresh state object (used at load, Reset and step back);
   - `render(s, sim)`: draws state `s`. Make every element with `sim.box(key, 'my-class')` and position it with
     `sim.place(el, x, y, w, h)` in drawing pixels. Same key = same element, so a changed position, size or class
     animates by CSS transition; a new key fades in; a key not asked for in a render fades out. Render the whole
     picture from `s` every time; don't keep DOM state elsewhere;
   - `intro: { caption, why, code, buttons }`: what step 0 shows;
   - `steps: [{ caption, why, code, buttons, run(s, sim) }]`: the story, about 4-7 steps. `run` changes `s`; for a
     multi-phase animation make it `async` and call `sim.render()` + `await sim.wait(ms)` between phases.
     `buttons` (ids, at most 4) is the button set from that step on; leave it out to keep the previous set;
   - `buttons: { id: { label, caption, why, code, run(s, sim) } }` (`label` may be `function (s)` for a switch): free buttons; pressing one shows its caption and
     runs it. Use `sim.say(caption, code)` inside `run` for a caption that depends on the state;
   - `why`: on every step, the intro and every button: 1-3 plain sentences (about 320 characters at most) on why the
     step matters or what would go wrong otherwise. It is always shown under the caption;
   - `code`: the optional "In code:" line under the buttons. One short line of real code or a shell command that
     shows where the idea appears, for example `terraform plan`. Prefer the tools of the course (Terraform or
     OpenTofu, Ansible, Packer, cloud-init, Puppet, Argo CD, GitHub) and plain, correct calls;
   - `recap: { remember, mistake, simplified, lecture }`: the (i) popover. `remember` is the one-sentence takeaway,
     `mistake` the common mistake, `simplified` what the drawing leaves out, `lecture` is `'Lecture N'` and must match
     the registry's `lecture`.
4. Rules of the look: one idea; one caption per step in plain words, about 110 characters at most (fits in two lines
   at 1280 px); at most one short `code` line; no tables, no option boxes, no long labels. Use the colour tokens from
   `frame.css` (`--accent`, `--edge`, `--read` in sync, `--warn` drift or changed, `--bad` destroy or error, `--skip`,
   `--m1`...`--m4` for categories, `--surface`, `--surface-2`, `--line`, `--muted`), never raw colours. Steps must be
   deterministic (step back replays them without animation). Use single-quoted strings in the registry and in sims
   (the checks read them). Plain hyphens only, no en or em dashes. English only.
5. Content rules: facts general and tool-neutral; name a tool only where the "In code" line or a contrast needs it.
   Say "usually" or "often" for tendencies. Illustrative numbers (timings, costs) are marked illustrative in the
   recap. Examples use neutral fictional names (web-1, team "payments", repo `network-infra`), never students, and
   nothing from instructor-only material. Teach the concept, not the tool syntax.
6. Set the registry entry to `status: 'ready'`, run `python3 tests/test_page.py`, and do the verification below.

## Verification checklist

- `python3 tests/test_page.py` passes (CI runs it too).
- 1280x720 on every step and button: no scrolling, the bottom bar fits with the "why".
- 1920x1080 and phone width (390x844); step back from every step; Auto to the end; every button.
- Opened over `http://` and straight from disk (`file://`), no console errors, no network requests.

## Publishing

The repository stays local until the instructor approves the content. Then:

1. Create the public repo `Infra-as-code-ICA0024-TalTech/simulator` and push `main`.
2. Set the repository variable `PAGES_ENABLED=true` (Settings, Secrets and variables, Actions, Variables) and set
   Pages to deploy from GitHub Actions.

`.github/workflows/pages.yml` validates on every push and pull request (`python tests/test_page.py`), and on `main`,
with `PAGES_ENABLED` set to `true`, publishes `index.html`, `assets` and `sims` (nothing else, so `tests/` is not
published), the same as `just pages`.
