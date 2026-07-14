# UI Automation Contract

Load this reference only when a change touches UI layout, visual hierarchy, browser flow, desktop app screens, navigation, or user-facing buttons.

Route UI work as `interactive automation` unless the user explicitly says not to test visually.

Use this loop (`problem collection -> test -> repair -> record`):

1. Collect the visible issue or risk, including user screenshots, reported broken clicks, or unclear flows.
2. Run the lowest-cost static and build checks first.
3. Exercise the changed user path through the visible interface when browser, app, device, or simulator automation is available.
4. Capture screenshots or a machine-readable UI report for changed first screens and high-risk actions.
5. Record every failed click, layout overlap, clipped label, stale selection, missing feedback, or blocked automation.
6. Repair, rerun the checks, and only then mark the UI path verified.
7. If interactive automation is blocked by the environment, state that clearly and provide the exact manual verification path.

Do not report a full UI pass from static checks alone.
