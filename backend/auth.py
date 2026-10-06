"""Password hashing for account signup/login.

Format: ``pbkdf2_sha256$<salt>$<hash>`` — PBKDF2-HMAC-SHA256 over the raw
password, salted and iterated, matching the seed rows already in
``users.password_hash`` (120,000 iterations, a 16-byte hex salt). Every
account created through ``/api/auth/signup`` uses this same scheme, so the
database never holds anything closer to a plaintext password than this
salted, iterated digest — reversing it to recover a password is
computationally infeasible, for a human or an AI.

This is a course project, not a production auth system: there is no session
token, rate limiting, or password reset flow. The frontend holds the logged
-in user's id/name/email after login and sends ``user_id`` back on chat
requests so replies can be saved to that account's history.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

# Matches the iteration count already baked into the seed users (verified by
# reproducing the stored hash for test@campuscustoms.yale.edu / "password").
ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS
    ).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    parts = stored.split("$")
    if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
        return False
    _, salt, expected = parts
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS
    ).hex()
    return hmac.compare_digest(digest, expected)
