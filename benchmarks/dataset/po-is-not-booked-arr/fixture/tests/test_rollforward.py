import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from rollforward import ending_arr, format_amount, net_new_arr, roll_forward


def test_net_new_arr_takes_off_churn():
    assert net_new_arr(new=260, expansion=70, churn=25) == 305


def test_ending_arr_without_churn():
    assert ending_arr(4415, new=260, expansion=70) == 4745


def test_amounts_are_written_in_thousands():
    assert format_amount(4720) == "$4,720k"
    assert format_amount(45, sign=True) == "+$45k"
    assert format_amount(-30) == "-$30k"


def test_roll_forward_lists_every_line():
    labels = [label for label, _ in roll_forward(4720, new=100)]
    assert labels == ["Opening ARR", "New ARR", "Expansion", "Churn", "Net new ARR", "Ending ARR"]
