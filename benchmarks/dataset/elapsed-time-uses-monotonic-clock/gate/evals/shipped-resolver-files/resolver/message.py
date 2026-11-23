"""The parts of a DNS message the forwarder reads or writes.

Queries and answers are relayed as they are. The forwarder only reads the
header and the question, and builds an answer itself when it cannot relay one.
"""

import struct
from dataclasses import dataclass
from enum import IntEnum

HEADER = struct.Struct("!HHHHHH")  # id, flags, qdcount, ancount, nscount, arcount

FLAG_QR = 0x8000
FLAG_RD = 0x0100
FLAG_RA = 0x0080

QTYPES = {
    1: "A",
    2: "NS",
    5: "CNAME",
    6: "SOA",
    12: "PTR",
    15: "MX",
    16: "TXT",
    28: "AAAA",
    33: "SRV",
}


class Rcode(IntEnum):
    NOERROR = 0
    FORMERR = 1
    SERVFAIL = 2
    NXDOMAIN = 3
    REFUSED = 5


class MalformedMessage(ValueError):
    """The packet is not a DNS query the forwarder can read."""


@dataclass(frozen=True)
class Question:
    id: int
    name: str
    qtype: int
    end: int  # offset of the first byte after the question

    @property
    def type_name(self) -> str:
        return QTYPES.get(self.qtype, f"TYPE{self.qtype}")


def parse_question(packet: bytes) -> Question:
    """The id and the one question of a query."""
    if len(packet) < HEADER.size:
        raise MalformedMessage("packet is shorter than a DNS header")
    msg_id, flags, qdcount, _, _, _ = HEADER.unpack_from(packet)
    if flags & FLAG_QR:
        raise MalformedMessage("packet is an answer, not a query")
    if qdcount != 1:
        raise MalformedMessage(f"expected one question, got {qdcount}")
    labels = []
    offset = HEADER.size
    while packet[offset] != 0:
        length = packet[offset]
        labels.append(packet[offset + 1 : offset + 1 + length].decode("ascii").lower())
        offset += 1 + length
    qtype, _qclass = struct.unpack_from("!HH", packet, offset + 1)
    return Question(msg_id, ".".join(labels) + ".", qtype, offset + 5)


def encode_query(msg_id: int, name: str, qtype: int, rd: bool = True) -> bytes:
    """A query for `name`, as a client would send it."""
    qname = b"".join(
        bytes([len(label)]) + label.encode("ascii") for label in name.split(".") if label
    )
    flags = FLAG_RD if rd else 0
    return HEADER.pack(msg_id, flags, 1, 0, 0, 0) + qname + b"\x00" + struct.pack("!HH", qtype, 1)


def answer_rcode(packet: bytes) -> str:
    """The name of an answer's response code, such as NOERROR or NXDOMAIN."""
    code = HEADER.unpack_from(packet)[1] & 0x000F
    try:
        return Rcode(code).name
    except ValueError:
        return f"RCODE{code}"


def error_response(query: bytes, rcode: Rcode, question: Question | None = None) -> bytes:
    """An answer to `query` with no records and the given response code.

    It repeats the question when the query could be read.
    """
    msg_id = HEADER.unpack_from(query)[0]
    flags = FLAG_QR | rcode
    if question is None:
        return HEADER.pack(msg_id, flags, 0, 0, 0, 0)
    return HEADER.pack(msg_id, flags, 1, 0, 0, 0) + query[HEADER.size : question.end]
