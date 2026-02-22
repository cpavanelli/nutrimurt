from app.models.apiModels import PatientLink, Patient, Questionary, Question, QuestionAlternative
from app.data.database import Database
from app.models.models import PatientQuestionAnswer, PatientQuestionAnswerAlternative

class Answers:

    def savePatientAnswers(self, patient_link: PatientLink, db: Database):
        
        db.delete_patient_answers(patient_link.id)
        
        answersToSave: list[PatientQuestionAnswer] = []
        answersAlternativesToSave: list[PatientQuestionAnswerAlternative] = []

        for q in patient_link.questionnary.questions:
            if q.questionType != 3:
                answersToSave.append(
                PatientQuestionAnswer(
                    patient_link_id = patient_link.id,
                    question_id = q.id,
                    answer = q.answer.answer)
                )
            else:
                for a in q.answerAlternatives:
                    answersAlternativesToSave.append(
                    PatientQuestionAnswerAlternative(
                        patient_link_id = patient_link.id,
                        question_id = q.id,
                        alternative = a)
                    )
        
        db.savePatientAnswers(answersToSave, answersAlternativesToSave)
        
    def getPatientLink(self, urlID: str, db: Database):
        dbPatientLink = db.get_PatientLinkForAnswer(urlID)
        questions: list[Question] = []
        
        
        patientLink = PatientLink(urlID=dbPatientLink.urlID, patient_id=dbPatientLink.patient_id, questionnary_id=dbPatientLink.questionnary_id, type=dbPatientLink.type)
        patientLink.patient = Patient(id=dbPatientLink.patient.id, name=dbPatientLink.patient.name, email=dbPatientLink.patient.email)
        patientLink.questionnary = Questionary(id=dbPatientLink.questionnary.id, name=dbPatientLink.questionnary.name)
        
        for q in dbPatientLink.questionnary.questions:
            questions.append(Question())
        
        
        
        
    
        
        




       
      
    