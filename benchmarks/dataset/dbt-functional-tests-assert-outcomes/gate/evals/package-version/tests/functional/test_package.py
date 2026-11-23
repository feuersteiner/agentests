import tomllib
from pathlib import Path

import minietl

ROOT = Path(__file__).resolve().parents[2]


def test_package_version_matches_pyproject():
    project = tomllib.loads((ROOT / "pyproject.toml").read_text())["project"]

    assert minietl.__version__ == project["version"]


def test_changelog_has_an_unreleased_section():
    changelog = (ROOT / "CHANGELOG.md").read_text()

    assert "## Unreleased" in changelog
