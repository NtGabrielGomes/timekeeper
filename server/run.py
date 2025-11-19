#!/usr/bin/env python3
"""
Script de inicialização para o servidor TimeKeeper
"""

if __name__ == "__main__":
    from uvicorn import run
    
    run("app.main:app", host="localhost", port=8000, reload=True)