"""GRIDTWIN Backend - Core Configuration"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "GRIDTWIN"
    app_version: str = "1.0.0"
    debug: bool = False
    backend_secret_key: str = "change-this-to-a-random-secret-key"
    backend_cors_origins: str = "http://localhost:5173,http://localhost:3000"
    backend_log_level: str = "INFO"
    
    # Database
    database_url: str = "postgresql+asyncpg://gridtwin:gridtwin_secret@localhost:5432/gridtwin"
    database_url_sync: str = "postgresql://gridtwin:gridtwin_secret@localhost:5432/gridtwin"
    
    # MQTT (Defaults to public cloud broker for zero-setup hackathon development)
    mqtt_broker_host: str = "broker.hivemq.com"
    mqtt_broker_port: int = 1883
    mqtt_username: str = ""
    mqtt_password: str = ""
    mqtt_client_id: str = "gridtwin-backend"
    
    # Command settings
    command_timeout_seconds: int = 30
    command_rate_limit_per_minute: int = 60
    
    # Physical control
    physical_control_enabled: bool = True
    
    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.backend_cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
