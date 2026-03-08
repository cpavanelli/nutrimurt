import time
from datetime import timedelta
import httpx
import jwt
from fastapi import HTTPException, Request

CLERK_ISSUER = "https://next-herring-26.clerk.accounts.dev"
JWKS_URL = f"{CLERK_ISSUER}/.well-known/jwks.json"

_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0
_JWKS_TTL_SECONDS = 3600


def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at

    now = time.monotonic()
    if _jwks_cache is not None and (now - _jwks_fetched_at) < _JWKS_TTL_SECONDS:
        return _jwks_cache

    resp = httpx.get(JWKS_URL, timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    _jwks_fetched_at = now
    return _jwks_cache


def _get_signing_key(token: str) -> jwt.algorithms.RSAAlgorithm:
    jwks = _get_jwks()
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Token missing kid header")

    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return jwt.algorithms.RSAAlgorithm.from_jwk(key_data)

    raise HTTPException(status_code=401, detail="Signing key not found")


def require_auth(request: Request) -> dict:
    """FastAPI dependency that validates a Clerk JWT from the Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header[len("Bearer "):]

    try:
        public_key = _get_signing_key(token)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            options={"verify_aud": False},
            leeway=timedelta(minutes=5),
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


def get_user_id(auth_payload: dict) -> str:
    """Extract the Clerk user ID (sub claim) from a validated JWT payload."""
    user_id = auth_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user ID in token")
    return user_id
