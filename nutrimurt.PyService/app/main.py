from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from app.email.emailsender import EmailSender
from app.data.database import Database, get_db
from sqlalchemy.orm import Session
from app.settings import settings
from app.models.apiModels import PatientLink
from app.services.answers import Answers

app = FastAPI(title="NutriMurt Python Service", version="1.0.0")
answersController = Answers()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # adjust for your frontends
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/testEmailB")
def testEmail():
    emailSender = EmailSender()
    emailSender.send_email("giovanamurtinheira@gmail.com", "Test Email from NutriMurt", "This is a test email sent from the NutriMurt Python Service.")
    emailSender.send_email("caiopavanelli@gmail.com", "Test Email from NutriMurt", "This is a test email sent from the NutriMurt Python Service.")
    return {"status": "ok"}


@app.post("/testEmail/{to_email}/{name}")
def testEmail(to_email: str, name: str):
    emailSender = EmailSender()
    emailSender.send_email(to_email, "Test Email from NutriMurt", "Oi " + name + "!!!\n\nThis is a test email sent from the NutriMurt Python Service.")
    return {"status": "ok"}

@app.get("/testGetUser/")
def testGetUser():
    connection = Database()
    patient = connection.get_Patient(4)

    return {"status": "ok", "patient": {"id": patient.id, "name": patient.name, "email": patient.email}}


@app.get("/testGetQuestionary/{urlID}")
def testGetQuestionary(urlID: str, dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    patient_link = repo.get_PatientLink(urlID)
    total_questions = patient_link.questionnary.questions.__len__()

    return {"status": "ok", "questionary": {"id": patient_link.id,
                                            "questionary": patient_link.questionnary.name, 
                                            "patient name": patient_link.patient.name,
                                            "total questions": total_questions}}

@app.post("/sendEmail/{urlID}")
def sendEmail(urlID: str, request: Request, dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    emailSender = EmailSender()
    patient_link = repo.get_PatientLink(urlID)
    if not patient_link:
        raise HTTPException(status_code=404, detail="Link not found")

    subject = patient_link.type == 1 and "Questionário NutriMurt" or "Diário NutriMurt"
    text = patient_link.type == 1 and "questionário" or "diário"
    

    link = f"{settings.WEBSITE_URL}/answer/{urlID}"
    text_body = f"Ola {patient_link.patient.name}! Acesse o link para preencher seu {text}: {link}"
    html_body = (
        f"<p>Ola {patient_link.patient.name}! "
        f"Acesse o link para preencher seu {text}: "
        f'<a href="{link}">Clique aqui</a></p>'
    )

    emailSender.send_email(patient_link.patient.email, subject, text_body, html_body)

    return {"status": "ok"}

@app.get("/getPatientQuestionary/{urlID}")
def getPatientQuestionary(urlID: str, request: Request, dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    questionary = repo.get_Questionary(urlID)
    if not questionary:
        raise HTTPException(status_code=404, detail="Link not found")

    return questionary

@app.get("/getPatientLink/{urlID}")
def getPatientLink(urlID: str, request: Request, dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    patient_link = answersController.getPatientLink(urlID, repo)
    if not patient_link:
        raise HTTPException(status_code=404, detail="Link not found")
    return patient_link

@app.post("/savePatientAnswers")
def savePatientAnswers(patientLink: PatientLink, request: Request, dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    answersController.savePatientAnswers(patientLink, repo)
    return {"status": "ok"}
