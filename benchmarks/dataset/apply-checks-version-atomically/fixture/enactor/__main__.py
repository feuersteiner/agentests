"""python -m enactor: run one enactor until it is stopped."""

import argparse
import logging

from enactor import config, dns, loop, store


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="enactor", description="Apply the newest DNS plan.")
    parser.add_argument("--once", action="store_true", help="apply the newest plan once and exit")
    args = parser.parse_args(argv)

    settings = config.load()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    store.connect(settings.db_path)
    dns.configure(dns.HttpDnsClient(settings.dns_url, settings.dns_token))
    if args.once:
        loop.run_once()
    else:
        loop.run_forever(settings.interval_seconds)


if __name__ == "__main__":
    main()
