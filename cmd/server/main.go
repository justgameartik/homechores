package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"homechores/internal/auth"
	"homechores/internal/db"
	"homechores/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	if err := db.Connect(); err != nil {
		log.Fatalf("DB connect: %v", err)
	}
	if err := db.Migrate(); err != nil {
		log.Fatalf("DB migrate: %v", err)
	}
	log.Println("DB connected and migrated")

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
	}))

	// Auth routes (public)
	r.Post("/api/auth/register", handlers.Register)
	r.Post("/api/auth/join", handlers.Join)
	r.Post("/api/auth/login", handlers.Login)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware)
		r.Get("/api/family", handlers.GetFamily)
		r.Get("/api/chores", handlers.GetChores)
		r.Post("/api/chores", handlers.AddChore)
		r.Post("/api/log", handlers.LogChore)
		r.Post("/api/log/quick", handlers.QuickLog)
		r.Get("/api/history/{userID}", handlers.GetHistory)
		r.Delete("/api/members/{userID}", handlers.RemoveMember)
		r.Delete("/api/family/reset", handlers.ResetFamily)
		r.Put("/api/chores/{choreID}", handlers.UpdateChore)
		r.Delete("/api/chores/{choreID}", handlers.DeleteChore)
		r.Delete("/api/log/{logID}", handlers.DeleteLog)
		r.Patch("/api/user", handlers.UpdateUser)
		r.Patch("/api/user/password", handlers.ChangePassword)
		r.Get("/api/stats", handlers.GetStats)
	})

	// Serve React frontend (built static files)
	staticDir := "./frontend/dist"
	if _, err := os.Stat(staticDir); err == nil {
		fs := http.FileServer(http.Dir(staticDir))
		r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			// SPA fallback: serve index.html for non-asset routes
			path := staticDir + req.URL.Path
			if _, err := os.Stat(path); os.IsNotExist(err) {
				http.ServeFile(w, req, staticDir+"/index.html")
				return
			}
			fs.ServeHTTP(w, req)
		}))
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("Server running on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}