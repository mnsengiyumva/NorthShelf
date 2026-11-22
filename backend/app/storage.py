"""File storage on any S3-compatible service (Cloudflare R2, AWS S3, ...).

Uploaded files are private. Users download through a short-lived signed link,
so the bucket itself never needs to be public and needs no CORS setup.
"""
import re
from functools import lru_cache

import boto3
from botocore.config import Config

from .config import settings


class StorageNotConfigured(RuntimeError):
    pass


def is_configured() -> bool:
    return all(
        [settings.s3_endpoint_url, settings.s3_access_key_id,
         settings.s3_secret_access_key, settings.s3_bucket]
    )


@lru_cache
def _client():
    if not is_configured():
        raise StorageNotConfigured("File storage is not configured")
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        region_name=settings.s3_region,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ),
        
    )


def put_object(key: str, data: bytes, content_type: str) -> None:
    _client().put_object(
        Bucket=settings.s3_bucket, Key=key, Body=data, ContentType=content_type
    )


def delete_object(key: str) -> None:
    _client().delete_object(Bucket=settings.s3_bucket, Key=key)


def safe_filename(title: str, ext: str) -> str:
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", title).strip("._-")[:80] or "download"
    return f"{stem}.{ext}"


def presigned_download_url(key: str, filename: str, content_type: str, expires: int = 300) -> str:
    return _client().generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.s3_bucket,
            "Key": key,
            "ResponseContentDisposition": f'attachment; filename="{filename}"',
            "ResponseContentType": content_type,
        },
        ExpiresIn=expires,
    )
