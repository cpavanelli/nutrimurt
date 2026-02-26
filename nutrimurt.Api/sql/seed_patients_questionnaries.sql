-- Seed script: 3 patients + 3 questionnaries with questions (PostgreSQL)
-- Run this after applying migrations.

BEGIN;

-- Clear dependent rows first so this script can be re-run safely.
DELETE FROM patient_question_answer_alternatives;
DELETE FROM patient_question_answers;
DELETE FROM patient_links;
DELETE FROM question_alternatives;
DELETE FROM questions;
DELETE FROM patients;
DELETE FROM questionnaries;

-- Reset identity counters so inserted ids remain stable (1..N).
ALTER SEQUENCE IF EXISTS patients_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS questionnaries_id_seq RESTART WITH 1;

INSERT INTO patients (name, email, phone, cpf, created_at, birth, weight, height) VALUES
('Ana Souza', 'ana.souza@example.com', '(11)99999-1111', '529.982.247-25', NOW(), DATE '1993-04-12', 62, 165),
('Bruno Lima', 'bruno.lima@example.com', '(21)98888-2222', '168.995.350-09', NOW(), DATE '1988-09-03', 84, 178),
('Carla Mendes', 'carla.mendes@example.com', '(31)97777-3333', '111.444.777-35', NOW(), DATE '1997-01-27', 70, 170);

INSERT INTO questionnaries (name) VALUES
('Anamnese Inicial'),
('Hábitos Alimentares'),
('Acompanhamento Semanal');

-- QuestionTypes enum mapping:
-- 1 = ShortAnswer
-- 2 = TrueFalse
-- 3 = MultipleChoice
INSERT INTO questions (question_text, question_type, questionnary_id) VALUES
('Qual é seu principal objetivo com o acompanhamento?', 1, (SELECT id FROM questionnaries WHERE name = 'Anamnese Inicial')),
('Você possui alguma restrição alimentar?', 2, (SELECT id FROM questionnaries WHERE name = 'Anamnese Inicial')),
('Como você classificaria sua rotina atual?', 3, (SELECT id FROM questionnaries WHERE name = 'Anamnese Inicial')),

('Quantas refeições você faz por dia?', 1, (SELECT id FROM questionnaries WHERE name = 'Hábitos Alimentares')),
('Você costuma tomar café da manhã?', 2, (SELECT id FROM questionnaries WHERE name = 'Hábitos Alimentares')),
('Com que frequência você consome ultraprocessados?', 3, (SELECT id FROM questionnaries WHERE name = 'Hábitos Alimentares')),

('Como foi sua energia hoje?', 1, (SELECT id FROM questionnaries WHERE name = 'Acompanhamento Semanal')),
('Você conseguiu seguir o plano alimentar hoje?', 2, (SELECT id FROM questionnaries WHERE name = 'Acompanhamento Semanal')),
('Como avalia sua hidratação nesta semana?', 3, (SELECT id FROM questionnaries WHERE name = 'Acompanhamento Semanal'));

-- Alternatives for multiple-choice questions
INSERT INTO question_alternatives (alternative, question_id) VALUES
('Sedentária', (SELECT id FROM questions WHERE question_text = 'Como você classificaria sua rotina atual?')),
('Moderada', (SELECT id FROM questions WHERE question_text = 'Como você classificaria sua rotina atual?')),
('Ativa', (SELECT id FROM questions WHERE question_text = 'Como você classificaria sua rotina atual?')),

('Raramente', (SELECT id FROM questions WHERE question_text = 'Com que frequência você consome ultraprocessados?')),
('Algumas vezes por semana', (SELECT id FROM questions WHERE question_text = 'Com que frequência você consome ultraprocessados?')),
('Diariamente', (SELECT id FROM questions WHERE question_text = 'Com que frequência você consome ultraprocessados?')),

('Baixa', (SELECT id FROM questions WHERE question_text = 'Como avalia sua hidratação nesta semana?')),
('Adequada', (SELECT id FROM questions WHERE question_text = 'Como avalia sua hidratação nesta semana?')),
('Excelente', (SELECT id FROM questions WHERE question_text = 'Como avalia sua hidratação nesta semana?'));

COMMIT;
