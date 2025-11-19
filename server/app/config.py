from typing import ClassVar
from pydantic import computed_field, Field
from pydantic_settings import BaseSettings, SettingsConfigDict



class Settings(BaseSettings):
    jwt_secret: str = Field(default="S3yo12n454213dd123", alias='JWT_SECRET')
    jwt_algorithm: str = Field(default="HS256", alias='JWT_ALGORITHM') 
    jwt_expire_minutes: int = Field(default=60, alias='JWT_EXPIRE_MINUTES')
    
    # db_host: str
    # db_port: int
    # db_user: str
    # db_pass: str
    db_base: str = Field(default="database", alias='DB_BASE')
    
    # Variável de classe que não é um campo do modelo
    implant_dirname: ClassVar[str] = 'implants'

    @computed_field
    @property
    def db_url(self) -> str:
        return f"sqlite:///./{self.db_base}.db"
        # return f"postgresql://{self.db_user}:{self.db_pass}@{self.db_host}:{self.db_port}/{self.db_base}"
        
    model_config = SettingsConfigDict(
        env_file=[".env", "server/.env", "../.env"],  # Tenta vários locais
        env_file_encoding="utf-8",
        # Permite carregar do ambiente mesmo se o .env não for encontrado
        case_sensitive=False,
    )


def get_settings():
    return Settings()


settings = get_settings()