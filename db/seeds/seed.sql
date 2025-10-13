-- Deck
insert into decks (id, name, domain, description)
values ('deck_aba_a', 'ABA A: Measurement', 'A', 'Measurement fundamentals')
on conflict (id) do update set name = excluded.name;

-- Flashcards
insert into flashcards (id, deck_id, term, definition, order_index) values
('fc_a_001', 'deck_aba_a', 'IOA', 'Degree to which two observers agree...', 1),
('fc_a_002', 'deck_aba_a', 'Validity', 'Extent to which data measure...', 2)
on conflict (id) do update set term = excluded.term, definition = excluded.definition, order_index = excluded.order_index;

-- Quiz
insert into quizzes (id, deck_id, title, domain, is_active)
values ('quiz_a_01', 'deck_aba_a', 'Measurement—Set 1', 'A', true)
on conflict (id) do update set title = excluded.title, is_active = excluded.is_active;

-- Questions
insert into questions (id, quiz_id, prompt, rationale, order_index) values
('q_a_01', 'quiz_a_01', 'Which statement best defines IOA?', 'Ensures measurement reliability...', 1)
on conflict (id) do update set prompt = excluded.prompt, rationale = excluded.rationale, order_index = excluded.order_index;

-- Choices
insert into choices (id, question_id, label, text, is_correct) values
('c_a_01_a', 'q_a_01', 'A', 'Agreement between two independent observers', true),
('c_a_01_b', 'q_a_01', 'B', 'Accuracy of measurement to the true value', false),
('c_a_01_c', 'q_a_01', 'C', 'Consistency of a single observer over time', false),
('c_a_01_d', 'q_a_01', 'D', 'Sensitivity of a measure to change', false)
on conflict (id) do update set text = excluded.text, is_correct = excluded.is_correct;
