# pinwheel-api

The API behind Pinwheel, Oriole's community board for neighbourhood groups. Members share short
posts, optionally with a link, keep a profile with their website, and upload images to show in
their posts. The web and mobile apps call this API through a gateway that signs members in and
passes the member's id in the `X-Member` header.

`app/web.py` is a small request and response layer in the style of Flask, and `app/store.py` keeps
everything in memory in place of Postgres, so the service runs on the Python standard library alone.

## Layout

- `app/__init__.py`: `create_app()`, which registers the routes.
- `app/config.py`: settings, from the environment.
- `app/routes/posts.py`, `members.py`, `images.py`: the endpoints below.
- `app/preview.py`: fetches a member's website for the preview card on their profile.
- `app/html_meta.py`: reads a page's title and `<meta>` tags.
- `app/net.py`: `is_public_url` and `is_public_address`, which tell public internet addresses from
  private ones.
- `app/store.py`: the in-memory tables.
- `tests/`: pytest tests. `tests/fakes.py` holds `FakeWeb`, fake websites served by a local
  server; the `web` fixture points host lookups and connections at it, so no test needs the network.

## API

| Method | Path              | What it does                                                                |
| ------ | ----------------- | --------------------------------------------------------------------------- |
| POST   | `/posts`          | Create a post: `{"text": "...", "url": "https://..."}`; `url` is optional   |
| GET    | `/posts`          | List the posts                                                              |
| GET    | `/posts/<id>`     | One post                                                                    |
| GET    | `/members/<id>`   | A member's profile, with `website_title` for their website's preview card   |
| PUT    | `/members/<id>`   | Change your own `name`, `bio` or `website`                                  |
| POST   | `/images`         | Upload an image: `{"content_type": "image/png", "data": "<base64>"}`        |
| GET    | `/images/<id>`    | An image, its data base64-encoded                                           |

Errors come back as `{"error": "..."}` with a 4xx status.

## Configuration

| Variable                   | Default   | Meaning                                              |
| -------------------------- | --------- | ---------------------------------------------------- |
| `PINWHEEL_FETCH_TIMEOUT_S` | `5`       | Timeout of each outbound request, in seconds         |
| `PINWHEEL_FETCH_MAX_BYTES` | `1000000` | Most bytes read from a page the API fetches          |
| `PINWHEEL_MAX_IMAGE_BYTES` | `5000000` | Largest image a member can upload, in bytes          |

## Tests

```sh
python -m pytest
```
