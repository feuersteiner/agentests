# Benchmarks

Public sources contain methodology, harness code, test definitions and fixture
manifests. Measured results, scores, detailed run metadata, logs and conversations
belong in the optional [private evidence repository](evidence/EVIDENCE.md).

| Version | Method                                                                                                                        | Sources                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| v1      | Skill versus commit gate, with an agent loop and independent judge.                                                           | [Method](v1/README.md), [optional fixture ZIP](v1/ARCHIVE.md) |
| v2      | Original binary five-case evaluator pilot and a separate ten-situation, six-arm agent study with Luna and TypeSafe-Jev gates. | [Methods](v2/README.md)                                       |

The historical name `benchmark-v2` refers to v1. The new v2 is a separate
experiment. Normal clones and offline checks require neither private access nor
fixture download. See [AGENTS.md](AGENTS.md) for maintenance rules.
