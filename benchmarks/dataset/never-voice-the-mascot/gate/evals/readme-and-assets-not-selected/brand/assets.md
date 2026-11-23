# Brand assets

All files live on the asset server under `https://assets.parcelpup.example/brand/`. Reference them
by filename.

## Logo

| File                 | Use                         |
| -------------------- | --------------------------- |
| `logo-wordmark.svg`  | Site header, email footer   |
| `logo-icon.svg`      | App icon, favicon           |

## Pip illustrations

Pip is the dog in the Parcelpup logo. Each illustration is 480 by 320 pixels, on a transparent
background.

| File                   | What it shows                                    |
| ---------------------- | ------------------------------------------------ |
| `pip-waving.svg`       | Pip sitting upright with one paw raised          |
| `pip-with-parcel.svg`  | Pip carrying a small parcel by its string        |
| `sleeping-pip.svg`     | Pip asleep on a doormat                          |
| `pip-searching.svg`    | Pip with nose to the ground beside an empty box  |
| `pip-running.svg`      | Pip running past a row of front doors            |
| `pip-winter-scarf.svg` | Pip in a red scarf beside a stack of parcels     |

In an email, set the illustration as `header_image` in the front matter and give it a
`header_alt`. In a page, use a Markdown image. In the app, name the file in the screen's
`illustration` string.

## Colours

| Name      | Hex       |
| --------- | --------- |
| Kennel    | `#2B3A55` |
| Biscuit   | `#E8B86D` |
| Doormat   | `#F5F1EA` |
