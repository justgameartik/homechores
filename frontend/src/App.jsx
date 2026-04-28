import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api.js";

const RANKS = [
  { min: 0,   label: "Новичок",        emoji: "🌱" },
  { min: 50,  label: "Помощник",       emoji: "⭐" },
  { min: 150, label: "Хозяйственник",  emoji: "🌟" },
  { min: 300, label: "Мастер уюта",    emoji: "🏆" },
  { min: 500, label: "Легенда дома",   emoji: "👑" },
];

const AVATARS = ["🧔","👩","👦","👧","👴","👵","🧑","👨‍💼","👩‍💼","🧑‍🍳","🦸","🧙"];
const COLORS  = ["#FF6B6B","#4ECDC4","#FFE66D","#A8E6CF","#FF8B94","#B5EAD7","#C7CEEA","#FFDAC1"];

function getRank(pts) {
  return [...RANKS].reverse().find(r => pts >= r.min) || RANKS[0];
}
function getRankProgress(pts) {
  const idx = [...RANKS].reverse().findIndex(r => pts >= r.min);
  const ri = RANKS.length - 1 - idx;
  if (ri >= RANKS.length - 1) return 100;
  return Math.round(((pts - RANKS[ri].min) / (RANKS[ri+1].min - RANKS[ri].min)) * 100);
}

const inputStyle = {
  background:"#1E1E35", border:"1px solid #2a2a3e", borderRadius:12,
  padding:"12px 16px", color:"#F0EEF6", fontSize:15,
  fontFamily:"'Nunito',system-ui,sans-serif", outline:"none", width:"100%",
};

