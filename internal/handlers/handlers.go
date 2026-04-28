package handlers

import (
	"context"
	"encoding/json"
	"math/rand"
	"net/http"
	"strconv"
	"strings"

	"homechores/internal/auth"
	"homechores/internal/db"
	"homechores/internal/models"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"
)

func respond(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func respondErr(w http.ResponseWriter, status int, msg string) {
	respond(w, status, map[string]string{"error": msg})
}

// POST /api/auth/register
func Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name        string `json:"name"`
		Avatar      string `json:"avatar"`
		Color       string `json:"color"`
		Password    string `json:"password"`
		FamilyName  string `json:"family_name"`
		FamilyLogin string `json:"family_login"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondErr(w, 400, "invalid body")
		return
	}
	if body.Name == "" || body.Password == "" || body.FamilyName == "" || body.FamilyLogin == "" {
		respondErr(w, 400, "name, password, family_name and family_login required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 12)
	if err != nil {
		respondErr(w, 500, "hash error")
		return
	}

	inviteCode := randomCode(8)
	familyLogin := strings.ToLower(strings.TrimSpace(body.FamilyLogin))

	ctx := context.Background()
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		respondErr(w, 500, "db error")
		return
	}
	defer tx.Rollback(ctx)

	var familyID int
	err = tx.QueryRow(ctx,
		`INSERT INTO families (name, invite_code, family_login) VALUES ($1, $2, $3) RETURNING id`,
		body.FamilyName, inviteCode, familyLogin,
	).Scan(&familyID)
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			respondErr(w, 409, "family login already taken")
			return
		}
		respondErr(w, 500, "create family error")
		return
	}

	_, err = tx.Exec(ctx, `SELECT seed_chores($1)`, familyID)
	if err != nil {
		respondErr(w, 500, "seed chores error")
		return
	}

	if body.Avatar == "" {
		body.Avatar = "🙂"
	}
	if body.Color == "" {
		body.Color = "#4ECDC4"
	}

	var userID int
	err = tx.QueryRow(ctx,
		`INSERT INTO users (family_id, name, avatar, color, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		familyID, body.Name, body.Avatar, body.Color, string(hash),
	).Scan(&userID)
	if err != nil {
		respondErr(w, 500, "create user error")
		return
	}

	tx.Commit(ctx)

	token, _ := auth.GenerateToken(userID, familyID)
	respond(w, 201, map[string]any{
		"token":       token,
		"user_id":     userID,
		"family_id":   familyID,
		"invite_code": inviteCode,
	})
}

// POST /api/auth/join
func Join(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name       string `json:"name"`
		Avatar     string `json:"avatar"`
		Color      string `json:"color"`
		Password   string `json:"password"`
		InviteCode string `json:"invite_code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondErr(w, 400, "invalid body")
		return
	}

	ctx := context.Background()
	var familyID int
	err := db.Pool.QueryRow(ctx,
		`SELECT id FROM families WHERE invite_code = $1`, body.InviteCode,
	).Scan(&familyID)
	if err != nil {
		respondErr(w, 404, "family not found")
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(body.Password), 12)
	if body.Avatar == "" {
		body.Avatar = "🙂"
	}
	if body.Color == "" {
		body.Color = "#FF6B6B"
	}

	var userID int
	err = db.Pool.QueryRow(ctx,
		`INSERT INTO users (family_id, name, avatar, color, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		familyID, body.Name, body.Avatar, body.Color, string(hash),
	).Scan(&userID)
	if err != nil {
		respondErr(w, 500, "create user error")
		return
	}

	token, _ := auth.GenerateToken(userID, familyID)
	respond(w, 201, map[string]any{
		"token":     token,
		"user_id":   userID,
		"family_id": familyID,
	})
}

