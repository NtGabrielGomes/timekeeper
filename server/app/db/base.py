from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Importar todos os modelos para registrá-los no SQLAlchemy
from ..models import *  # noqa: F401, F403