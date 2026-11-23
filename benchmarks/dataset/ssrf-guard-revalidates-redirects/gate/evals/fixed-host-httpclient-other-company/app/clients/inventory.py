"""Client for Fernvale Outfitters' inventory service, which runs beside this one in the cluster."""

import http.client
import json

from app import config


class InventoryError(Exception):
    pass


def stock_level(sku):
    """Units of `sku` on hand across all warehouses."""
    connection = http.client.HTTPConnection(
        config.INVENTORY_HOST, config.INVENTORY_PORT, timeout=config.HTTP_TIMEOUT_S
    )
    try:
        connection.request("GET", f"/v1/stock/{sku}", headers={"Accept": "application/json"})
        response = connection.getresponse()
        if response.status == 404:
            return 0
        if response.status != 200:
            raise InventoryError(f"inventory answered {response.status} for {sku}")
        return json.loads(response.read())["on_hand"]
    except (OSError, http.client.HTTPException, KeyError, ValueError) as exc:
        raise InventoryError(f"could not read stock for {sku}") from exc
    finally:
        connection.close()
