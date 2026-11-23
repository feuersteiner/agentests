"""Reads a page's title and its <meta> tags, such as Open Graph's og:image, from its HTML."""

from html.parser import HTMLParser


class _HeadParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_parts = []
        self.meta = {}
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            key = attributes.get("property") or attributes.get("name")
            content = attributes.get("content")
            if key and content is not None:
                self.meta.setdefault(key.lower(), content)

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title_parts.append(data)


def _parse(html):
    parser = _HeadParser()
    parser.feed(html)
    parser.close()
    return parser


def page_title(html):
    """The page's og:title, or else its <title>; None when it has neither."""
    parser = _parse(html)
    title = parser.meta.get("og:title") or "".join(parser.title_parts)
    return title.strip() or None


def page_meta(html):
    """The page's <meta> tags, keyed by their property or name in lower case."""
    return dict(_parse(html).meta)
