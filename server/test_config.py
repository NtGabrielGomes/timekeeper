#!/usr/bin/env python3
"""Script simples para testar o carregamento de configurações."""

import sys
import os

# Adiciona o diretório atual ao path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from app.config import settings
    print("✅ Configurações carregadas com sucesso!")
    print(f"JWT_SECRET: {settings.jwt_secret}")
    print(f"JWT_ALGORITHM: {settings.jwt_algorithm}")
    print(f"JWT_EXPIRE_MINUTES: {settings.jwt_expire_minutes}")
    print(f"DB_BASE: {settings.db_base}")
    print(f"DB_URL: {settings.db_url}")
except Exception as e:
    print(f"❌ Erro ao carregar configurações: {e}")
    import traceback
    traceback.print_exc()
