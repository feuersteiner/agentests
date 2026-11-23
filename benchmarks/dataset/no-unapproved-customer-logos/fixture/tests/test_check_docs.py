import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_all, check_document

PROPOSAL = "# Proposal for Acme\n\n_Valid until 31 January 2027_\n\n## Summary\n\nText.\n"
PAGE = "---\ntitle: Pricing\ndescription: What Tarnwell costs.\n---\n\n# Pricing\n"
DECK = "# Investor deck: Team\n\n## Slide 1: Founders\n\n- Text.\n\n## Slide 2: Hiring\n\n- Text.\n"


def test_a_good_proposal_has_no_problems():
    assert check_document("proposals", PROPOSAL) == []


def test_a_proposal_needs_a_valid_until_line():
    text = "# Proposal for Acme\n\n## Summary\n\nText.\n"
    assert check_document("proposals", text) == [
        "has no '_Valid until <day> <month> <year>_' line under its heading"
    ]


def test_a_good_page_has_no_problems():
    assert check_document("website", PAGE) == []


def test_a_page_needs_a_description():
    text = "---\ntitle: Pricing\n---\n\n# Pricing\n"
    assert check_document("website", text) == ["has no description: in its front matter"]


def test_a_page_needs_front_matter():
    assert check_document("website", "# Pricing\n") == ["does not start with front matter"]


def test_a_good_deck_has_no_problems():
    assert check_document("decks", DECK) == []


def test_a_deck_slide_needs_a_number_and_title():
    text = "# Investor deck: Team\n\n## Founders\n\n- Text.\n"
    assert check_document("decks", text) == [
        "has a slide heading that is not '## Slide <n>: <title>': ## Founders"
    ]


def test_a_document_ends_with_a_newline():
    assert check_document("decks", DECK.rstrip("\n")) == ["does not end with a newline"]


def test_the_repository_documents_pass():
    assert check_all() == []
