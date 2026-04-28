-- migrations/001_init.sql

CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    family_login VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    avatar VARCHAR(10) NOT NULL DEFAULT '🙂',
    color VARCHAR(10) NOT NULL DEFAULT '#4ECDC4',
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chores (
    id SERIAL PRIMARY KEY,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    emoji VARCHAR(10) NOT NULL DEFAULT '✨',
    points INTEGER NOT NULL DEFAULT 10,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chore_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    chore_id INTEGER REFERENCES chores(id) ON DELETE SET NULL,
    chore_name VARCHAR(200) NOT NULL,
    chore_emoji VARCHAR(10) NOT NULL,
    points INTEGER NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default chores (applied per family on creation)
CREATE OR REPLACE FUNCTION seed_chores(fid INTEGER) RETURNS void AS $$
BEGIN
    INSERT INTO chores (family_id, name, emoji, points) VALUES
        (fid, 'Помыть посуду',     '🍽️', 10),
        (fid, 'Пропылесосить',     '🧹', 20),
        (fid, 'Помыть полы',       '🪣', 25),
        (fid, 'Вынести мусор',     '🗑️',  5),
        (fid, 'Постирать бельё',   '👕', 15),
        (fid, 'Погладить бельё',   '🧺', 15),
        (fid, 'Купить продукты',   '🛒', 20),
        (fid, 'Приготовить еду',   '🍳', 25),
        (fid, 'Помыть ванную',     '🚿', 30),
        (fid, 'Убрать в комнате',  '🛏️', 15),
        (fid, 'Помыть окна',       '🪟', 35),
        (fid, 'Покормить питомца', '🐕', 10);

    INSERT INTO chores (family_id, name, emoji, points, is_penalty) VALUES
        (fid, 'Не помыл посуду',      '🍽️', 10, true),
        (fid, 'Оставил беспорядок',   '🧹', 15, true),
        (fid, 'Забыл вынести мусор',  '🗑️', 10, true),
        (fid, 'Не убрал за собой',    '😤', 20, true),
        (fid, 'Разбил/испортил',      '💥', 25, true);
END;
$$ LANGUAGE plpgsql;
