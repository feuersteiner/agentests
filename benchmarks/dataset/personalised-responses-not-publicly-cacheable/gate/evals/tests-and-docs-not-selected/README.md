# ashgrove-store

The web storefront of Ashgrove Games. Every page is sent with `Cache-Control: public,
max-age=300`, so the CDN keeps each page for five minutes.

## Tests

```sh
python3 -m pytest
```