// ─── Auth Screen ─────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "", password: "", family_name: "", family_login: "", invite_code: "",
    avatar: "🧔", color: "#FF6B6B",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    setError(""); setLoading(true);
    try {
      let res;
      if (mode === "register") res = await api.register(form);
      else if (mode === "join") res = await api.join(form);
      else res = await api.login({ name: form.name, password: form.password, family_login: form.family_login });

      localStorage.setItem("token", res.token);
      localStorage.setItem("user_id", String(res.user_id));
      localStorage.setItem("family_id", String(res.family_id));
      onAuth();
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0F0F1A", display:"flex", alignItems:"center",
      justifyContent:"center", padding:20, fontFamily:"'Nunito',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:56 }}>🏠</div>
          <div style={{ fontSize:26, fontWeight:900, color:"#F0EEF6" }}>Домашний Рейтинг</div>
          <div style={{ fontSize:13, color:"#555", marginTop:4 }}>Соревнование за чистоту</div>
        </div>

        <div style={{ display:"flex", background:"#1E1E35", borderRadius:14, padding:4, marginBottom:24 }}>
          {[["login","Войти"],["register","Создать семью"],["join","Вступить"]].map(([m,l]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex:1, padding:"10px 4px", border:"none", borderRadius:10, cursor:"pointer",
                fontFamily:"inherit", background: mode===m ? "#FFE66D" : "transparent",
                color: mode===m ? "#0F0F1A" : "#666", fontWeight:800, fontSize:11, transition:"all 0.2s" }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode === "login" && (
            <input placeholder="Логин семьи" value={form.family_login}
              onChange={e => set("family_login", e.target.value.toLowerCase())}
              style={inputStyle} />
          )}
          {mode === "join" && (
            <input placeholder="Инвайт-код семьи (8 символов)" value={form.invite_code}
              onChange={e => set("invite_code", e.target.value.toUpperCase())}
              style={inputStyle} />
          )}
          {mode === "register" && (
            <>
              <input placeholder="Название семьи" value={form.family_name}
                onChange={e => set("family_name", e.target.value)} style={inputStyle} />
              <input placeholder="Логин семьи для входа" value={form.family_login}
                onChange={e => set("family_login", e.target.value.toLowerCase())}
                style={inputStyle} />
              <div style={{ fontSize:11, color:"#555", marginTop:-4 }}>
                Латиница, без пробелов — этим логином будете входить
              </div>
            </>
          )}

          <input placeholder="Твоё имя" value={form.name}
            onChange={e => set("name", e.target.value)} style={inputStyle} />
          <input placeholder="Пароль" type="password" value={form.password}
            onChange={e => set("password", e.target.value)} style={inputStyle} />

          {(mode === "register" || mode === "join") && (
            <>
              <div style={{ fontSize:12, fontWeight:700, color:"#666" }}>АВАТАР</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {AVATARS.map(a => (
                  <div key={a} onClick={() => set("avatar", a)}
                    style={{ fontSize:26, cursor:"pointer", padding:8, borderRadius:12,
                      background: form.avatar===a ? "#FFE66D33" : "#1E1E35",
                      border: form.avatar===a ? "2px solid #FFE66D" : "2px solid transparent" }}>
                    {a}
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:"#666" }}>ЦВЕТ</div>
              <div style={{ display:"flex", gap:8 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => set("color", c)}
                    style={{ width:32, height:32, borderRadius:"50%", background:c, cursor:"pointer",
                      border: form.color===c ? "3px solid #fff" : "3px solid transparent",
                      transition:"all 0.15s" }} />
                ))}
              </div>
            </>
          )}

          {error && <div style={{ color:"#FF6B6B", fontSize:13, fontWeight:700 }}>{error}</div>}

          <button onClick={submit} disabled={loading}
            style={{ padding:16, background:loading?"#333":"#FFE66D", color:"#0F0F1A",
              border:"none", borderRadius:14, fontWeight:900, fontSize:16,
              cursor:loading?"not-allowed":"pointer", fontFamily:"inherit", marginTop:8 }}>
            {loading ? "..." : mode==="login" ? "Войти" : mode==="register" ? "Создать и войти" : "Вступить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("token"));
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [chores, setChores] = useState([]);
  const [activeMemberID, setActiveMemberID] = useState(null);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("home");
  const [flash, setFlash] = useState(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPoints, setCustomPoints] = useState(10);
  const [customEmoji, setCustomEmoji] = useState("✨");
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editingChore, setEditingChore] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [swipeState, setSwipeState] = useState({});
  const swipeStart = useRef({});
  const [penaltyTarget, setPenaltyTarget] = useState(null);

  const myID = Number(localStorage.getItem("user_id"));

  const loadFamily = useCallback(async () => {
    try {
      const data = await api.getFamily();
      setFamily(data.family);
      setMembers(data.members);
      const sortedByID = [...data.members].sort((a,b) => a.id - b.id);
      setIsOwner(sortedByID[0]?.id === myID);
      if (!activeMemberID) setActiveMemberID(myID || data.members[0]?.id);
    } catch(e) {
      if (e.message === "unauthorized") { localStorage.clear(); setAuthed(false); }
    }
  }, [activeMemberID, myID]);

  const loadChores = useCallback(async () => {
    const data = await api.getChores();
    setChores(data);
  }, []);

  const loadHistory = useCallback(async (uid) => {
    if (!uid) return;
    const data = await api.getHistory(uid);
    setHistory(data);
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadFamily();
    loadChores();
  }, [authed]);

  useEffect(() => {
    if (activeMemberID) loadHistory(activeMemberID);
  }, [activeMemberID]);

  async function doLogChore(chore) {
    if (chore.is_penalty) {
      setPenaltyTarget(chore);
      return;
    }
    setLoading(true);
    try {
      await api.logChore(chore.id, null);
      setFlash({ points: chore.points, name: chore.name });
      setTimeout(() => setFlash(null), 1800);
      await loadFamily();
      await loadHistory(activeMemberID);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function doApplyPenalty(targetMemberID) {
    if (!penaltyTarget) return;
    setLoading(true);
    try {
      await api.logChore(penaltyTarget.id, targetMemberID);
      setPenaltyTarget(null);
      await loadFamily();
      await loadHistory(activeMemberID);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function doAddCustom() {
    if (!customName.trim()) return;
    await api.addChore({ name: customName, emoji: customEmoji, points: Number(customPoints) });
    setCustomName(""); setCustomPoints(10); setCustomEmoji("✨");
    setAddingCustom(false);
    await loadChores();
  }

  async function doRemoveMember(memberID) {
    if (!confirm("Удалить участника?")) return;
    try {
      await api.removeMember(memberID);
      if (activeMemberID === memberID) setActiveMemberID(myID);
      await loadFamily();
    } catch(e) { alert(e.message); }
  }

  async function doResetFamily() {
    if (!confirm("Обнулить очки всей семьи? Это действие нельзя отменить.")) return;
    try {
      await api.resetFamily();
      await loadFamily();
      await loadHistory(activeMemberID);
    } catch(e) { alert(e.message); }
  }

  async function doUpdateChore() {
    try {
      await api.updateChore(editingChore.id, {
        name: editingChore.name,
        emoji: editingChore.emoji,
        points: Number(editingChore.points),
      });
      setEditingChore(null);
      await loadChores();
    } catch(e) { alert(e.message); }
  }

  async function doDeleteChore(choreID) {
    if (!confirm("Удалить это дело из списка?")) return;
    try {
      await api.deleteChore(choreID);
      setEditingChore(null);
      await loadChores();
    } catch(e) { alert(e.message); }
  }

  function formatLogDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const time = date.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();
    if (isToday) return `сегодня в ${time}`;
    if (isYesterday) return `вчера в ${time}`;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}.${month} в ${time}`;
  }

  async function doDeleteLog(logID) {
    try {
      await api.deleteLog(logID);
      await loadFamily();
      await loadHistory(activeMemberID);
    } catch(e) { alert(e.message); }
  }

  function logout() {
    localStorage.clear();
    setAuthed(false);
  }

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

  const activeMember = members.find(m => m.id === activeMemberID);
  const sortedByPoints = [...members].sort((a,b) => b.points - a.points);
  const regularChores = chores.filter(c => !c.is_penalty);
  const penaltyChores = chores.filter(c => c.is_penalty);

  return (
    <div style={{ minHeight:"100vh", background:"#0F0F1A", fontFamily:"'Nunito',system-ui,sans-serif",
      color:"#F0EEF6", maxWidth:480, margin:"0 auto", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
        @keyframes pop{0%{transform:scale(0.5) translateY(0);opacity:1}80%{transform:scale(1.2) translateY(-60px);opacity:1}100%{transform:scale(1) translateY(-80px);opacity:0}}
        .btn{transition:transform 0.1s,filter 0.15s;cursor:pointer} .btn:active{transform:scale(0.95)} .btn:hover{filter:brightness(1.1)}
        input{color:#F0EEF6}
      `}</style>

      {/* Flash */}
      {flash && (
        <div style={{ position:"fixed", top:"30%", left:"50%", transform:"translateX(-50%)",
          zIndex:9999, pointerEvents:"none", animation:"pop 1.8s ease-out forwards",
          fontSize:32, fontWeight:900, color:"#FFE66D",
          textShadow:"0 0 20px rgba(255,230,109,0.8)", whiteSpace:"nowrap" }}>
          +{flash.points} ⚡
        </div>
      )}

      {/* Header */}
      <div style={{ padding:"20px 20px 0", background:"linear-gradient(180deg,#1A1A2E 0%,transparent 100%)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"#666", textTransform:"uppercase" }}>Семейный</div>
            <div style={{ fontSize:22, fontWeight:900, lineHeight:1 }}>
              {family ? family.name : "Домашний Рейтинг"}
            </div>
            {family && <div style={{ fontSize:11, color:"#444", marginTop:2 }}>@{family.family_login}</div>}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn" onClick={() => setView(view==="leaderboard"?"home":"leaderboard")}
              style={{ background:view==="leaderboard"?"#FFE66D":"#1E1E35",
                color:view==="leaderboard"?"#0F0F1A":"#F0EEF6",
                border:"none", borderRadius:12, padding:"8px 12px",
                fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
              🏆
            </button>
            {isOwner && (
              <button className="btn" onClick={() => setEditMode(e => !e)}
                style={{ background:editMode?"#FF6B6B":"#1E1E35",
                  color:editMode?"#fff":"#888",
                  border:"none", borderRadius:12, padding:"8px 12px",
                  fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                ✏️
              </button>
            )}
            <button className="btn" onClick={() => setShowInvite(v => !v)}
              style={{ background:showInvite?"#4ECDC4":"#1E1E35",
                color:showInvite?"#0F0F1A":"#888",
                border:"none", borderRadius:12, padding:"8px 12px",
                fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
              🔗
            </button>
            {isOwner && (
              <button className="btn" onClick={doResetFamily}
                style={{ background:"#1E1E35", border:"none", borderRadius:12, padding:"8px 12px",
                  color:"#FF6B6B", fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                🔄
              </button>
            )}
            <button className="btn" onClick={logout}
              style={{ background:"#1E1E35", border:"none", borderRadius:12, padding:"8px 12px",
                color:"#555", fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
              ⏏
            </button>
          </div>
        </div>

        {/* Invite panel */}
        {showInvite && family && (
          <div style={{ background:"#1E1E35", borderRadius:16, padding:"14px 16px", marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#666", marginBottom:6 }}>ИНВАЙТ-КОД ДЛЯ ВСТУПЛЕНИЯ</div>
            <div className="btn" onClick={() => {
                try {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(family.invite_code);
                  } else {
                    const el = document.createElement("textarea");
                    el.value = family.invite_code;
                    el.style.position = "fixed";
                    el.style.opacity = "0";
                    document.body.appendChild(el);
                    el.focus();
                    el.select();
                    document.execCommand("copy");
                    document.body.removeChild(el);
                  }
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch(e) { console.error("copy failed", e); }
              }}
              style={{ fontSize:28, fontWeight:900, letterSpacing:4, color:"#4ECDC4", cursor:"pointer", display:"inline-block" }}>
              {family.invite_code}
            </div>
            <div style={{ fontSize:11, color: copied ? "#4ECDC4" : "#555", marginTop:4, transition:"color 0.2s" }}>
              {copied ? "✓ Скопировано!" : "Нажми на код — скопируется в буфер"}
            </div>
          </div>
        )}

        {/* Member tabs */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
          {members.map(m => (
            <div key={m.id} className="btn"
              onClick={() => { setActiveMemberID(m.id); setView("home"); }}
              style={{ display:"flex", flexDirection:"column", alignItems:"center",
                padding:"8px 12px", borderRadius:16, flexShrink:0,
                background: activeMemberID===m.id ? m.color+"33" : "#1E1E35",
                border: activeMemberID===m.id ? `2px solid ${m.color}` : "2px solid transparent" }}>
              <div style={{ fontSize:22 }}>{m.avatar}</div>
              <div style={{ fontSize:11, fontWeight:700, marginTop:2 }}>{m.name}</div>
              <div style={{ fontSize:11, fontWeight:800, color:m.color }}>{m.points} pts</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height:1, background:"#1E1E35", margin:"16px 0" }} />

      {/* LEADERBOARD */}
      {view === "leaderboard" && (
        <div style={{ padding:"0 20px 100px" }}>
          <div style={{ fontSize:18, fontWeight:900, marginBottom:16 }}>🏆 Таблица лидеров</div>
          {sortedByPoints.map((m, i) => {
            const rank = getRank(m.points);
            const prog = getRankProgress(m.points);
            return (
              <div key={m.id} style={{ background: i===0 ? `linear-gradient(135deg,${m.color}22,#1E1E35)` : "#1E1E35",
                border:`1px solid ${i===0 ? m.color+"66" : "#2a2a3e"}`,
                borderRadius:20, padding:16, marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ fontSize:28 }}>{["🥇","🥈","🥉"][i] || `#${i+1}`}</div>
                  <div style={{ fontSize:32 }}>{m.avatar}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:16 }}>{m.name}</div>
                    <div style={{ fontSize:12, color:"#888" }}>{rank.emoji} {rank.label}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontWeight:900, fontSize:22, color:m.color }}>{m.points}</div>
                    <div style={{ fontSize:11, color:"#666" }}>очков</div>
                  </div>
                </div>
                <div style={{ marginTop:10, background:"#0F0F1A", borderRadius:999, height:6, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:999, width:`${prog}%`,
                    background:`linear-gradient(90deg,${m.color},${m.color}88)`, transition:"width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HOME */}
      {view === "home" && activeMember && (
        <div style={{ padding:"0 20px 100px" }}>

          {/* Member card */}
          <div style={{ background:`linear-gradient(135deg,${activeMember.color}22 0%,#1E1E35 100%)`,
            border:`1px solid ${activeMember.color}44`, borderRadius:24, padding:20, marginBottom:24,
            position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", right:-20, top:-20, fontSize:80, opacity:0.08 }}>{activeMember.avatar}</div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ fontSize:40 }}>{activeMember.avatar}</div>
              <div>
                <div style={{ fontSize:20, fontWeight:900 }}>{activeMember.name}</div>
                <div style={{ fontSize:13, color:"#888" }}>
                  {getRank(activeMember.points).emoji} {getRank(activeMember.points).label}
                </div>
              </div>
              <div style={{ marginLeft:"auto", textAlign:"right" }}>
                <div style={{ fontSize:36, fontWeight:900, color:activeMember.color,
                  textShadow:`0 0 20px ${activeMember.color}66` }}>{activeMember.points}</div>
                <div style={{ fontSize:11, color:"#666", fontWeight:700 }}>ОЧКОВ</div>
              </div>
            </div>
            <div style={{ background:"#0F0F1A", borderRadius:999, height:8, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:999, width:`${getRankProgress(activeMember.points)}%`,
                background:`linear-gradient(90deg,${activeMember.color},${activeMember.color}88)`, transition:"width 0.5s" }} />
            </div>
            {isOwner && activeMemberID !== myID && (
              <button onClick={() => doRemoveMember(activeMemberID)}
                style={{ marginTop:16, width:"100%", padding:"10px", background:"transparent",
                  color:"#FF6B6B", border:"1px solid #FF6B6B33", borderRadius:12,
                  fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                🗑 Удалить участника
              </button>
            )}
          </div>

          {/* Chores — own profile only */}
          {activeMemberID === myID && (
            <>
              <div style={{ fontSize:12, fontWeight:700, color:"#666", letterSpacing:2,
                textTransform:"uppercase", marginBottom:12 }}>
                {editMode ? "✏️ Режим редактирования" : "Что сделал?"}
              </div>

              {/* Обычные дела */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                {regularChores.map(c => (
                  <button key={c.id} className="btn"
                    onClick={() => editMode ? setEditingChore(c) : doLogChore(c)}
                    disabled={loading && !editMode}
                    style={{ background:"#1E1E35",
                      border: editMode ? "1px solid #FF6B6B44" : "1px solid #2a2a3e",
                      borderRadius:18, padding:"14px 12px", display:"flex", alignItems:"center", gap:10,
                      cursor:"pointer", textAlign:"left", color:"#F0EEF6", fontFamily:"inherit",
                      position:"relative" }}>
                    <div style={{ fontSize:26 }}>{c.emoji}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, lineHeight:1.2 }}>{c.name}</div>
                      <div style={{ fontSize:11, fontWeight:800, color: editMode ? "#FF6B6B" : "#FFE66D", marginTop:2 }}>
                        {editMode ? "нажми для правки" : `+${c.points} pts`}
                      </div>
                    </div>
                  </button>
                ))}

                {!addingCustom ? (
                  <button className="btn" onClick={() => setAddingCustom(true)}
                    style={{ background:"#1E1E35", border:"1px dashed #333", borderRadius:18,
                      padding:"14px 12px", display:"flex", alignItems:"center", gap:10,
                      cursor:"pointer", color:"#555", fontFamily:"inherit" }}>
                    <div style={{ fontSize:26 }}>✨</div>
                    <div><div style={{ fontSize:13, fontWeight:700 }}>Своё дело</div></div>
                  </button>
                ) : (
                  <div style={{ background:"#1E1E35", border:"1px solid #FFE66D44",
                    borderRadius:18, padding:12, gridColumn:"1 / -1" }}>
                    <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                      <input value={customEmoji} onChange={e => setCustomEmoji(e.target.value)}
                        style={{ ...inputStyle, width:50, textAlign:"center", fontSize:20, padding:"8px" }} />
                      <input value={customName} onChange={e => setCustomName(e.target.value)}
                        placeholder="Что сделал..."
                        style={{ ...inputStyle, flex:1, fontSize:14, padding:"8px 12px" }} />
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <input type="number" value={customPoints} onChange={e => setCustomPoints(e.target.value)}
                        min={1} max={100}
                        style={{ ...inputStyle, width:70, color:"#FFE66D", fontWeight:800, padding:"8px 10px", fontSize:14 }} />
                      <span style={{ fontSize:12, color:"#666" }}>pts</span>
                      <button onClick={doAddCustom}
                        style={{ marginLeft:"auto", padding:"8px 16px", background:"#FFE66D",
                          color:"#0F0F1A", border:"none", borderRadius:10,
                          fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>Записать</button>
                      <button onClick={() => setAddingCustom(false)}
                        style={{ padding:"8px 12px", background:"transparent", color:"#555",
                          border:"none", borderRadius:10, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Штрафы */}
              {penaltyChores.length > 0 && (
                <>
                  <div style={{ fontSize:12, fontWeight:700, color:"#FF6B6B", letterSpacing:2,
                    textTransform:"uppercase", marginBottom:12 }}>⚠️ Штрафы</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                    {penaltyChores.map(c => (
                      <button key={c.id} className="btn"
                        onClick={() => editMode ? setEditingChore(c) : doLogChore(c)}
                        disabled={loading && !editMode}
                        style={{ background:"#FF6B6B11",
                          border: editMode ? "1px solid #FF6B6B66" : "1px solid #FF6B6B33",
                          borderRadius:18, padding:"14px 12px", display:"flex", alignItems:"center", gap:10,
                          cursor:"pointer", textAlign:"left", color:"#F0EEF6", fontFamily:"inherit" }}>
                        <div style={{ fontSize:26 }}>{c.emoji}</div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, lineHeight:1.2 }}>{c.name}</div>
                          <div style={{ fontSize:11, fontWeight:800, color:"#FF6B6B", marginTop:2 }}>
                            {editMode ? "нажми для правки" : `-${c.points} pts`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* History */}
          {history.length > 0 && (
            <>
              <div style={{ fontSize:12, fontWeight:700, color:"#666", letterSpacing:2,
                textTransform:"uppercase", marginBottom:12 }}>
                {activeMemberID === myID ? "Моя история" : `История — ${activeMember.name}`}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {history.slice(0, 10).map(h => {
                  const offset = swipeState[h.id] || 0;
                  return (
                    <div key={h.id} style={{ position:"relative", overflow:"hidden", borderRadius:12 }}>
                      <div style={{ position:"absolute", inset:0, background:"#FF6B6B22",
                        display:"flex", alignItems:"center", justifyContent:"flex-end",
                        paddingRight:16, borderRadius:12 }}>
                        <span style={{ fontSize:16 }}>🗑</span>
                      </div>
                      <div
                        onTouchStart={e => { swipeStart.current[h.id] = e.touches[0].clientX; }}
                        onTouchMove={e => {
                          const dx = e.touches[0].clientX - (swipeStart.current[h.id] || 0);
                          if (dx < 0) setSwipeState(s => ({ ...s, [h.id]: Math.max(dx, -80) }));
                        }}
                        onTouchEnd={() => {
                          const offset = swipeState[h.id] || 0;
                          if (offset < -60) {
                            doDeleteLog(h.id);
                            setSwipeState(s => ({ ...s, [h.id]: 0 }));
                          } else {
                            setSwipeState(s => ({ ...s, [h.id]: 0 }));
                          }
                        }}
                        style={{ display:"flex", alignItems:"center", gap:10,
                          background:"#1E1E35", borderRadius:12, padding:"10px 14px",
                          transform:`translateX(${offset}px)`,
                          transition: offset === 0 ? "transform 0.3s ease" : "none",
                          userSelect:"none" }}>
                        <div style={{ fontSize:18 }}>{h.chore_emoji}</div>
                        <div style={{ flex:1, fontSize:14, fontWeight:600 }}>{h.chore_name}</div>
                        <div style={{ fontSize:13, fontWeight:800,
                          color: h.is_penalty ? "#FF6B6B" : "#FFE66D" }}>
                          {h.is_penalty ? `-${h.points}` : `+${h.points}`}
                        </div>
                        <div style={{ fontSize:11, color:"#444" }}>
                          {formatLogDate(h.logged_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit chore modal */}
      {editingChore && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
          display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:1000 }}
          onClick={() => setEditingChore(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#1A1A2E", borderRadius:"24px 24px 0 0",
              padding:24, width:"100%", maxWidth:480 }}>
            <div style={{ fontSize:16, fontWeight:900, marginBottom:20 }}>✏️ Редактировать дело</div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <input value={editingChore.emoji}
                onChange={e => setEditingChore(c => ({ ...c, emoji: e.target.value }))}
                style={{ ...inputStyle, width:56, textAlign:"center", fontSize:22, padding:"10px 8px" }} />
              <input value={editingChore.name}
                onChange={e => setEditingChore(c => ({ ...c, name: e.target.value }))}
                placeholder="Название"
                style={{ ...inputStyle, flex:1, fontSize:14, padding:"10px 14px" }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
              <input type="number" value={editingChore.points} min={1} max={999}
                onChange={e => setEditingChore(c => ({ ...c, points: e.target.value }))}
                style={{ ...inputStyle, width:80, color:"#FFE66D", fontWeight:800,
                  fontSize:16, padding:"10px 12px" }} />
              <span style={{ fontSize:13, color:"#666" }}>очков</span>
            </div>
            <button onClick={doUpdateChore}
              style={{ width:"100%", padding:14, background:"#FFE66D", color:"#0F0F1A",
                border:"none", borderRadius:14, fontWeight:900, fontSize:15,
                cursor:"pointer", fontFamily:"inherit", marginBottom:10 }}>
              Сохранить
            </button>
            <button onClick={() => doDeleteChore(editingChore.id)}
              style={{ width:"100%", padding:14, background:"transparent", color:"#FF6B6B",
                border:"1px solid #FF6B6B33", borderRadius:14, fontWeight:800, fontSize:14,
                cursor:"pointer", fontFamily:"inherit" }}>
              🗑 Удалить это дело
            </button>
          </div>
        </div>
      )}

      {/* Penalty target picker */}
      {penaltyTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
          display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:1000 }}
          onClick={() => setPenaltyTarget(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#1A1A2E", borderRadius:"24px 24px 0 0",
              padding:24, width:"100%", maxWidth:480 }}>
            <div style={{ fontSize:16, fontWeight:900, marginBottom:4 }}>
              ⚠️ {penaltyTarget.name}
            </div>
            <div style={{ fontSize:13, color:"#666", marginBottom:20 }}>Кого штрафуем?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {members.map(m => (
                <button key={m.id} className="btn" onClick={() => doApplyPenalty(m.id)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
                    background:"#FF6B6B11", border:"1px solid #FF6B6B33", borderRadius:16,
                    cursor:"pointer", color:"#F0EEF6", fontFamily:"inherit" }}>
                  <div style={{ fontSize:28 }}>{m.avatar}</div>
                  <div style={{ flex:1, textAlign:"left" }}>
                    <div style={{ fontWeight:800 }}>{m.name}</div>
                    <div style={{ fontSize:12, color:m.color }}>{m.points} pts</div>
                  </div>
                  <div style={{ fontWeight:800, color:"#FF6B6B" }}>-{penaltyTarget.points} pts</div>
                </button>
              ))}
            </div>
            <button onClick={() => setPenaltyTarget(null)}
              style={{ width:"100%", marginTop:12, padding:14, background:"transparent",
                color:"#555", border:"none", borderRadius:14, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit" }}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}