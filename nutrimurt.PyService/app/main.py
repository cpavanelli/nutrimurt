from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from app.email.emailsender import EmailSender
from app.data.database import Database, get_db
from sqlalchemy.orm import Session
from app.settings import settings
from app.models.apiModels import PatientLink, PublicPatient, PublicPatientLink
from app.services.answers import Answers
from app.auth import require_auth

app = FastAPI(title="NutriMurt Python Service", version="1.0.0")
router = APIRouter(prefix="/py")
answersController = Answers()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # adjust for your frontends
    allow_methods=["*"],
    allow_headers=["*"],
)

@router.get("/")
def root():
    return {
        "service": "NutriMurt Python Service",
        "status": "running",
        "version": "1.0.0"
    }

@router.get("/health")
def health():
    return {"status": "ok"}

@router.post("/patient-questionary/{patient_id}/{questionary_id}")
def create_patient_questionary(patient_id: int, questionary_id: int, _auth=Depends(require_auth)):
    #Generate URLID
    # Logic to save the questionary would go here
    #Send email to patient with link to questionary
    return {"message": "Patient questionary created", "data": {"patient_id": patient_id, "questionary_id": questionary_id}}


@router.get("/testEmailB")
def testEmail(_auth=Depends(require_auth)):
    emailSender = EmailSender()
    emailSender.send_email("giovanamurtinheira@gmail.com", "Test Email from NutriMurt", "This is a test email sent from the NutriMurt Python Service.")
    emailSender.send_email("caiopavanelli@gmail.com", "Test Email from NutriMurt", "This is a test email sent from the NutriMurt Python Service.")
    return {"status": "ok"}


@router.post("/testEmail/{to_email}/{name}")
def testEmailPost(to_email: str, name: str, _auth=Depends(require_auth)):
    emailSender = EmailSender()
    emailSender.send_email(to_email, "Test Email from NutriMurt", "Oi " + name + "!!!\n\nThis is a test email sent from the NutriMurt Python Service.")
    return {"status": "ok"}

@router.get("/testGetUser/")
def testGetUser(_auth=Depends(require_auth)):
    connection = Database()
    patient = connection.get_Patient(4)

    return {"status": "ok", "patient": {"id": patient.id, "name": patient.name, "email": patient.email}}


@router.get("/testGetQuestionary/{urlID}")
def testGetQuestionary(urlID: str, _auth=Depends(require_auth), dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    patient_link = repo.get_PatientLink(urlID)
    total_questions = patient_link.questionnary.questions.__len__()

    return {"status": "ok", "questionary": {"id": patient_link.id,
                                            "questionary": patient_link.questionnary.name, 
                                            "patient name": patient_link.patient.name,
                                            "total questions": total_questions}}

@router.post("/sendEmail/{urlID}")
def sendEmail(urlID: str, request: Request, _auth=Depends(require_auth), dbSession: Session = Depends(get_db)):
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

@router.get("/getPatientQuestionary/{urlID}")
def getPatientQuestionary(urlID: str, request: Request, _auth=Depends(require_auth), dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    questionary = repo.get_Questionary(urlID)
    if not questionary:
        raise HTTPException(status_code=404, detail="Link not found")

    return questionary

@router.get("/getQuestionaryPatientLink/{urlID}")
def getQuestionaryPatientLink(urlID: str, request: Request, _auth=Depends(require_auth), dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    patient_link = answersController.getQuestionaryPatientLink(urlID, repo)
    if not patient_link:
        raise HTTPException(status_code=404, detail="Link not found")
    return patient_link


@router.get("/getDiaryPatientLink/{urlID}")
def getDiaryPatientLink(urlID: str, request: Request, _auth=Depends(require_auth), dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    patient_link = answersController.getDiaryPatientLink(urlID, repo)
    if not patient_link:
        raise HTTPException(status_code=404, detail="Link not found")
    return patient_link

@router.get("/getPatientLink/{urlID}")
def getPatientLink(urlID: str, request: Request, _auth=Depends(require_auth), dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    base_link = repo.get_PatientLink(urlID)
    if not base_link:
        raise HTTPException(status_code=404, detail="Link not found")

    if base_link.type == 1:
        patient_link = answersController.getQuestionaryPatientLink(urlID, repo)
    elif base_link.type == 2:
        patient_link = answersController.getDiaryPatientLink(urlID, repo)
    else:
        raise HTTPException(status_code=422, detail="Unsupported link type")

    if not patient_link:
        raise HTTPException(status_code=404, detail="Link payload not found")

    return patient_link

@router.get("/answer/public/{urlID}")
def getPublicPatientLink(urlID: str, dbSession: Session = Depends(get_db)):
    """Public endpoint for patients — returns minimal data with no sensitive PII."""
    repo = Database(dbSession)
    base_link = repo.get_PatientLink(urlID)
    if not base_link:
        raise HTTPException(status_code=404, detail="Link not found")

    if base_link.type == 1:
        patient_link = answersController.getQuestionaryPatientLink(urlID, repo)
    elif base_link.type == 2:
        patient_link = answersController.getDiaryPatientLink(urlID, repo)
    else:
        raise HTTPException(status_code=422, detail="Unsupported link type")

    if not patient_link:
        raise HTTPException(status_code=404, detail="Link payload not found")

    return PublicPatientLink(
        id=patient_link.id,
        urlId=patient_link.urlId,
        patient_id=patient_link.patient_id,
        questionnary_id=patient_link.questionnary_id,
        diary_id=patient_link.diary_id,
        type=patient_link.type,
        last_answered=patient_link.last_answered,
        patient=PublicPatient(name=patient_link.patient.name),
        questionnary=patient_link.questionnary,
        diary=patient_link.diary,
    )


@router.get("/answer/staff/{urlID}")
def getStaffPatientLink(urlID: str, _auth=Depends(require_auth), dbSession: Session = Depends(get_db)):
    """Staff-only endpoint — returns full patient data."""
    repo = Database(dbSession)
    base_link = repo.get_PatientLink(urlID)
    if not base_link:
        raise HTTPException(status_code=404, detail="Link not found")

    if base_link.type == 1:
        patient_link = answersController.getQuestionaryPatientLink(urlID, repo)
    elif base_link.type == 2:
        patient_link = answersController.getDiaryPatientLink(urlID, repo)
    else:
        raise HTTPException(status_code=422, detail="Unsupported link type")

    if not patient_link:
        raise HTTPException(status_code=404, detail="Link payload not found")

    return patient_link


@router.post("/savePatientAnswers")
def savePatientAnswers(patientLink: PatientLink, request: Request, dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    answersController.savePatientAnswers(patientLink, repo)
    return {"status": "ok"}

@router.post("/savePatientDiary")
def savePatientDiary(patientLink: PatientLink, request: Request, dbSession: Session = Depends(get_db)):
    repo = Database(dbSession)
    answersController.savePatientDiary(patientLink, repo)
    return {"status": "ok"}


app.include_router(router)

