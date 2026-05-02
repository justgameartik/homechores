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
		`SELECT c.id, c.name, c.emoji, c.points, c.is_custom, c.is_penalty,
		        COUNT(cl.id) AS use_count
		 FROM chores c
		 LEFT JOIN chore_logs cl ON cl.chore_id = c.id
		 WHERE c.family_id = $1
		 GROUP BY c.id
		 ORDER BY c.is_penalty, COUNT(cl.id) DESC, c.points DESC`,
		claims.FamilyID,
	)
	defer rows.Close()

	chores := []models.Chore{}
	for rows.Next() {
		var c models.Chore
		rows.Scan(&c.ID, &c.Name, &c.Emoji, &c.Points, &c.IsCustom, &c.IsPenalty, &c.UseCount)
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

// PATCH /api/user — обновить аватар и цвет текущего пользователя
func UpdateUser(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	var body struct {
		Avatar string `json:"avatar"`
		Color  string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondErr(w, 400, "invalid body")
		return
	}
	ctx := context.Background()
	_, err := db.Pool.Exec(ctx,
		`UPDATE users SET avatar=$1, color=$2 WHERE id=$3`,
		body.Avatar, body.Color, claims.UserID,
	)
	if err != nil {
		respondErr(w, 500, "db error")
		return
	}
	respond(w, 200, map[string]any{"ok": true})
}

// POST /api/log/quick — начислить очки без сохранения дела в список
func QuickLog(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	var body struct {
		Name   string `json:"name"`
		Emoji  string `json:"emoji"`
		Points int    `json:"points"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondErr(w, 400, "invalid body")
		return
	}
	if body.Name == "" || body.Points <= 0 {
		respondErr(w, 400, "name and points required")
		return
	}
	if body.Emoji == "" {
		body.Emoji = "✨"
	}

	ctx := context.Background()
	var logID int
	db.Pool.QueryRow(ctx,
		`INSERT INTO chore_logs (user_id, target_user_id, chore_name, chore_emoji, points, is_penalty)
		 VALUES ($1,$1,$2,$3,$4,false) RETURNING id`,
		claims.UserID, body.Name, body.Emoji, body.Points,
	).Scan(&logID)

	respond(w, 201, map[string]any{
		"log_id": logID,
		"points": body.Points,
		"name":   body.Name,
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

// PATCH /api/user/password — смена пароля текущего пользователя
func ChangePassword(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	var body struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondErr(w, 400, "invalid body")
		return
	}
	if body.OldPassword == "" || body.NewPassword == "" {
		respondErr(w, 400, "old_password and new_password required")
		return
	}
	if len(body.NewPassword) < 4 {
		respondErr(w, 400, "new password must be at least 4 characters")
		return
	}

	ctx := context.Background()
	var currentHash string
	err := db.Pool.QueryRow(ctx,
		`SELECT password_hash FROM users WHERE id=$1`, claims.UserID,
	).Scan(&currentHash)
	if err != nil {
		respondErr(w, 500, "db error")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(body.OldPassword)); err != nil {
		respondErr(w, 401, "current password is incorrect")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), 12)
	if err != nil {
		respondErr(w, 500, "hash error")
		return
	}

	_, err = db.Pool.Exec(ctx,
		`UPDATE users SET password_hash=$1 WHERE id=$2`,
		string(newHash), claims.UserID,
	)
	if err != nil {
		respondErr(w, 500, "db error")
		return
	}
	respond(w, 200, map[string]any{"ok": true})
}

// GET /api/stats — статистика по очкам за день/неделю/месяц/всё время для всей семьи
func GetStats(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r)
	ctx := context.Background()

	// Получаем всех участников семьи
	memberRows, err := db.Pool.Query(ctx,
		`SELECT id, name, avatar, color FROM users WHERE family_id=$1 ORDER BY id ASC`,
		claims.FamilyID,
	)
	if err != nil {
		respondErr(w, 500, "db error")
		return
	}
	defer memberRows.Close()

	type MemberInfo struct {
		ID     int    `json:"id"`
		Name   string `json:"name"`
		Avatar string `json:"avatar"`
		Color  string `json:"color"`
	}
	var memberList []MemberInfo
	memberIDs := []int{}
	for memberRows.Next() {
		var m MemberInfo
		memberRows.Scan(&m.ID, &m.Name, &m.Avatar, &m.Color)
		memberList = append(memberList, m)
		memberIDs = append(memberIDs, m.ID)
	}

	// Агрегированные очки за период для каждого участника
	type PeriodStats struct {
		Points    int `json:"points"`
		ChoresDone int `json:"chores_done"`
	}
	type MemberStats struct {
		MemberInfo
		Day   PeriodStats `json:"day"`
		Week  PeriodStats `json:"week"`
		Month PeriodStats `json:"month"`
		All   PeriodStats `json:"all"`
	}

	statsMap := map[int]*MemberStats{}
	for _, m := range memberList {
		ms := &MemberStats{MemberInfo: m}
		statsMap[m.ID] = ms
	}

	// Один запрос — все периоды сразу через CASE
	statsRows, err := db.Pool.Query(ctx,
		`SELECT
			u.id,
			COALESCE(SUM(CASE WHEN cl.logged_at >= NOW() - INTERVAL '1 day'
				THEN (CASE WHEN cl.is_penalty THEN -cl.points ELSE cl.points END) ELSE 0 END), 0) AS day_pts,
			COUNT(CASE WHEN cl.logged_at >= NOW() - INTERVAL '1 day' AND cl.is_penalty = false THEN 1 END) AS day_cnt,
			COALESCE(SUM(CASE WHEN cl.logged_at >= NOW() - INTERVAL '7 days'
				THEN (CASE WHEN cl.is_penalty THEN -cl.points ELSE cl.points END) ELSE 0 END), 0) AS week_pts,
			COUNT(CASE WHEN cl.logged_at >= NOW() - INTERVAL '7 days' AND cl.is_penalty = false THEN 1 END) AS week_cnt,
			COALESCE(SUM(CASE WHEN cl.logged_at >= NOW() - INTERVAL '30 days'
				THEN (CASE WHEN cl.is_penalty THEN -cl.points ELSE cl.points END) ELSE 0 END), 0) AS month_pts,
			COUNT(CASE WHEN cl.logged_at >= NOW() - INTERVAL '30 days' AND cl.is_penalty = false THEN 1 END) AS month_cnt,
			COALESCE(SUM(CASE WHEN cl.is_penalty THEN -cl.points ELSE cl.points END), 0) AS all_pts,
			COUNT(CASE WHEN cl.is_penalty = false THEN 1 END) AS all_cnt
		FROM users u
		LEFT JOIN chore_logs cl ON (
			(cl.user_id = u.id AND cl.is_penalty = false) OR
			(cl.target_user_id = u.id AND cl.is_penalty = true)
		)
		WHERE u.family_id = $1
		GROUP BY u.id`,
		claims.FamilyID,
	)
	if err != nil {
		respondErr(w, 500, "db error stats")
		return
	}
	defer statsRows.Close()

	for statsRows.Next() {
		var uid int
		var dp, dc, wp, wc, mp, mc, ap, ac int
		statsRows.Scan(&uid, &dp, &dc, &wp, &wc, &mp, &mc, &ap, &ac)
		if ms, ok := statsMap[uid]; ok {
			ms.Day   = PeriodStats{dp, dc}
			ms.Week  = PeriodStats{wp, wc}
			ms.Month = PeriodStats{mp, mc}
			ms.All   = PeriodStats{ap, ac}
		}
	}

	// Топ-дела за всё время для каждого участника (топ-3)
	type TopChore struct {
		Name  string `json:"name"`
		Emoji string `json:"emoji"`
		Count int    `json:"count"`
	}
	type MemberTopChores struct {
		UserID int        `json:"user_id"`
		Top    []TopChore `json:"top"`
	}

	topRows, err := db.Pool.Query(ctx,
		`SELECT cl.user_id, cl.chore_name, cl.chore_emoji, COUNT(*) as cnt
		 FROM chore_logs cl
		 JOIN users u ON u.id = cl.user_id
		 WHERE u.family_id = $1 AND cl.is_penalty = false
		 GROUP BY cl.user_id, cl.chore_name, cl.chore_emoji
		 ORDER BY cl.user_id, cnt DESC`,
		claims.FamilyID,
	)
	topChoresMap := map[int][]TopChore{}
	if err == nil {
		defer topRows.Close()
		for topRows.Next() {
			var uid int
			var name, emoji string
			var cnt int
			topRows.Scan(&uid, &name, &emoji, &cnt)
			if len(topChoresMap[uid]) < 3 {
				topChoresMap[uid] = append(topChoresMap[uid], TopChore{name, emoji, cnt})
			}
		}
	}

	// Activity по дням за последние 14 дней
	type DayActivity struct {
		Date   string `json:"date"`
		Points int    `json:"points"`
	}
	type MemberActivity struct {
		UserID   int           `json:"user_id"`
		Activity []DayActivity `json:"activity"`
	}

	actRows, err := db.Pool.Query(ctx,
		`SELECT affected_user, TO_CHAR(day, 'YYYY-MM-DD') as day_str, SUM(pts) as total_pts
		 FROM (
		   SELECT cl.user_id AS affected_user,
		          DATE(cl.logged_at AT TIME ZONE 'UTC') AS day,
		          cl.points AS pts
		   FROM chore_logs cl
		   JOIN users u ON u.id = cl.user_id
		   WHERE u.family_id = $1
		     AND cl.is_penalty = false
		     AND cl.logged_at >= NOW() - INTERVAL '14 days'
		   UNION ALL
		   SELECT cl.target_user_id AS affected_user,
		          DATE(cl.logged_at AT TIME ZONE 'UTC') AS day,
		          -cl.points AS pts
		   FROM chore_logs cl
		   JOIN users u ON u.id = cl.target_user_id
		   WHERE u.family_id = $1
		     AND cl.is_penalty = true
		     AND cl.logged_at >= NOW() - INTERVAL '14 days'
		 ) sub
		 GROUP BY affected_user, day
		 ORDER BY affected_user, day`,
		claims.FamilyID,
	)
	activityMap := map[int][]DayActivity{}
	if err == nil {
		defer actRows.Close()
		for actRows.Next() {
			var uid int
			var day string
			var pts int
			actRows.Scan(&uid, &day, &pts)
			activityMap[uid] = append(activityMap[uid], DayActivity{day, pts})
		}
	}

	// Собираем итоговый ответ
	type MemberResult struct {
		MemberStats
		TopChores []TopChore   `json:"top_chores"`
		Activity  []DayActivity `json:"activity"`
	}
	result := []MemberResult{}
	for _, m := range memberList {
		ms := statsMap[m.ID]
		result = append(result, MemberResult{
			MemberStats: *ms,
			TopChores:   topChoresMap[m.ID],
			Activity:    activityMap[m.ID],
		})
	}

	respond(w, 200, result)
}

func randomCode(n int) string {
	const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}