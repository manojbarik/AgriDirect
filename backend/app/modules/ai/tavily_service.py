"""TavilyService — External web search for agricultural information.

Used ONLY for external information (government schemes, research, pest info).
Internal AgriDirect data (orders, users, products) NEVER goes through Tavily.
"""

from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_TAVILY_API_URL = "https://api.tavily.com/search"


def is_configured() -> bool:
    """Return True if the Tavily API key is present."""
    return bool(get_settings().tavily_api_key)


def search(query: str, max_results: int = 5) -> list[dict]:
    """Search the web via Tavily for agricultural information.

    Parameters
    ----------
    query : str
        The search query (agricultural topic).
    max_results : int
        Maximum number of results to return.

    Returns
    -------
    list[dict]
        Each dict has 'title', 'url', 'snippet' keys.
    """
    settings = get_settings()
    if not settings.tavily_api_key:
        logger.warning("Tavily API key not configured — returning empty results")
        return [{"title": "Search unavailable", "url": "", "snippet": "External search is not configured. Please set TAVILY_API_KEY in backend/.env."}]

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                _TAVILY_API_URL,
                json={
                    "api_key": settings.tavily_api_key,
                    "query": f"agriculture India {query}",
                    "search_depth": "basic",
                    "max_results": max_results,
                    "include_answer": True,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        results = []
        # Include the AI-generated answer if present
        if data.get("answer"):
            results.append({
                "title": "Summary",
                "url": "",
                "snippet": data["answer"],
            })

        for item in data.get("results", [])[:max_results]:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("content", "")[:300],
            })

        return results

    except httpx.HTTPStatusError as e:
        logger.error("Tavily API HTTP error: %s", e.response.status_code)
        return [{"title": "Search error", "url": "", "snippet": f"External search returned an error (HTTP {e.response.status_code})."}]
    except Exception as e:
        logger.exception("Tavily search failed")
        return [{"title": "Search error", "url": "", "snippet": f"External search is temporarily unavailable: {e}"}]
