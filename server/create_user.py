#!/usr/bin/env python3
"""Script CLI alternativo para criar usuários."""

import sys
import os
from pathlib import Path

# Adiciona o diretório atual ao path para importações
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def create_user():
    try:
        # Importa após configurar o path
        from app.config import settings
        from app.db.session import engine
        from app.models.operator import Operator
        from app.security.security import hash_password
        from sqlalchemy.orm import Session
        
        print("✅ Imports realizados com sucesso!")
        print(f"Database URL: {settings.db_url}")
        
        # Solicita dados do usuário
        username = input("Username: ")
        password = input("Password: ")
        
        # Cria usuário
        with Session(bind=engine) as db:
            hashed_password = hash_password(password)
            user = Operator(username=username, password=hashed_password)
            db.add(user)
            db.commit()
            print(f"✅ User '{username}' created successfully!")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "create":
        create_user()
    else:
        print("Usage: python create_user.py create")
