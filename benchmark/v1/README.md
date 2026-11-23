# v1: skill versus commit gate

This archived method compares baseline, skill, Luna gate and Jev gate on fuzzy
team rules. Claude Code executes tasks; an independent judge evaluates committed
work. Skill/gate arms receive the target rule and same-domain companions.

- [Method, harness and research](workbench/README.md)
- [Pilot protocol](pilot/README.md)
- [Execution and artifact access](run/README.md)
- [Optional fixture ZIP](ARCHIVE.md)
- [Private evidence access](../EVIDENCE.md)

Measured findings, detailed invocation metadata, historical handoffs, proof
reports and conversations are kept in the private evidence repository. Historical
`benchmark-v2` naming refers to this experiment, independently of the new v2.

Root `benchmark`, `benchmark:pilot`, `benchmark:pick` and `benchmark:prove`
scripts target the workbench. Paid execution is not part of maintenance. Offline
checks use `bun --no-env-file run --cwd benchmark/v1/workbench check` and `test`.
The agent loop requires Linux/root (`unshare --mount`), authenticated Claude Code,
built `core/dist` and decision credentials. Hydration preserves original fixture
bytes; historical data defects and proof limitations are documented privately.
