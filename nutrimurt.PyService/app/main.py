from fastapi import FastAPI
from .emailsender import EmailSender

app = FastAPI(title="NutriMurt Python Service", version="1.0.0")

@app.get("/")
def root():
    return {
        "service": "NutriMurt Python Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/patient-questionary/{patient_id}/{questionary_id}")
def create_patient_questionary(patient_id: int, questionary_id: int):
    #Generate URLID
    # Logic to save the questionary would go here
    #Send email to patient with link to questionary
    return {"message": "Patient questionary created", "data": {"patient_id": patient_id, "questionary_id": questionary_id}}


@app.get("/testEmail")
def health():
    emailSender = EmailSender()
    emailSender.send_email("giovanamurtinheira@gmail.com", "Test Email from NutriMurt", "This is a test email sent from the NutriMurt Python Service.")
    return {"status": "ok"}

