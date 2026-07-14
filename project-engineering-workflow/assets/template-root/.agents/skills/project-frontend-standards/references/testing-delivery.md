# Frontend Testing And Delivery

Use for meaningful frontend work. Select evidence by changed risk; do not substitute build success for a visible interaction check.

## Risk-To-Evidence Matrix

| Change | Minimum meaningful evidence |
| --- | --- |
| Pure formatter/selector/helper | focused unit test with boundaries |
| Component state or form behavior | component interaction test including error/recovery |
| Route or multi-step journey | browser/UI path through success and representative failure |
| API/cache/optimistic behavior | integration test for stale, error, retry, duplicate, or rollback state |
| Layout/content/i18n | screenshots or visual inspection at supported constrained/wide widths with long content |
| Accessibility behavior | keyboard/focus inspection plus automated checks where available |
| Large list/media/performance | representative data/asset measurement and regression threshold |
| Security/privacy/third party | boundary tests and approved data/permission review |

## Visible Verification

- Start the actual app or preview when practical and use the same entry point a user uses.
- Click the changed controls and inspect loading, disabled, success, error, retry, close/back, refresh, and repeated-action behavior as relevant.
- Inspect supported window widths, longest realistic copy, mixed language, empty data, and representative populated data.
- Verify that dialogs/drawers can close, focus returns sensibly, tooltips/accessibility names exist, and controls do not shift layout.
- Check console/runtime errors and failed network activity relevant to the path.
- Capture screenshots or a concise UI report. If visible automation is unavailable, state the exact manual path and mark the gap as risk.

## Delivery Review

Review changed code for race conditions, stale state, leaked subscriptions, inaccessible custom controls, sensitive logging, hidden failure, style drift, unbounded rendering, and out-of-scope redesign.

Map each experience-contract state and approved impact to evidence. Use `verified_with_risk` when browser, device, assistive technology, backend, or representative data coverage is unavailable; never call it a full pass from static checks alone.
