import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core import security
from app.core.config import settings
from app.core.db import create_default_chamonix_list
from app.models import NodeList, User
from app.schemas import (
    DemoSession,
    Message,
    NewPassword,
    Token,
    UserCreate,
    UserPublic,
    UserUpdate,
)
from app.utils import (
    generate_password_reset_token,
    generate_reset_password_email,
    send_email,
    verify_password_reset_token,
)

login_router = APIRouter(tags=["login"])


@login_router.post("/login/demo", response_model=DemoSession)
def start_demo_session(session: SessionDep) -> DemoSession:
    """
    Start an ephemeral demo session with a fresh copy of the default outliner list.
    """
    # 1. Clean up stale demo sessions (> 2 hours old)
    stale_threshold = datetime.now(timezone.utc) - timedelta(hours=2)
    stale_demos = list(
        session.execute(
            select(User).where(
                User.email.like("demo_%@nodepad.io"),
                User.created_at < stale_threshold,
            )
        )
        .scalars()
        .all()
    )
    for stale in stale_demos:
        session.delete(stale)
    if stale_demos:
        session.commit()

    # 2. Create isolated ephemeral demo user
    demo_email = f"demo_{uuid.uuid4().hex[:12]}@nodepad.io"
    user_in = UserCreate(
        email=demo_email,
        password=secrets.token_urlsafe(16),
        full_name="Demo User",
        is_active=True,
        is_superuser=False,
    )
    demo_user = crud.users.create_user(session=session, user_create=user_in)

    # 3. Create fresh copy of default 'Weekend Getaway: Chamonix' list
    db_list = create_default_chamonix_list(session=session, owner_id=demo_user.id)

    # 4. Generate token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        demo_user.id, expires_delta=access_token_expires
    )
    return DemoSession(
        access_token=token,
        token_type="bearer",
        list_id=db_list.id,
    )


@login_router.post("/login/demo/cleanup", response_model=Message)
def cleanup_demo_session(session: SessionDep, current_user: CurrentUser) -> Message:
    """
    Clean up demo user and all their lists/nodes upon session exit or window close.
    """
    if not current_user.email.startswith("demo_") or not current_user.email.endswith(
        "@nodepad.io"
    ):
        raise HTTPException(
            status_code=400, detail="Only demo sessions can be cleaned up"
        )

    session.delete(current_user)
    session.commit()
    return Message(message="Demo session cleaned up successfully")


@login_router.post("/login/demo/reset", response_model=DemoSession)
def reset_demo_session(session: SessionDep, current_user: CurrentUser) -> DemoSession:
    """
    Reset the demo user's outline back to the default state.
    """
    if not current_user.email.startswith("demo_") or not current_user.email.endswith(
        "@nodepad.io"
    ):
        raise HTTPException(status_code=400, detail="Only demo sessions can be reset")

    # Delete existing lists and nodes owned by this demo user
    lists = list(
        session.execute(select(NodeList).where(NodeList.owner_id == current_user.id))
        .scalars()
        .all()
    )
    for list_obj in lists:
        session.delete(list_obj)
    session.commit()

    # Recreate default Chamonix list
    db_list = create_default_chamonix_list(session=session, owner_id=current_user.id)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        current_user.id, expires_delta=access_token_expires
    )
    return DemoSession(
        access_token=token,
        token_type="bearer",
        list_id=db_list.id,
    )


@login_router.post("/login/access-token")
def login_access_token(
    session: SessionDep, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = crud.users.authenticate(
        session=session, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
    )


@login_router.post("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user


@login_router.post("/password-recovery/{email}")
def recover_password(email: str, session: SessionDep) -> Message:
    """
    Password Recovery
    """
    user = crud.users.get_user_by_email(session=session, email=email)

    # Always return the same response to prevent email enumeration attacks
    # Only send email if user actually exists
    if user:
        password_reset_token = generate_password_reset_token(email=email)
        email_data = generate_reset_password_email(
            email_to=user.email, email=email, token=password_reset_token
        )
        send_email(
            email_to=user.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return Message(
        message="If that email is registered, we sent a password recovery link"
    )


@login_router.post("/reset-password/")
def reset_password(session: SessionDep, body: NewPassword) -> Message:
    """
    Reset password
    """
    email = verify_password_reset_token(token=body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = crud.users.get_user_by_email(session=session, email=email)
    if not user:
        # Don't reveal that the user doesn't exist - use same error as invalid token
        raise HTTPException(status_code=400, detail="Invalid token")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    user_in_update = UserUpdate(password=body.new_password)
    crud.users.update_user(
        session=session,
        db_user=user,
        user_in=user_in_update,
    )
    return Message(message="Password updated successfully")


@login_router.post(
    "/password-recovery-html-content/{email}",
    dependencies=[Depends(get_current_active_superuser)],
    response_class=HTMLResponse,
)
def recover_password_html_content(email: str, session: SessionDep) -> Any:
    """
    HTML Content for Password Recovery
    """
    user = crud.users.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )

    return HTMLResponse(
        content=email_data.html_content, headers={"subject:": email_data.subject}
    )
