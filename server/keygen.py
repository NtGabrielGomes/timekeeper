import random
import hashlib

def validar_chave(chave):
    if len(chave) != 32 or not all(c in '0123456789ABCDEF' for c in chave):
        return False
    
    # Verificação básica com hash (rápida e segura)
    parte_principal = chave[:28]
    hash_verificacao = chave[28:]
    
    return hashlib.sha256(parte_principal.encode()).hexdigest()[:4].upper() == hash_verificacao

def gerar_chave() -> str:
    """Gera chaves válidas instantaneamente com hash de verificação"""
    parte_principal = f"{random.getrandbits(112):028X}"  # 28 caracteres aleatórios
    hash_verificacao = hashlib.sha256(parte_principal.encode()).hexdigest()[:4].upper()
    
    return parte_principal + hash_verificacao

# Teste
chave = gerar_chave()
print(f"Chave: {chave}")
