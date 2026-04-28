package models

import "time"

type Family struct {
    ID          int    `json:"id"`
    Name        string `json:"name"`
    InviteCode  string `json:"invite_code"`
    FamilyLogin string `json:"family_login"`
}

type User struct {
	ID       int    `json:"id"`
	FamilyID int    `json:"family_id"`
	Name     string `json:"name"`
	Avatar   string `json:"avatar"`
	Color    string `json:"color"`
	Points   int    `json:"points"` // computed
}

type Chore struct {
    ID        int    `json:"id"`
    FamilyID  int    `json:"family_id"`
    Name      string `json:"name"`
    Emoji     string `json:"emoji"`
    Points    int    `json:"points"`
    IsCustom  bool   `json:"is_custom"`
    IsPenalty bool   `json:"is_penalty"`
}

type ChoreLog struct {
    ID           int       `json:"id"`
    UserID       int       `json:"user_id"`
    TargetUserID *int      `json:"target_user_id"`
    ChoreID      *int      `json:"chore_id"`
    ChoreName    string    `json:"chore_name"`
    ChoreEmoji   string    `json:"chore_emoji"`
    Points       int       `json:"points"`
    IsPenalty    bool      `json:"is_penalty"`
    LoggedAt     time.Time `json:"logged_at"`
}

type LeaderboardEntry struct {
	User
	Rank     string `json:"rank"`
	RankEmoji string `json:"rank_emoji"`
	History  []ChoreLog `json:"history,omitempty"`
}
