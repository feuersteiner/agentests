from core.slugs import slugify


def test_lower_cases_and_hyphenates():
    assert slugify("Checkout Service") == "checkout-service"
