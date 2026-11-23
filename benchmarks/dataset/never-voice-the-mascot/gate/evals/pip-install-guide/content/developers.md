---
title: Developer quick start
---

# Developer quick start

The tracking API has a Python client.

```sh
pip install parceltrack
```

If `pip` reports a conflict with an older `requests`, upgrade it first:

```sh
pip install --upgrade requests
```

Then create a client with your API key and fetch a parcel:

```python
from parceltrack import Client

client = Client(api_key="...")
print(client.parcel("3SABCD123456789").status)
```

The API allows 60 requests a minute for each key.
