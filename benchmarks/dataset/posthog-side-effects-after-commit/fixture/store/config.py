"""Settings, read from the environment with defaults for local work."""

import os

MAIL_FROM = os.environ.get("FERNBANK_MAIL_FROM", "orders@fernbankseeds.example")
MAIL_RELAY_URL = os.environ.get("FERNBANK_MAIL_RELAY_URL", "https://mail.fernbankseeds.example/send")
PAYWELL_URL = os.environ.get("FERNBANK_PAYWELL_URL", "https://api.paywell.example/v1")
WAREHOUSE_HOOK = os.environ.get("FERNBANK_WAREHOUSE_HOOK", "https://warehouse.fernbankseeds.example/hook")
