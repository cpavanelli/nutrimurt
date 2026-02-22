from dotenv import load_dotenv
import os
import requests
from app.settings import settings

class EmailSender:
    def __init__(self):
        load_dotenv()

        self.api_key = settings.MAILGUN_API_KEY
        self.domain = settings.MAILGUN_DOMAIN
        self.from_email = settings.MAILGUN_FROM

        if not self.api_key or not self.domain or not self.from_email:
            raise ValueError("Mailgun configuration missing in .env")

    def send_email(self, to_email: str, subject: str, text: str, html: str | None = None):
        url = f"https://api.mailgun.net/v3/{self.domain}/messages"
        data = {
            "from": self.from_email,
            "to": to_email,
            "subject": subject,
            "text": text,      # plain-text fallback
        }
        if html:
            data["html"] = html  # clickable content for HTML clients

        response = requests.post(url, auth=("api", self.api_key), data=data)
        return response.status_code, response.text