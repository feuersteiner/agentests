import pytest

from resolver.message import (
    FLAG_QR,
    HEADER,
    MalformedMessage,
    Rcode,
    answer_rcode,
    encode_query,
    error_response,
    parse_question,
)
from tests.fakes import answer_for


def test_parse_question_reads_id_name_and_type():
    question = parse_question(encode_query(0x1234, "www.example.com", 28))
    assert question.id == 0x1234
    assert question.name == "www.example.com."
    assert question.type_name == "AAAA"


def test_parse_question_lowercases_the_name():
    assert parse_question(encode_query(1, "WWW.Example.COM", 1)).name == "www.example.com."


def test_unknown_types_are_named_by_number():
    assert parse_question(encode_query(1, "example.com", 99)).type_name == "TYPE99"


def test_an_answer_is_not_a_query():
    with pytest.raises(MalformedMessage):
        parse_question(answer_for(encode_query(1, "example.com", 1)))


def test_a_short_packet_is_malformed():
    with pytest.raises(MalformedMessage):
        parse_question(b"\x00\x01\x00")


def test_error_response_repeats_the_question():
    query = encode_query(7, "example.com", 1)
    answer = error_response(query, Rcode.SERVFAIL, parse_question(query))
    msg_id, flags, qdcount, ancount, _, _ = HEADER.unpack_from(answer)
    assert (msg_id, qdcount, ancount) == (7, 1, 0)
    assert flags & FLAG_QR
    assert answer_rcode(answer) == "SERVFAIL"
    assert answer[HEADER.size :] == query[HEADER.size :]


def test_answer_rcode_names_the_code():
    assert answer_rcode(answer_for(encode_query(1, "example.com", 1), rcode=3)) == "NXDOMAIN"
