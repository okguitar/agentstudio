"""Configuration management using pydantic-settings"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Cloudflare Configuration
    cloudflare_api_token: str
    cloudflare_account_id: str
    cloudflare_zone_id: str
    parent_domain: str = "agentstudio.cc"

    # API Security
    api_keys: str  # Comma-separated API keys

    # Database
    database_url: str = "sqlite:///./proxy.db"

    # Service Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    @property
    def api_keys_list(self) -> List[str]:
        """Parse comma-separated API keys"""
        return [key.strip() for key in self.api_keys.split(",") if key.strip()]


# Global settings instance
settings = Settings()
