"""
URL fetch route — server-side proxy to avoid browser CORS restrictions.
Fetches a URL, strips HTML, and returns plain text.
"""

import re
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class FetchUrlRequest(BaseModel):
    url: str


def _strip_html(html: str) -> str:
    """Remove tags, scripts, styles and collapse whitespace."""
    # Remove script / style blocks entirely
    html = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    # Remove all remaining tags
    html = re.sub(r'<[^>]+>', ' ', html)
    # Decode common HTML entities
    for entity, char in [('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'),
                          ('&quot;', '"'), ('&#39;', "'"), ('&nbsp;', ' ')]:
        html = html.replace(entity, char)
    # Collapse whitespace
    html = re.sub(r'\s+', ' ', html).strip()
    return html


@router.post("/fetch-url")
async def fetch_url(body: FetchUrlRequest):
    """
    Fetch a URL server-side and return extracted plain text.
    Avoids browser CORS restrictions entirely.
    """
    url = body.url.strip()
    if not url.startswith(('http://', 'https://')):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    logger.info(f"🌐 Fetching URL: {url}")

    try:
        async with httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        raw = response.text

        if "html" in content_type or raw.lstrip().startswith("<"):
            text = _strip_html(raw)
        else:
            # Plain text / JSON / markdown — use as-is
            text = raw.strip()

        if len(text) < 30:
            raise HTTPException(
                status_code=422,
                detail="Could not extract meaningful text from this URL. The page may require JavaScript or login."
            )

        # Cap at 8000 chars so the textarea doesn't overflow
        text = text[:8000]
        logger.info(f"✅ Fetched {len(text)} chars from {url}")

        return {"text": text, "char_count": len(text), "url": url}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out. The URL took too long to respond.")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Remote server returned {e.response.status_code}.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ URL fetch failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch URL: {str(e)}")
