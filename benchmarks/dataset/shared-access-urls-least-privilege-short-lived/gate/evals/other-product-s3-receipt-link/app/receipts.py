"""Receipts for Tidewell, a ferry booking site: a passenger downloads the PDF of one booking."""

import boto3

RECEIPTS_BUCKET = "tidewell-receipts"
s3 = boto3.client("s3")


def receipt_url(booking_id: str) -> str:
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": RECEIPTS_BUCKET, "Key": f"receipts/{booking_id}.pdf"},
        ExpiresIn=900,
    )
