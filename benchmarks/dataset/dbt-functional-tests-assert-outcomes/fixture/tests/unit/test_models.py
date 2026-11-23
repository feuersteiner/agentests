import pytest

from minietl.models import MODELS, get_model


def test_get_model_returns_the_registered_model():
    assert get_model("orders") is MODELS["orders"]


def test_get_model_rejects_an_unknown_name():
    with pytest.raises(ValueError):
        get_model("invoices")
