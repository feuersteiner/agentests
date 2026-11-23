import pytest

from minietl.cli import main


def test_run_help_lists_every_strategy(capsys):
    with pytest.raises(SystemExit) as exit_info:
        main(["run", "--help"])

    assert exit_info.value.code == 0
    usage = capsys.readouterr().out
    for strategy in ("append", "delete+insert", "merge"):
        assert strategy in usage


def test_unknown_strategy_is_rejected_by_the_command_line(capsys):
    with pytest.raises(SystemExit) as exit_info:
        main(["run", "orders", "--db", "warehouse.db", "--strategy", "truncate"])

    assert exit_info.value.code == 2
    assert "invalid choice: 'truncate'" in capsys.readouterr().err