// POST /api/auth/login
func Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name        string `json:"name"`
		Password    string `json:"password"`
		FamilyLogin string `json:"family_login"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondErr(w, 400, "invalid body")
		return
	}

	ctx := context.Background()
	var userID int
	var hash string
	var familyID int
	err := db.Pool.QueryRow(ctx,
		`SELECT u.id, u.password_hash, u.family_id
		 FROM users u
		 JOIN families f ON f.id = u.family_id
		 WHERE u.name=$1 AND f.family_login=$2`,
		body.Name, strings.ToLower(body.FamilyLogin),
	).Scan(&userID, &hash, &familyID)
	if err != nil {
		respondErr(w, 401, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Password)); err != nil {
		respondErr(w, 401, "invalid credentials")
		return
	}

	token, _ := auth.GenerateToken(userID, familyID)
	respond(w, 200, map[string]any{
		"token":     token,
		"user_id":   userID,
		"family_id": familyID,
	})
}

// GET /api/family
func GetFamily(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	ctx := context.Background()

	var family models.Family
	db.Pool.QueryRow(ctx,
		`SELECT id, name, invite_code, family_login FROM families WHERE id=$1`, claims.FamilyID,
	).Scan(&family.ID, &family.Name, &family.InviteCode, &family.FamilyLogin)

	rows, _ := db.Pool.Query(ctx,
		`SELECT u.id, u.name, u.avatar, u.color,
		        COALESCE(SUM(CASE WHEN cl.is_penalty THEN -cl.points ELSE cl.points END), 0) as points
		 FROM users u
		 LEFT JOIN chore_logs cl ON (
		     (cl.user_id = u.id AND cl.is_penalty = false) OR
		     (cl.target_user_id = u.id AND cl.is_penalty = true)
		 )
		 WHERE u.family_id = $1
		 GROUP BY u.id
		 ORDER BY points DESC`,
		claims.FamilyID,
	)
	defer rows.Close()

	members := []models.User{}
	for rows.Next() {
		var u models.User
		rows.Scan(&u.ID, &u.Name, &u.Avatar, &u.Color, &u.Points)
		members = append(members, u)
	}

	respond(w, 200, map[string]any{
		"family":  family,
		"members": members,
	})
}

// GET /api/chores
func GetChores(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	ctx := context.Background()

	rows, _ := db.Pool.Query(ctx,
		`SELECT id, name, emoji, points, is_custom, is_penalty
		 FROM chores WHERE family_id=$1
		 ORDER BY is_penalty, is_custom, points DESC`,
		claims.FamilyID,
	)
	defer rows.Close()

	chores := []models.Chore{}
	for rows.Next() {
		var c models.Chore
		rows.Scan(&c.ID, &c.Name, &c.Emoji, &c.Points, &c.IsCustom, &c.IsPenalty)
		chores = append(chores, c)
	}
	respond(w, 200, chores)
}

// POST /api/chores
func AddChore(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	var body struct {
		Name      string `json:"name"`
		Emoji     string `json:"emoji"`
		Points    int    `json:"points"`
		IsPenalty bool   `json:"is_penalty"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.Name == "" || body.Points <= 0 {
		respondErr(w, 400, "name and points required")
		return
	}
	if body.Emoji == "" {
		body.Emoji = "✨"
	}

	ctx := context.Background()
	var id int
	db.Pool.QueryRow(ctx,
		`INSERT INTO chores (family_id, name, emoji, points, is_custom, is_penalty)
		 VALUES ($1,$2,$3,$4,true,$5) RETURNING id`,
		claims.FamilyID, body.Name, body.Emoji, body.Points, body.IsPenalty,
	).Scan(&id)

	respond(w, 201, map[string]any{"id": id})
}

