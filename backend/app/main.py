import logging
import uuid
from contextvars import ContextVar

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"

client_ip_var: ContextVar[str] = ContextVar("client_ip", default="-")
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
user_agent_var: ContextVar[str] = ContextVar("user_agent", default="-")

# Custom filter for adding request data to logs
class RequestContextFilter(logging.Filter):
    def filter(self, record):
        record.client_ip = client_ip_var.get()
        record.request_id = request_id_var.get()
        record.user_agent = user_agent_var.get()
        return True

LOG_FORMAT = "[%(asctime)s] %(levelname)s [%(client_ip)s] [%(request_id)s] [%(user_agent)s] %(name)s: %(message)s"

logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger(__name__)

for handler in logging.root.handlers:
    handler.addFilter(RequestContextFilter())


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

@app.middleware("http")
async def append_request_context_to_logs(request: Request, call_next):
    # Get IP
    # Use first IP if X-Forwarded-For present
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "-"

    ua = request.headers.get("user-agent", "-")
    req_id = request.headers.get("x-request-id", str(uuid.uuid4())[:8])

    token_ip = client_ip_var.set(ip)
    token_id = request_id_var.set(req_id)
    token_ua = user_agent_var.set(ua)

    try:
        response = await call_next(request)
        logger.info(f"{request.url} {request.method} {response.status_code}")
        return response
    finally:
        # Reset context
        client_ip_var.reset(token_ip)
        request_id_var.reset(token_id)
        user_agent_var.reset(token_ua)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
