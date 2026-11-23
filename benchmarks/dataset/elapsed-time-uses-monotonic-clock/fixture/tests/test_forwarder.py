from resolver.forwarder import Forwarder
from resolver.message import answer_rcode, encode_query
from resolver.querylog import QueryLog
from tests.fakes import DenyClients, answer_for, read_log

CLIENT = "10.20.0.7"


def test_relays_the_upstream_answer(forwarder, transport):
    query = encode_query(42, "example.com", 1)
    assert forwarder.handle(CLIENT, query) == answer_for(query)
    assert transport.sent == [("192.0.2.53", query)]


def test_logs_each_query(forwarder, log_buffer):
    forwarder.handle(CLIENT, encode_query(42, "Example.com", 28))
    [record] = read_log(log_buffer)
    assert record["client"] == CLIENT
    assert record["name"] == "example.com."
    assert record["type"] == "AAAA"
    assert record["upstream"] == "192.0.2.53:53"
    assert record["rcode"] == "NOERROR"
    assert record["ts"].endswith("+00:00")


def test_answers_servfail_when_the_upstream_fails(forwarder, transport):
    transport.fail_next("192.0.2.53")
    answer = forwarder.handle(CLIENT, encode_query(42, "example.com", 1))
    assert answer_rcode(answer) == "SERVFAIL"
    assert forwarder.pool.stats()[0]["failures"] == 1


def test_refuses_a_client_over_its_limit(pool, transport, log_buffer):
    limiter = DenyClients(CLIENT)
    forwarder = Forwarder(pool, transport, limiter, QueryLog(log_buffer), timeout_s=2.0)
    answer = forwarder.handle(CLIENT, encode_query(42, "example.com", 1))
    assert answer_rcode(answer) == "REFUSED"
    assert transport.sent == []
    assert read_log(log_buffer)[0]["rcode"] == "REFUSED"


def test_answers_formerr_to_an_answer_packet(forwarder, transport):
    answer = forwarder.handle(CLIENT, answer_for(encode_query(42, "example.com", 1)))
    assert answer_rcode(answer) == "FORMERR"
    assert transport.sent == []


def test_drops_a_packet_shorter_than_a_header(forwarder):
    assert forwarder.handle(CLIENT, b"\x00\x2a") is None