// PUT /api/chores/{choreID}
func UpdateChore(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	choreID, _ := strconv.Atoi(chi.URLParam(r, "choreID"))
	ctx := context.Background()

	var ownerID int
	db.Pool.QueryRow(ctx,
		`SELECT id FROM users WHERE family_id=$1 ORDER BY id ASC LIMIT 1`,
		claims.FamilyID,
	).Scan(&ownerID)
	if claims.UserID != ownerID {
		respondErr(w, 403, "only family owner can edit chores")
		return
	}

	var body struct {
		Name   string `json:"name"`
		Emoji  string `json:"emoji"`
		Points int    `json:"points"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.Name == "" || body.Points <= 0 {
		respondErr(w, 400, "name and points required")
		return
	}

	var famID int
	err := db.Pool.QueryRow(ctx,
		`SELECT family_id FROM chores WHERE id=$1`, choreID,
	).Scan(&famID)
	if err != nil || famID != claims.FamilyID {
		respondErr(w, 404, "chore not found")
		return
	}

	db.Pool.Exec(ctx,
		`UPDATE chores SET name=$1, emoji=$2, points=$3 WHERE id=$4`,
		body.Name, body.Emoji, body.Points, choreID,
	)
	respond(w, 200, map[string]string{"status": "updated"})
}

// DELETE /api/chores/{choreID}
func DeleteChore(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	choreID, _ := strconv.Atoi(chi.URLParam(r, "choreID"))
	ctx := context.Background()

	var ownerID int
	db.Pool.QueryRow(ctx,
		`SELECT id FROM users WHERE family_id=$1 ORDER BY id ASC LIMIT 1`,
		claims.FamilyID,
	).Scan(&ownerID)
	if claims.UserID != ownerID {
		respondErr(w, 403, "only family owner can delete chores")
		return
	}

	var famID int
	err := db.Pool.QueryRow(ctx,
		`SELECT family_id FROM chores WHERE id=$1`, choreID,
	).Scan(&famID)
	if err != nil || famID != claims.FamilyID {
		respondErr(w, 404, "chore not found")
		return
	}

	db.Pool.Exec(ctx, `DELETE FROM chores WHERE id=$1`, choreID)
	respond(w, 200, map[string]string{"status": "deleted"})
}

// POST /api/log
func LogChore(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	var body struct {
		ChoreID      int  `json:"chore_id"`
		TargetUserID *int `json:"target_user_id"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	ctx := context.Background()
	var chore models.Chore
	err := db.Pool.QueryRow(ctx,
		`SELECT id, name, emoji, points, is_penalty FROM chores WHERE id=$1 AND family_id=$2`,
		body.ChoreID, claims.FamilyID,
	).Scan(&chore.ID, &chore.Name, &chore.Emoji, &chore.Points, &chore.IsPenalty)
	if err != nil {
		respondErr(w, 404, "chore not found")
		return
	}

	// Для штрафа — цель из body, для обычного дела — сам себе
	targetUserID := claims.UserID
	if chore.IsPenalty && body.TargetUserID != nil {
		targetUserID = *body.TargetUserID
	}

	var logID int
	db.Pool.QueryRow(ctx,
		`INSERT INTO chore_logs (user_id, target_user_id, chore_id, chore_name, chore_emoji, points, is_penalty)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
		claims.UserID, targetUserID, chore.ID, chore.Name, chore.Emoji, chore.Points, chore.IsPenalty,
	).Scan(&logID)

	respond(w, 201, map[string]any{
		"log_id":     logID,
		"points":     chore.Points,
		"chore":      chore.Name,
		"is_penalty": chore.IsPenalty,
	})
}

// DELETE /api/log/{logID}
func DeleteLog(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	logID, _ := strconv.Atoi(chi.URLParam(r, "logID"))
	ctx := context.Background()

	var userID int
	err := db.Pool.QueryRow(ctx,
		`SELECT user_id FROM chore_logs WHERE id=$1`, logID,
	).Scan(&userID)
	if err != nil || userID != claims.UserID {
		respondErr(w, 404, "log not found")
		return
	}

	db.Pool.Exec(ctx, `DELETE FROM chore_logs WHERE id=$1`, logID)
	respond(w, 200, map[string]string{"status": "deleted"})
}

// GET /api/history/{userID}
func GetHistory(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	userID, _ := strconv.Atoi(chi.URLParam(r, "userID"))

	ctx := context.Background()
	var famID int
	db.Pool.QueryRow(ctx, `SELECT family_id FROM users WHERE id=$1`, userID).Scan(&famID)
	if famID != claims.FamilyID {
		respondErr(w, 403, "forbidden")
		return
	}

	rows, _ := db.Pool.Query(ctx,
		`SELECT id, chore_name, chore_emoji, points, is_penalty, logged_at
		 FROM chore_logs
		 WHERE (user_id=$1 AND is_penalty=false) OR (target_user_id=$1 AND is_penalty=true)
		 ORDER BY logged_at DESC LIMIT 50`,
		userID,
	)
	defer rows.Close()

	logs := []models.ChoreLog{}
	for rows.Next() {
		var l models.ChoreLog
		rows.Scan(&l.ID, &l.ChoreName, &l.ChoreEmoji, &l.Points, &l.IsPenalty, &l.LoggedAt)
		logs = append(logs, l)
	}
	respond(w, 200, logs)
}

// DELETE /api/members/{userID}
func RemoveMember(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	targetID, _ := strconv.Atoi(chi.URLParam(r, "userID"))
	ctx := context.Background()

	if targetID == claims.UserID {
		respondErr(w, 400, "cannot remove yourself")
		return
	}

	var ownerID int
	db.Pool.QueryRow(ctx,
		`SELECT id FROM users WHERE family_id=$1 ORDER BY id ASC LIMIT 1`,
		claims.FamilyID,
	).Scan(&ownerID)
	if claims.UserID != ownerID {
		respondErr(w, 403, "only family owner can remove members")
		return
	}

	var famID int
	err := db.Pool.QueryRow(ctx,
		`SELECT family_id FROM users WHERE id=$1`, targetID,
	).Scan(&famID)
	if err != nil || famID != claims.FamilyID {
		respondErr(w, 404, "member not found")
		return
	}

	db.Pool.Exec(ctx, `DELETE FROM users WHERE id=$1`, targetID)
	respond(w, 200, map[string]string{"status": "removed"})
}

// DELETE /api/family/reset
func ResetFamily(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	ctx := context.Background()

	var ownerID int
	db.Pool.QueryRow(ctx,
		`SELECT id FROM users WHERE family_id=$1 ORDER BY id ASC LIMIT 1`,
		claims.FamilyID,
	).Scan(&ownerID)
	if claims.UserID != ownerID {
		respondErr(w, 403, "only family owner can reset scores")
		return
	}

	db.Pool.Exec(ctx,
		`DELETE FROM chore_logs WHERE user_id IN (SELECT id FROM users WHERE family_id=$1)`,
		claims.FamilyID,
	)
	respond(w, 200, map[string]string{"status": "reset"})
}

func randomCode(n int) string {
	const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}