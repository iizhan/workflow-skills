# Workflow Manifest And Loop Contract

Workflow architecture uses five linked objects:

```text
Skill -> Workflow Template -> Project Binding -> Workflow Run -> Scenario Loop Run
```

- A Skill is an atomic governed capability.
- A Workflow Template composes Skills, checkpoints, approval gates and subworkflows.
- A Project Binding pins an approved Template version to one project and may only tighten policy.
- A Workflow Run is one observable DAG-shaped execution attempt.
- A Scenario Loop Run owns bounded iterations across analysis, design, plan, implementation, verification and self-test.

The canonical template declaration is `.skill-os/workflows/<template>/workflow.yaml`. Use `project-engineering-workflow workflow-validate` to validate the directory before a Template is recommended or activated.

## Safety Rules

- Only one primary scenario or integration Workflow may be selected for a user request.
- Role and foundation Workflows are dependencies, not parallel primary routes.
- The graph cannot contain back-edges. Repair loops are bounded runtime records.
- Quality scores do not override hard checks, scope confirmation, permissions, contracts, user acceptance or a blocked verification.
- Existing 1.0 Workflow declarations remain read-only and are migrated only through Preview-Confirm-Apply-Verify.
