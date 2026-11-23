set shell := ["bash", "-euo", "pipefail", "-c"]

# List the simulator recipes (also the default recipe).
help:
    @just --list

# Serve the simulator at http://127.0.0.1:8000 (opening index.html from disk works too).
serve port="8000":
    python3 -m http.server {{port}} --bind 127.0.0.1

# Open the start page straight from disk in the default browser.
open:
    open index.html

# Run the static page checks (the CI page-tests job).
test:
    python3 tests/test_page.py

# Build the GitHub Pages site into public/ like the CI build job.
pages:
    rm -rf public
    mkdir public && cp -r index.html assets sims public/

# Run both CI jobs locally: page checks, then the Pages build.
ci: test pages

# Remove the local public/ build.
clean:
    rm -rf public

# Zip the last commit as <repo>-source-<timestamp>.zip (to share with students).
package:
    out="{{file_name(justfile_directory())}}-source-$(date +%Y%m%d-%H%M%S).zip"; git archive --format=zip --output="$out" HEAD && echo "packaged $out"

# Zip the working tree as it is now: tracked and new files, without ignored ones.
package-worktree:
    out="{{file_name(justfile_directory())}}-source-$(date +%Y%m%d-%H%M%S).zip"; git ls-files -z -co --exclude-standard | while IFS= read -r -d '' f; do [ -e "$f" ] && printf '%s\n' "$f"; done | zip -q "$out" -@ && echo "packaged $out"
