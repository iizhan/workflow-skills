# Skill Management Workbench Event Model Draft

## 1. Event Model Goal

The event model defines how the application captures and normalizes:

- authorization actions
- scan operations
- Skill execution telemetry
- tool calls
- graph evidence
- optimization evidence

The raw event layer should be append-only and replayable.

## 2. Event Principles

- every event must have a stable `event_id`
- every event must have `occurred_at`
- every event must have `event_type`
- every event must have `source_type`
- every event must be traceable to either a user action, a scanner action, or a runtime action

Recommended raw event format:

- newline-delimited JSON
- one event per line
- immutable after write

## 3. Common Event Envelope

All events should include:

- `event_id`
- `event_type`
- `occurred_at`
- `source_type`
- `source_ref`
- `workspace_ref`
- `session_ref`
- `policy_ref`
- `payload`

Field notes:

- `source_type`: `user_action`, `scanner`, `runtime`, `log_parser`, `manual_entry`, `system`
- `source_ref`: local origin hint such as file path, process id, log source, or UI action id
- `workspace_ref`: nullable local workspace identity
- `session_ref`: nullable run or conversation session identity
- `policy_ref`: nullable authorization policy identity

## 4. Authorization Events

### 4.1 `authorization.granted`

When:

- user confirms first-run or updated permission set

Payload should include:

- approved scan roots
- exclusions
- telemetry mode
- raw content setting
- background watcher setting
- storage root

### 4.2 `authorization.updated`

When:

- user changes one or more permissions

Payload should include:

- changed fields
- old values summary
- new values summary

### 4.3 `authorization.revoked`

When:

- user disables scanning or telemetry

Payload should include:

- revoked capability
- affected roots if relevant

## 5. Scan Events

### 5.1 `scan.started`

Payload should include:

- scan run id
- trigger type
- root count

### 5.2 `scan.skill_detected`

Payload should include:

- scan run id
- file path
- source type
- parse hint

### 5.3 `scan.skill_indexed`

Payload should include:

- scan run id
- skill id
- version fingerprint
- content hash
- parse summary

### 5.4 `scan.failed`

Payload should include:

- scan run id
- failure category
- path if relevant
- summary

### 5.5 `scan.completed`

Payload should include:

- scan run id
- duration
- roots scanned
- files seen
- skills found
- changed Skills
- error count

## 6. Skill Runtime Events

### 6.1 `skill_run.started`

Payload should include:

- run id
- skill id
- skill version id or fingerprint
- workspace id
- model name if available
- capture mode

### 6.2 `skill_run.first_output`

Payload should include:

- run id
- latency ms

### 6.3 `skill_run.tool_called`

Payload should include:

- run id
- tool call id
- tool name
- tool namespace

### 6.4 `skill_run.completed`

Payload should include:

- run id
- duration ms
- prompt tokens
- completion tokens
- total tokens
- estimated cost usd
- tool call count
- status

### 6.5 `skill_run.failed`

Payload should include:

- run id
- duration ms if known
- error code
- error summary
- tool call count if known

## 7. Tool Call Events

### 7.1 `tool_call.started`

Payload should include:

- tool call id
- parent run id
- tool name

### 7.2 `tool_call.completed`

Payload should include:

- tool call id
- parent run id
- duration ms
- status

### 7.3 `tool_call.failed`

Payload should include:

- tool call id
- parent run id
- duration ms if known
- error summary

## 8. Graph Evidence Events

### 8.1 `graph.edge_observed`

Purpose:

- record a runtime or registry observation that supports a graph edge

Payload should include:

- edge type
- from ref
- to ref
- evidence type
- confidence score

## 9. Optimization Evidence Events

### 9.1 `optimization.signal_detected`

When:

- analytics identifies a candidate issue

Payload should include:

- skill id
- signal type
- severity
- evidence summary

### 9.2 `optimization.proposal_created`

Payload should include:

- proposal id
- proposal type
- target skill id
- estimated benefit

### 9.3 `optimization.proposal_actioned`

Payload should include:

- proposal id
- action type
- actor summary

## 10. Packaging Events

### 10.1 `bundle.created`

Payload should include:

- bundle id
- bundle type
- item count
- export path

### 10.2 `bundle.imported`

Payload should include:

- bundle id
- import mode
- imported item count

## 11. Capture Modes

Every runtime-related event should carry a capture mode.

Allowed values:

- `precise`
- `inferred`
- `manual`

Guidance:

- `precise`: emitted directly from runtime
- `inferred`: parsed from logs or external traces
- `manual`: entered by a user or reviewer

## 12. Confidence Model

Recommended normalized confidence labels:

- `high`
- `medium`
- `low`

Suggested mapping:

- native runtime event -> `high`
- structured log parse -> `medium`
- heuristic parse or manual estimate -> `low`

## 13. Minimum MVP Event Set

The MVP does not need every event above.

Minimum viable events:

- `authorization.granted`
- `scan.started`
- `scan.skill_indexed`
- `scan.completed`
- `skill_run.started`
- `skill_run.completed`
- `skill_run.failed`
- `optimization.signal_detected`
- `optimization.proposal_created`

## 14. Example Normalized Raw Event

```json
{
  "event_id": "evt_01",
  "event_type": "skill_run.completed",
  "occurred_at": "2026-06-03T12:00:00.000Z",
  "source_type": "runtime",
  "source_ref": "codex-local-runtime",
  "workspace_ref": "ws_01",
  "session_ref": "sess_01",
  "policy_ref": "policy_01",
  "payload": {
    "run_id": "run_01",
    "skill_id": "skill_01",
    "capture_mode": "precise",
    "duration_ms": 1832,
    "prompt_tokens": 901,
    "completion_tokens": 312,
    "total_tokens": 1213,
    "estimated_cost_usd": 0.0124,
    "tool_call_count": 3,
    "status": "success"
  }
}
```

## 15. Replay Requirement

The system should be able to:

- replay raw events into an empty SQLite database
- rebuild graph edges from raw event history
- regenerate analytics snapshots after schema evolution

This is one of the main reasons raw event logs must be append-only.
