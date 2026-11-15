from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all models.
    """

    pass


from app.models.lists import Node, NodeList  # noqa: E402
from app.models.users import User  # noqa: E402

__all__ = ["Base", "Node", "NodeList", "User"]
