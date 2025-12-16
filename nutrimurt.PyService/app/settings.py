from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MAILGUN_API_KEY: str = Field(..., env='MAILGUN_API_KEY')
    MAILGUN_DOMAIN: str = Field(..., env='MAILGUN_DOMAIN')
    MAILGUN_FROM: str = Field(..., env='MAILGUN_FROM')
    CONNECTION_STRING: str = Field(..., env='CONNECTION_STRING')
    WEBSITE_URL: str = Field(..., env='WEBSITE_URL')

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()