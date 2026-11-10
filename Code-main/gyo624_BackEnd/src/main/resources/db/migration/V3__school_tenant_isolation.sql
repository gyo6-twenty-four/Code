ALTER TABLE users ADD COLUMN school_code VARCHAR(20) NOT NULL DEFAULT 'DEFAULT';
ALTER TABLE students ADD COLUMN school_code VARCHAR(20) NOT NULL DEFAULT 'DEFAULT';

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_pseudonym_id_key;
ALTER TABLE students ADD CONSTRAINT uq_students_school_pseudonym UNIQUE (school_code, pseudonym_id);

CREATE INDEX idx_users_school ON users(school_code);
CREATE INDEX idx_students_school ON students(school_code);
