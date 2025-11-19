# Importar todos os modelos aqui para garantir que sejam registrados no SQLAlchemy
from .implant import Implant
from .operator import Operator

__all__ = ["Implant", "Operator"]