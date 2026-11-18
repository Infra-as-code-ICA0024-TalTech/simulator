/*
 * The list of simulations: the start page builds its cards from it, and every simulation
 * takes its title and its "next sim" link from it. Order = order on the start page;
 * keep the entries of one group together, in the groups' order.
 *
 *   id       file name without .html in sims/ (sims/<id>.html), also used in links
 *   group    id of its section on the start page (window.SIM_GROUPS)
 *   title    short name, shown on the card and in the top bar
 *   idea     one line: the one thing the simulation shows
 *   lecture  number of the lecture that taught it first or most fully
 *   status   'ready' (card links to the sim) or 'coming' (card shows "Coming soon")
 *   icon     a tiny static SVG drawing for the card (viewBox 0 0 64 40). Classes (colours in frame.css):
 *            a = rose fill, m = muted fill, t = navy fill, s = navy stroke,
 *            r = green fill, x = maroon fill, xs = maroon stroke
 *
 * To add a simulation: write sims/<id>.html, then set its status to 'ready' here.
 */
window.SIM_GROUPS = [
  { id: 'concepts', title: 'Concepts', idea: 'What makes code a safe way to describe infrastructure.' },
  { id: 'images', title: 'Images', idea: 'Machines built from code instead of from memory.' },
  { id: 'servers', title: 'Servers', idea: 'How configuration reaches machines that already exist.' },
  { id: 'resources', title: 'Resources', idea: 'Plans, state and the order in which cloud things appear.' },
  { id: 'modularity', title: 'Modularity', idea: 'Reusable modules and the checks that guard them.' },
  { id: 'workflows', title: 'Workflows', idea: 'Git as the way infrastructure changes hands.' }
];
window.SIMS = [
  { id: 'idempotence', group: 'concepts', title: 'Idempotence', lecture: 1, status: 'coming',
    idea: 'Running the same code twice leaves the system as it is.',
    icon: '<rect class="m" x="4" y="8" width="24" height="24" rx="5"/><rect class="r" x="36" y="8" width="24" height="24" rx="5"/><path class="s" d="M30 20h4M32 17l3 3-3 3" fill="none" stroke-width="2"/>' },
  { id: 'desired-state', group: 'concepts', title: 'Desired vs actual state', lecture: 1, status: 'coming',
    idea: 'The tool fixes only the difference; a manual change is drift it reverts.',
    icon: '<rect class="r" x="4" y="6" width="22" height="28" rx="4"/><rect class="a" x="38" y="6" width="22" height="28" rx="4"/><path class="s" d="M28 20h8" fill="none" stroke-width="2.5"/>' },
  { id: 'imperative-declarative', group: 'concepts', title: 'Imperative vs declarative', lecture: 1, status: 'coming',
    idea: 'Steps or an end result: only the declaration survives another starting point.',
    icon: '<rect class="m" x="4" y="6" width="26" height="6" rx="2"/><rect class="m" x="4" y="17" width="26" height="6" rx="2"/><rect class="m" x="4" y="28" width="26" height="6" rx="2"/><rect class="a" x="38" y="10" width="22" height="20" rx="4"/>' },
  { id: 'golden-image', group: 'images', title: 'Golden image vs image from code', lecture: 2, status: 'coming',
    idea: 'A hand-made snapshot cannot be rebuilt; an image from code can.',
    icon: '<rect class="x" x="4" y="8" width="22" height="24" rx="4" opacity=".35"/><rect class="a" x="38" y="8" width="22" height="24" rx="4"/><rect class="t" x="43" y="14" width="12" height="3" rx="1.5"/><rect class="t" x="43" y="21" width="8" height="3" rx="1.5"/>' },
  { id: 'bake-or-boot', group: 'images', title: 'Bake vs boot', lecture: 2, status: 'coming',
    idea: 'What goes into the image and what is configured at first boot.',
    icon: '<rect class="m" x="4" y="6" width="34" height="28" rx="5"/><rect class="a" x="8" y="10" width="26" height="9" rx="3"/><rect class="a" x="44" y="22" width="16" height="12" rx="4"/>' },
  { id: 'push-pull', group: 'servers', title: 'Push vs pull', lecture: 3, status: 'coming',
    idea: 'A control machine pushes, or each server pulls on its own timer.',
    icon: '<rect class="a" x="4" y="14" width="14" height="12" rx="3"/><rect class="m" x="42" y="4" width="18" height="9" rx="3"/><rect class="m" x="42" y="16" width="18" height="9" rx="3"/><rect class="m" x="42" y="28" width="18" height="9" rx="3"/><path class="s" d="M20 20h20" fill="none" stroke-width="2"/>' },
  { id: 'partial-state', group: 'servers', title: 'Removing from code is not removing from the server', lecture: 3, status: 'coming',
    idea: 'Config tools manage only what the code mentions; removal needs an explicit step.',
    icon: '<rect class="r" x="4" y="8" width="24" height="10" rx="3"/><rect class="m" x="4" y="22" width="24" height="10" rx="3"/><path class="xs" d="M38 14l12 12M50 14L38 26" fill="none" stroke-width="3"/>' },
  { id: 'plan-and-state', group: 'resources', title: 'Code, state, cloud', lecture: 5, status: 'coming',
    idea: 'The tool compares code with state and plans only the difference.',
    icon: '<rect class="m" x="3" y="8" width="16" height="24" rx="3"/><rect class="a" x="24" y="8" width="16" height="24" rx="3"/><rect class="t" x="45" y="8" width="16" height="24" rx="3"/>' },
  { id: 'dependency-graph', group: 'resources', title: 'Dependency graph', lecture: 5, status: 'coming',
    idea: 'References make a graph: parallel where free, in order where linked.',
    icon: '<rect class="t" x="4" y="16" width="12" height="9" rx="3"/><rect class="a" x="26" y="5" width="12" height="9" rx="3"/><rect class="a" x="26" y="27" width="12" height="9" rx="3"/><rect class="m" x="48" y="16" width="12" height="9" rx="3"/><path class="s" d="M16 19l10-9M16 22l10 9M38 10l10 9M38 31l10-9" fill="none" stroke-width="1.5"/>' },
  { id: 'state-locking', group: 'resources', title: 'Shared state and locking', lecture: 5, status: 'coming',
    idea: 'One remote state, one change at a time; a lock stops overwrites.',
    icon: '<rect class="a" x="18" y="18" width="28" height="19" rx="4"/><path class="s" d="M24 18v-5a8 8 0 0 1 16 0v5" fill="none" stroke-width="3"/>' },
  { id: 'module-versions', group: 'modularity', title: 'Versions and pinning', lecture: 7, status: 'coming',
    idea: 'Pinned consumers upgrade on purpose; consumers on latest get broken.',
    icon: '<rect class="r" x="4" y="8" width="26" height="10" rx="5"/><rect class="x" x="34" y="22" width="26" height="10" rx="5"/><rect class="m" x="4" y="22" width="26" height="10" rx="5"/>' },
  { id: 'quality-pipeline', group: 'modularity', title: 'Checks in order', lecture: 7, status: 'coming',
    idea: 'Cheap fast checks first, slow realistic ones later.',
    icon: '<rect class="r" x="2" y="12" width="12" height="16" rx="3"/><rect class="r" x="17" y="12" width="12" height="16" rx="3"/><rect class="a" x="32" y="12" width="12" height="16" rx="3"/><rect class="m" x="47" y="12" width="12" height="16" rx="3"/>' },
  { id: 'gitops-loop', group: 'workflows', title: 'GitOps reconciliation', lecture: 9, status: 'coming',
    idea: 'Git is the truth; an agent keeps the system matching it.',
    icon: '<circle class="s" cx="32" cy="20" r="13" fill="none" stroke-width="3" stroke-dasharray="60 22"/><circle class="a" cx="32" cy="20" r="5"/>' },
  { id: 'change-flow', group: 'workflows', title: 'Changing another team\'s infrastructure', lecture: 9, status: 'coming',
    idea: 'A pull request with checks replaces ticket ping-pong.',
    icon: '<circle class="a" cx="10" cy="28" r="5"/><circle class="a" cx="10" cy="10" r="5"/><circle class="r" cx="54" cy="10" r="5"/><path class="s" d="M10 15v8M15 10h34" fill="none" stroke-width="2.5"/>' }
];
