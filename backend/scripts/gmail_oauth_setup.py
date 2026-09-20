"""One-time Gmail API OAuth setup.

Run this once to authorize AgriDirect to send email through your Gmail
account. It opens a browser consent screen, then writes the resulting
refresh token into the backend ``.env`` file.

Usage
-----
    cd backend
    python -m scripts.gmail_oauth_setup

The client id/secret are read from the environment (GMAIL_CLIENT_ID /
GMAIL_CLIENT_SECRET), from a ``client_secret.json`` in the current
directory (for "Web" OAuth clients), or from ``--client-id`` /
``--client-secret`` arguments.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
DOT_ENV = Path(__file__).resolve().parents[1] / ".env"


def _credentials_from_file() -> dict | None:
    for name in ("client_secret.json", "credentials.json"):
        path = Path(name)
        if not path.exists():
            continue
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        for kind in ("installed", "web"):
            if kind in data:
                return data[kind]
    return None


def _write_refresh_token(refresh_token: str, sender_email: str) -> None:
    if not DOT_ENV.exists():
        DOT_ENV.touch()
    lines = DOT_ENV.read_text(encoding="utf-8").splitlines()
    updates = {
        "GMAIL_REFRESH_TOKEN": refresh_token,
        "GMAIL_SENDER_EMAIL": sender_email,
    }
    for key, value in updates.items():
        prefix = f"{key}="
        for index, line in enumerate(lines):
            if line.startswith(prefix):
                lines[index] = f"{prefix}{value}"
                break
        else:
            lines.append(f"{prefix}{value}")
    DOT_ENV.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--client-id")
    parser.add_argument("--client-secret")
    parser.add_argument(
        "--scope",
        default=GMAIL_SEND_SCOPE,
        help=(
            "OAuth scope. Defaults to gmail.send (send-only). Use "
            "https://www.googleapis.com/auth/gmail.readonly to also inspect "
            "sent messages during development."
        ),
    )
    args = parser.parse_args()

    from google_auth_oauthlib.flow import InstalledAppFlow

    client_id = args.client_id or os.environ.get("GMAIL_CLIENT_ID", "") or os.environ.get("GOOGLE_GMAIL_CLIENT_ID", "")
    client_secret = args.client_secret or os.environ.get("GMAIL_CLIENT_SECRET", "") or os.environ.get("GOOGLE_GMAIL_CLIENT_SECRET", "")

    config = None
    if client_id and client_secret:
        config = {
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uris": ["http://localhost", "http://localhost:8080", "http://localhost:5173"],
        }
    else:
        file_config = _credentials_from_file()
        if file_config is None:
            print(
                "No credentials found. Provide GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET "
                "in the environment or place a client_secret.json / credentials.json "
                "in the current directory.",
                file=sys.stderr,
            )
            return 2
        config = file_config

    flow = InstalledAppFlow.from_client_config(
        {"installed": config},
        scopes=[args.scope],
        redirect_uri="http://localhost:8080",
    )
    creds = flow.run_local_server(
        port=8080,
        prompt="consent",
        access_type="offline",
        include_granted_scopes="true",
    )
    if not creds.refresh_token:
        print(
            "No refresh token was returned. The account may have already "
            "authorized this client; revoke access at "
            "https://myaccount.google.com/permissions or use a different Google "
            "account, then retry.",
            file=sys.stderr,
        )
        return 1

    sender_email = os.environ.get("GMAIL_SENDER_EMAIL", "").strip()
    if not sender_email:
        sender_email = _resolve_sender_email(creds.token)
    print("\nAuthorization successful.")
    print("Refresh token (safe to commit nowhere, stored only in .env):")
    print(f"  GMAIL_REFRESH_TOKEN={creds.refresh_token}")
    print(f"  GMAIL_SENDER_EMAIL={sender_email}")

    _write_refresh_token(creds.refresh_token, sender_email)
    print(f"\nWritten to {DOT_ENV}")
    print("Restart the API (uvicorn --reload picks up .env automatically).")
    return 0


def _resolve_sender_email(access_token: str) -> str:
    """Ask the Gmail API for the authenticated account's address."""
    import requests

    try:
        response = requests.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/profile",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=20,
        )
        response.raise_for_status()
        email = response.json().get("emailAddress", "")
    except Exception as exc:  # noqa: BLE001 - best-effort on a setup path
        print(f"Could not auto-detect the sender address: {exc}", file=sys.stderr)
        email = ""
    if not email:
        email = input("Enter the authorized sender Gmail address: ").strip()
    return email


if __name__ == "__main__":
    raise SystemExit(main())