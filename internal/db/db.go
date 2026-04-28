package db

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func Connect() error {
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		return fmt.Errorf("db connect: %w", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("db ping: %w", err)
	}
	Pool = pool
	return nil
}

func Migrate() error {
	sql, err := os.ReadFile("migrations/001_init.sql")
	if err != nil {
		return fmt.Errorf("read migration: %w", err)
	}
	_, err = Pool.Exec(context.Background(), string(sql))
	return err
}
