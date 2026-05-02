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

// Safe localStorage wrapper for iOS standalone mode
const ls = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
  clear: () => { try { ls.clear() } catch {} },
}

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

      ls.set("token", res.token);
      ls.set("user_id", String(res.user_id));
      ls.set("family_id", String(res.family_id));
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

// ─── Stats Page ───────────────────────────────────────────────────────────────
function StatsPage({ members, myID }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  // compareID — участник для сравнения (null = никого)
  const [compareID, setCompareID] = useState(null);

  useEffect(() => {
    api.getStats().then(data => {
      setStats(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const periodLabel = { day: "День", week: "Неделя", month: "Месяц", all: "Всё время" };

  if (loading) return (
    <div style={{ position:"fixed", inset:0, background:"#0F0F1A", zIndex:400,
      display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12,
      fontFamily:"'Nunito',system-ui,sans-serif", paddingBottom:72 }}>
      <div style={{ fontSize:40, animation:"spin 1s linear infinite" }}>📊</div>
      <div style={{ fontSize:14, color:"#444", fontWeight:700 }}>Загружаем статистику…</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!stats || stats.length === 0) return (
    <div style={{ position:"fixed", inset:0, background:"#0F0F1A", zIndex:400,
      display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12,
      fontFamily:"'Nunito',system-ui,sans-serif", paddingBottom:72 }}>
      <div style={{ fontSize:48 }}>📭</div>
      <div style={{ fontSize:16, color:"#555", fontWeight:700 }}>Пока нет данных</div>
    </div>
  );

  const me = stats.find(m => m.id === myID);
  const them = compareID ? stats.find(m => m.id === compareID) : null;

  const sorted = [...stats].sort((a, b) => (b[period]?.points ?? 0) - (a[period]?.points ?? 0));
  const maxPts = Math.max(...sorted.map(m => m[period]?.points ?? 0), 1);

  // Локальные даты без смещения таймзоны
  const todayLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });

  // Карты активности
  const myActMap = {};
  (me?.activity || []).forEach(a => { myActMap[a.date] = a.points; });
  const themActMap = {};
  (them?.activity || []).forEach(a => { themActMap[a.date] = a.points; });

  // Максимум для гистограммы с учётом обоих участников
  const actMax = Math.max(
    ...last14.map(d => myActMap[d] ?? 0),
    ...last14.map(d => themActMap[d] ?? 0),
    1
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"#0F0F1A", zIndex:400,
      overflowY:"auto", fontFamily:"'Nunito',system-ui,sans-serif", paddingBottom:80 }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <div style={{ padding:"max(20px,env(safe-area-inset-top)) 20px 0" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"#666", textTransform:"uppercase", marginBottom:4 }}>
          Семейная
        </div>
        <div style={{ fontSize:22, fontWeight:900, color:"#F0EEF6", marginBottom:20 }}>
          📊 Статистика
        </div>

        {/* Period selector */}
        <div style={{ display:"flex", background:"#1E1E35", borderRadius:14, padding:4, marginBottom:24, gap:3 }}>
          {Object.entries(periodLabel).map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)}
              style={{ flex:1, padding:"9px 4px", border:"none", borderRadius:10, cursor:"pointer",
                fontFamily:"inherit", fontWeight:800, fontSize:11, transition:"all 0.2s",
                background: period === k ? "#FFE66D" : "transparent",
                color: period === k ? "#0F0F1A" : "#555" }}>
              {l}
            </button>
          ))}
        </div>

        {/* ── Рейтинг ── */}
        <div style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:2,
          textTransform:"uppercase", marginBottom:10 }}>
          Рейтинг — {periodLabel[period].toLowerCase()}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:28, animation:"fadeIn 0.3s ease" }}>
          {sorted.map((m, i) => {
            const pts = m[period]?.points ?? 0;
            const cnt = m[period]?.chores_done ?? 0;
            const pct = maxPts > 0 ? (pts / maxPts) * 100 : 0;
            const isMe = m.id === myID;
            const isCompared = m.id === compareID;
            const medals = ["🥇","🥈","🥉"];
            return (
              <div key={m.id}
                style={{ background: isMe ? `${m.color}18` : "#1E1E35",
                  border: isCompared ? `2px solid ${m.color}` : isMe ? `1px solid ${m.color}44` : "1px solid #2a2a3e",
                  borderRadius:18, padding:"14px 16px", transition:"all 0.2s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ fontSize:20, width:28, textAlign:"center" }}>
                    {medals[i] || <span style={{ fontSize:13, fontWeight:800, color:"#444" }}>#{i+1}</span>}
                  </div>
                  <div style={{ fontSize:26 }}>{m.avatar}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:14 }}>{m.name}{isMe ? " (я)" : ""}</div>
                    <div style={{ fontSize:11, color:"#555" }}>{cnt} {cnt === 1 ? "дело" : cnt < 5 ? "дела" : "дел"}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:900, fontSize:20,
                        color: pts > 0 ? m.color : pts < 0 ? "#FF6B6B" : "#444" }}>
                        {pts > 0 ? "+" : ""}{pts}
                      </div>
                      <div style={{ fontSize:10, color:"#555" }}>очков</div>
                    </div>
                    {/* Кнопка сравнения — только для чужих */}
                    {!isMe && (
                      <button
                        onClick={() => setCompareID(isCompared ? null : m.id)}
                        style={{ background: isCompared ? m.color : "#2a2a3e",
                          border:"none", borderRadius:10, padding:"6px 8px",
                          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                          flexShrink:0, transition:"all 0.2s" }}
                        title={isCompared ? "Убрать сравнение" : "Сравнить со мной"}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M8 7h12M8 12h8M8 17h4" stroke={isCompared ? "#0F0F1A" : "#888"}
                            strokeWidth="2.5" strokeLinecap="round"/>
                          <path d="M4 7l-2 2 2 2M4 17l-2-2 2-2" stroke={isCompared ? "#0F0F1A" : "#888"}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ background:"#0F0F1A", borderRadius:999, height:6, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:999,
                    width:`${Math.max(0, pct)}%`,
                    background:`linear-gradient(90deg,${m.color},${m.color}88)`,
                    transition:"width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Моя статистика (+ сравнение) ── */}
        {me && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:2, textTransform:"uppercase" }}>
                Моя статистика
              </div>
              {them && (
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background: me.color }} />
                  <span style={{ color:"#555" }}>Я</span>
                  <div style={{ width:8, height:8, borderRadius:"50%", background: them.color, marginLeft:4 }} />
                  <span style={{ color:"#555" }}>{them.name}</span>
                </div>
              )}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
              {[
                { label:"Сегодня",   periodKey:"day" },
                { label:"Неделя",    periodKey:"week" },
                { label:"Месяц",     periodKey:"month" },
                { label:"Всё время", periodKey:"all" },
              ].map(({ label, periodKey }) => {
                const myPts  = me[periodKey]?.points ?? 0;
                const myCnt  = me[periodKey]?.chores_done ?? 0;
                const thPts  = them?.[periodKey]?.points ?? null;
                const thCnt  = them?.[periodKey]?.chores_done ?? null;
                return (
                  <div key={label} style={{ background:"#1E1E35", borderRadius:16, padding:"14px 16px",
                    border:"1px solid #2a2a3e" }}>
                    <div style={{ fontSize:11, color:"#555", fontWeight:700, marginBottom:8 }}>{label.toUpperCase()}</div>
                    {/* Моя строка */}
                    <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom: them ? 6 : 0 }}>
                      {them && <div style={{ width:6, height:6, borderRadius:"50%", background: me.color, flexShrink:0, marginBottom:2 }} />}
                      <div style={{ fontSize:26, fontWeight:900, lineHeight:1,
                        color: myPts > 0 ? me.color : myPts < 0 ? "#FF6B6B" : "#666" }}>
                        {myPts > 0 ? "+" : ""}{myPts}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:"#666", marginBottom: them ? 8 : 0 }}>
                      {myCnt} {myCnt === 1 ? "дело" : myCnt < 5 ? "дела" : "дел"}
                    </div>
                    {/* Строка сравниваемого */}
                    {them && thPts !== null && (
                      <>
                        <div style={{ height:1, background:"#2a2a3e", marginBottom:8 }} />
                        <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:4 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background: them.color, flexShrink:0, marginBottom:2 }} />
                          <div style={{ fontSize:22, fontWeight:900, lineHeight:1,
                            color: thPts > 0 ? them.color : thPts < 0 ? "#FF6B6B" : "#555" }}>
                            {thPts > 0 ? "+" : ""}{thPts}
                          </div>
                        </div>
                        <div style={{ fontSize:11, color:"#555" }}>
                          {thCnt} {thCnt === 1 ? "дело" : thCnt < 5 ? "дела" : "дел"}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Гистограмма активности ── */}
            {(() => {
              return (
                <>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:2, textTransform:"uppercase" }}>
                      Активность — 14 дней
                    </div>
                    {them && (
                      <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:10, fontWeight:700 }}>
                        <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                          <span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background: me.color }} />
                          <span style={{ color:"#555" }}>Я</span>
                        </span>
                        <span style={{ display:"flex", alignItems:"center", gap:3 }}>
                          <span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background: them.color }} />
                          <span style={{ color:"#555" }}>{them.name}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ background:"#1E1E35", borderRadius:16, padding:"16px 12px",
                    border:"1px solid #2a2a3e", marginBottom:24 }}>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:80 }}>
                      {last14.map((date) => {
                        const myPts  = myActMap[date] ?? 0;
                        const thPts  = them ? (themActMap[date] ?? 0) : 0;
                        const myH    = myPts > 0 ? Math.max(6, (myPts / actMax) * 72) : 4;
                        const thH    = thPts > 0 ? Math.max(6, (thPts / actMax) * 72) : 0;
                        const isToday = date === todayLocal;
                        const [, , dayStr] = date.split('-');
                        const dayNum = parseInt(dayStr, 10);
                        return (
                          <div key={date} style={{ flex:1, display:"flex", flexDirection:"column",
                            alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                            {/* Наложенные столбики: them за моим */}
                            <div style={{ width:"100%", position:"relative", display:"flex",
                              alignItems:"flex-end", justifyContent:"center" }}>
                              {/* Столбик them (позади, чуть шире) */}
                              {them && thH > 0 && (
                                <div style={{ position:"absolute", bottom:0, left:0, right:0,
                                  height:thH, borderRadius:4,
                                  background:`linear-gradient(180deg,${them.color},${them.color}66)`,
                                  opacity:0.7 }} />
                              )}
                              {/* Столбик my (спереди) */}
                              <div style={{ position:"relative", width:"100%",
                                height: myPts > 0 ? myH : 4, borderRadius:4,
                                background: myPts > 0
                                  ? `linear-gradient(180deg,${me.color},${me.color}66)`
                                  : "#2a2a3e",
                                border: isToday ? `1px solid ${me.color}` : "none",
                                transition:"height 0.4s ease" }} />
                            </div>
                            <div style={{ fontSize:9, color: isToday ? me.color : "#444",
                              fontWeight: isToday ? 800 : 600 }}>
                              {dayNum}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* ── Топ дел ── */}
            {me.top_chores && me.top_chores.length > 0 && (
              <>
                <div style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:2,
                  textTransform:"uppercase", marginBottom:10 }}>
                  Любимые дела
                </div>
                <div style={{ background:"#1E1E35", borderRadius:16, padding:"4px 0",
                  border:"1px solid #2a2a3e", marginBottom:24 }}>
                  {me.top_chores.map((tc, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
                      padding:"12px 16px",
                      borderBottom: i < me.top_chores.length - 1 ? "1px solid #2a2a3e" : "none" }}>
                      <div style={{ fontSize:24 }}>{tc.emoji}</div>
                      <div style={{ flex:1, fontWeight:700, fontSize:14 }}>{tc.name}</div>
                      <div style={{ fontSize:12, color:"#888", fontWeight:800 }}>×{tc.count}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Блок "Сравнение с" ── */}
        {them && me && (
          <>
            <div style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:2,
              textTransform:"uppercase", marginBottom:10 }}>
              Сравнение с {them.name}
            </div>
            <div style={{ background:`${them.color}11`, borderRadius:16, padding:16,
              border:`1px solid ${them.color}33`, marginBottom:16, animation:"fadeIn 0.3s ease" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <div style={{ fontSize:32 }}>{them.avatar}</div>
                <div style={{ fontWeight:900, fontSize:17 }}>{them.name}</div>
                <button onClick={() => setCompareID(null)}
                  style={{ marginLeft:"auto", background:"#2a2a3e", border:"none", borderRadius:8,
                    padding:"4px 10px", cursor:"pointer", fontSize:11, fontWeight:700,
                    color:"#666", fontFamily:"inherit" }}>
                  Убрать ✕
                </button>
              </div>
              {[
                { label:"День",    myPts: me.day?.points ?? 0,   theirPts: them.day?.points ?? 0 },
                { label:"Неделя",  myPts: me.week?.points ?? 0,  theirPts: them.week?.points ?? 0 },
                { label:"Месяц",   myPts: me.month?.points ?? 0, theirPts: them.month?.points ?? 0 },
                { label:"Всё вр.", myPts: me.all?.points ?? 0,   theirPts: them.all?.points ?? 0 },
              ].map(({ label, myPts, theirPts }) => {
                const total = Math.max(myPts + theirPts, 1);
                const myPct = myPts / total * 100;
                const theirPct = theirPts / total * 100;
                const meWin = myPts >= theirPts;
                return (
                  <div key={label} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      fontSize:11, fontWeight:700, color:"#666", marginBottom:5 }}>
                      <span style={{ color: meWin ? me.color : "#555" }}>
                        Я: {myPts > 0 ? "+" : ""}{myPts}
                      </span>
                      <span style={{ color:"#666" }}>{label}</span>
                      <span style={{ color: !meWin ? them.color : "#555" }}>
                        {them.name}: {theirPts > 0 ? "+" : ""}{theirPts}
                      </span>
                    </div>
                    <div style={{ display:"flex", gap:2, borderRadius:999, overflow:"hidden", height:8 }}>
                      <div style={{ flex: myPct, background: me.color,
                        minWidth: myPts > 0 ? 4 : 0, transition:"flex 0.5s ease" }} />
                      <div style={{ flex: theirPct, background: them.color,
                        minWidth: theirPts > 0 ? 4 : 0, transition:"flex 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}

              {/* их топ дел */}
              {them.top_chores && them.top_chores.length > 0 && (
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:10, color:"#555", fontWeight:700, marginBottom:8 }}>
                    ЛЮБИМЫЕ ДЕЛА
                  </div>
                  {them.top_chores.map((tc, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
                      padding:"6px 0",
                      borderBottom: i < them.top_chores.length - 1 ? "1px solid #2a2a3e" : "none" }}>
                      <span style={{ fontSize:18 }}>{tc.emoji}</span>
                      <span style={{ flex:1, fontSize:13, fontWeight:700 }}>{tc.name}</span>
                      <span style={{ fontSize:11, color:"#888" }}>×{tc.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!them && stats.length > 1 && (
          <div style={{ fontSize:11, color:"#444", textAlign:"center", marginBottom:24 }}>
            Нажми ⇄ на участника, чтобы сравнить
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(!!ls.get("token"));
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [chores, setChores] = useState([]);
  const [activeMemberID, setActiveMemberID] = useState(null);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("home");
  const [activeTab, setActiveTab] = useState("chores");
  const [flash, setFlash] = useState(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPoints, setCustomPoints] = useState(10);
  const [customEmoji, setCustomEmoji] = useState("✨");
  const [addingPenalty, setAddingPenalty] = useState(false);
  const [penaltyName, setPenaltyName] = useState("");
  const [penaltyPoints, setPenaltyPoints] = useState(10);
  const [penaltyEmoji, setPenaltyEmoji] = useState("⚠️");
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editingChore, setEditingChore] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [swipeState, setSwipeState] = useState({});
  const swipeStart = useRef({});
  const [penaltyTarget, setPenaltyTarget] = useState(null);
  const [navTab, setNavTab] = useState("home");
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [profileColor, setProfileColor] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPoints, setQuickPoints] = useState(10);
  const [quickEmoji, setQuickEmoji] = useState("⚡");
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwForm, setPwForm] = useState({ old: "", new1: "", new2: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const myID = Number(ls.get("user_id"));

  const loadFamily = useCallback(async () => {
    try {
      const data = await api.getFamily();
      setFamily(data.family);
      setMembers(data.members);
      const sortedByID = [...data.members].sort((a,b) => a.id - b.id);
      setIsOwner(sortedByID[0]?.id === myID);
      if (!activeMemberID) setActiveMemberID(myID || data.members[0]?.id);
    } catch(e) {
      if (e.message === "unauthorized") { ls.clear(); setAuthed(false); }
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
  async function doAddPenalty() {
    if (!penaltyName.trim()) return;
    await api.addChore({ name: penaltyName, emoji: penaltyEmoji, points: Number(penaltyPoints), is_penalty: true });
    setPenaltyName(""); setPenaltyPoints(10); setPenaltyEmoji("⚠️");
    setAddingPenalty(false);
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

  async function doQuickLog() {
    if (!quickName.trim()) return;
    setLoading(true);
    try {
      await api.quickLog({ name: quickName, emoji: quickEmoji, points: Number(quickPoints) });
      setFlash({ points: quickPoints, name: quickName });
      setTimeout(() => setFlash(null), 1800);
      setQuickLogOpen(false);
      setQuickName(""); setQuickPoints(10); setQuickEmoji("⚡");
      await loadFamily();
      await loadHistory(activeMemberID);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function doDeleteLog(logID) {
    try {
      await api.deleteLog(logID);
      await loadFamily();
      await loadHistory(activeMemberID);
    } catch(e) { alert(e.message); }
  }

  async function doUpdateUser() {
    const me = members.find(m => m.id === myID);
    if (!me) return;
    const avatar = profileAvatar ?? me.avatar;
    const color  = profileColor  ?? me.color;
    try {
      await api.updateUser({ avatar, color });
      await loadFamily();
    } catch(e) { console.error(e); }
  }

  async function doChangePassword() {
    setPwError("");
    if (!pwForm.old || !pwForm.new1 || !pwForm.new2) {
      setPwError("Заполни все поля");
      return;
    }
    if (pwForm.new1 !== pwForm.new2) {
      setPwError("Новые пароли не совпадают");
      return;
    }
    if (pwForm.new1.length < 4) {
      setPwError("Минимум 4 символа");
      return;
    }
    try {
      await api.changePassword({ old_password: pwForm.old, new_password: pwForm.new1 });
      setPwSuccess(true);
      setPwForm({ old: "", new1: "", new2: "" });
      setTimeout(() => { setPwSuccess(false); setChangingPassword(false); }, 2000);
    } catch(e) {
      setPwError(e.message === "current password is incorrect" ? "Неверный текущий пароль" : e.message);
    }
  }

  function logout() {
    ls.clear();
    setAuthed(false);
  }

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

  const activeMember = members.find(m => m.id === activeMemberID);
  const sortedByPoints = [...members].sort((a,b) => b.points - a.points);
  const regularChores = chores.filter(c => !c.is_penalty);
  const penaltyChores = chores.filter(c => c.is_penalty);

  return (
    <div style={{ minHeight:"100vh", background:"#0F0F1A", fontFamily:"'Nunito',system-ui,sans-serif",
      color:"#F0EEF6", maxWidth:480, margin:"0 auto", position:"relative", paddingBottom:72 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
        @keyframes pop{0%{transform:scale(0.5) translateY(0);opacity:1}80%{transform:scale(1.2) translateY(-60px);opacity:1}100%{transform:scale(1) translateY(-80px);opacity:0}}
        .btn{transition:transform 0.1s,filter 0.15s;cursor:pointer} .btn:active{transform:scale(0.95)} .btn:hover{filter:brightness(1.1)}
        input{color:#F0EEF6}
        body{background:#0F0F1A}
        .header-safe{padding-top:max(20px, env(safe-area-inset-top))}
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
      <div className="header-safe" style={{ padding:"0 20px 0", background:"linear-gradient(180deg,#1A1A2E 0%,transparent 100%)" }}>
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
                border:"none", borderRadius:12, padding:"8px 10px",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M8 21H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h4v7zM15 21H9V10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11zM21 21h-4v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4z"
                  fill={view==="leaderboard"?"#0F0F1A":"#F0EEF6"}/>
                <path d="M12 2l1.5 4H17l-3 2 1 4-3-2-3 2 1-4-3-2h3.5L12 2z"
                  fill={view==="leaderboard"?"#0F0F1A":"#FFE66D"}/>
              </svg>
            </button>
            <button className="btn" onClick={() => setEditMode(e => !e)}
              style={{ background:editMode?"#FF6B6B":"#1E1E35",
                border:"none", borderRadius:12, padding:"8px 10px",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                  fill={editMode?"#fff":"#888"}/>
              </svg>
            </button>
          </div>
        </div>

        {/* Member tabs */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
          {members.map(m => (
            <div key={m.id} className="btn"
              onClick={() => { setActiveMemberID(m.id); setView("home"); setActiveTab(m.id === myID ? "chores" : "history"); }}
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

          {/* Tab bar — only on own profile */}
          {activeMemberID === myID && (
            <div style={{ display:"flex", background:"#1E1E35", borderRadius:16, padding:4, marginBottom:20, gap:4 }}>
              {[["chores", "Что сделал?"], ["history", "История"]].map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ flex:1, padding:"10px 0", borderRadius:12, border:"none", cursor:"pointer",
                    fontFamily:"inherit", fontWeight:700, fontSize:14, transition:"all 0.2s",
                    background: activeTab === tab ? activeMember.color : "transparent",
                    color: activeTab === tab ? "#0F0F1A" : "#666" }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Chores — own profile only */}
          {activeTab === "chores" && activeMemberID === myID && (
            <>
              {editMode && (
                <div style={{ fontSize:12, fontWeight:700, color:"#FF6B6B", letterSpacing:2,
                  textTransform:"uppercase", marginBottom:12 }}>
                  ✏️ Режим редактирования
                </div>
              )}

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
                      position:"relative", minHeight:72 }}>
                    <div style={{ fontSize:26, flexShrink:0 }}>{c.emoji}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, lineHeight:1.3,
                        overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2,
                        WebkitBoxOrient:"vertical" }}>{c.name}</div>
                      <div style={{ fontSize:11, fontWeight:800, color: editMode ? "#FF6B6B" : "#FFE66D", marginTop:2 }}>
                        {editMode ? "нажми для правки" : `+${c.points} pts`}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Разовое дело — всегда видимо */}
                {!editMode && (
                  <button className="btn" onClick={() => setQuickLogOpen(true)}
                    style={{ background:"linear-gradient(135deg,#FFE66D11,#1E1E35)",
                      border:"1px dashed #FFE66D55", borderRadius:18,
                      padding:"14px 12px", display:"flex", alignItems:"center", gap:10,
                      cursor:"pointer", color:"#F0EEF6", fontFamily:"inherit", minHeight:72 }}>
                    <div style={{ fontSize:26, flexShrink:0 }}>⚡</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>Разовое дело</div>
                      <div style={{ fontSize:11, color:"#FFE66D99", marginTop:2 }}>начислить очки</div>
                    </div>
                  </button>
                )}

                {editMode && (!addingCustom ? (
                  <button className="btn" onClick={() => setAddingCustom(true)}
                    style={{ background:"#1E1E35", border:"1px dashed #333", borderRadius:18,
                      padding:"14px 12px", display:"flex", alignItems:"center", gap:10,
                      cursor:"pointer", color:"#555", fontFamily:"inherit", minHeight:72 }}>
                    <div style={{ fontSize:26, flexShrink:0 }}>✨</div>
                    <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13, fontWeight:700 }}>Своё дело</div></div>
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
                ))}
              </div>

              {/* Штрафы */}
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
                        cursor:"pointer", textAlign:"left", color:"#F0EEF6", fontFamily:"inherit",
                        minHeight:72 }}>
                      <div style={{ fontSize:26, flexShrink:0 }}>{c.emoji}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, lineHeight:1.3,
                          overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2,
                          WebkitBoxOrient:"vertical" }}>{c.name}</div>
                        <div style={{ fontSize:11, fontWeight:800, color:"#FF6B6B", marginTop:2 }}>
                          {editMode ? "нажми для правки" : `-${c.points} pts`}
                        </div>
                      </div>
                    </button>
                  ))}

                  {editMode && (!addingPenalty ? (
                    <button className="btn" onClick={() => setAddingPenalty(true)}
                      style={{ background:"#FF6B6B08", border:"1px dashed #FF6B6B44", borderRadius:18,
                        padding:"14px 12px", display:"flex", alignItems:"center", gap:10,
                        cursor:"pointer", color:"#FF6B6B66", fontFamily:"inherit", minHeight:72 }}>
                      <div style={{ fontSize:26, flexShrink:0 }}>⚠️</div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13, fontWeight:700 }}>Своё штрафное</div></div>
                    </button>
                  ) : (
                    <div style={{ background:"#FF6B6B0D", border:"1px solid #FF6B6B33",
                      borderRadius:18, padding:12, gridColumn:"1 / -1" }}>
                      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                        <input value={penaltyEmoji} onChange={e => setPenaltyEmoji(e.target.value)}
                          style={{ background:"#0F0F1A", border:"1px solid #333", borderRadius:10, color:"#F0EEF6",
                            fontFamily:"inherit", width:50, textAlign:"center", fontSize:20, padding:"8px" }} />
                        <input value={penaltyName} onChange={e => setPenaltyName(e.target.value)}
                          placeholder="За что штраф..."
                          style={{ background:"#0F0F1A", border:"1px solid #333", borderRadius:10, color:"#F0EEF6",
                            fontFamily:"inherit", flex:1, fontSize:14, padding:"8px 12px" }} />
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <input type="number" value={penaltyPoints} onChange={e => setPenaltyPoints(e.target.value)}
                          min={1} max={100}
                          style={{ background:"#0F0F1A", border:"1px solid #333", borderRadius:10, color:"#FF6B6B",
                            fontFamily:"inherit", width:70, fontWeight:800, padding:"8px 10px", fontSize:14 }} />
                        <span style={{ fontSize:12, color:"#666" }}>pts</span>
                        <button onClick={doAddPenalty}
                          style={{ marginLeft:"auto", padding:"8px 16px", background:"#FF6B6B",
                            color:"#fff", border:"none", borderRadius:10,
                            fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>Добавить</button>
                        <button onClick={() => setAddingPenalty(false)}
                          style={{ padding:"8px 12px", background:"transparent", color:"#555",
                            border:"none", borderRadius:10, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            </>
          )}

          {/* History */}
          {activeTab === "history" && history.length === 0 && (
            <div style={{ textAlign:"center", color:"#444", fontSize:14, padding:"40px 0" }}>
              Пока нет записей
            </div>
          )}
          {activeTab === "history" && history.length > 0 && (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {history.slice(0, 10).map(h => {
                  const isMine = activeMemberID === myID;
                  const offset = isMine ? (swipeState[h.id] || 0) : 0;
                  return (
                    <div key={h.id} style={{ position:"relative", overflow:"hidden", borderRadius:12 }}>
                      {isMine && (
                        <div style={{ position:"absolute", inset:0, background:"#FF6B6B22",
                          display:"flex", alignItems:"center", justifyContent:"flex-end",
                          paddingRight:16, borderRadius:12 }}>
                          <span style={{ fontSize:16 }}>🗑</span>
                        </div>
                      )}
                      <div
                        onTouchStart={isMine ? (e => { swipeStart.current[h.id] = e.touches[0].clientX; }) : undefined}
                        onTouchMove={isMine ? (e => {
                          const dx = e.touches[0].clientX - (swipeStart.current[h.id] || 0);
                          if (dx < 0) setSwipeState(s => ({ ...s, [h.id]: Math.max(dx, -80) }));
                        }) : undefined}
                        onTouchEnd={isMine ? (() => {
                          const offset = swipeState[h.id] || 0;
                          if (offset < -60) {
                            doDeleteLog(h.id);
                            setSwipeState(s => ({ ...s, [h.id]: 0 }));
                          } else {
                            setSwipeState(s => ({ ...s, [h.id]: 0 }));
                          }
                        }) : undefined}
                        style={{ display:"flex", alignItems:"center", gap:12,
                          background:"#1E1E35", borderRadius:12, padding:"12px 14px",
                          transform:`translateX(${offset}px)`,
                          transition: offset === 0 ? "transform 0.3s ease" : "none",
                          userSelect:"none" }}>
                        <div style={{ fontSize:22, flexShrink:0 }}>{h.chore_emoji}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:700, lineHeight:1.3 }}>{h.chore_name}</div>
                          <div style={{ fontSize:11, color:"#444", marginTop:3 }}>{formatLogDate(h.logged_at)}</div>
                        </div>
                        <div style={{ fontSize:15, fontWeight:900, flexShrink:0,
                          color: h.is_penalty ? "#FF6B6B" : "#FFE66D" }}>
                          {h.is_penalty ? `-${h.points}` : `+${h.points}`}
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

      {/* Quick log modal */}
      {quickLogOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
          display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:1000 }}
          onClick={() => setQuickLogOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#1A1A2E", borderRadius:"24px 24px 0 0",
              padding:24, width:"100%", maxWidth:480 }}>
            <div style={{ fontSize:16, fontWeight:900, marginBottom:6 }}>⚡ Разовое дело</div>
            <div style={{ fontSize:13, color:"#666", marginBottom:20 }}>
              Начислит очки без добавления в список дел
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <input value={quickEmoji} onChange={e => setQuickEmoji(e.target.value)}
                style={{ ...inputStyle, width:56, textAlign:"center", fontSize:22, padding:"10px 8px" }} />
              <input value={quickName} onChange={e => setQuickName(e.target.value)}
                placeholder="Что сделал..."
                style={{ ...inputStyle, flex:1, fontSize:14, padding:"10px 14px" }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
              <input type="number" value={quickPoints} min={1} max={999}
                onChange={e => setQuickPoints(e.target.value)}
                style={{ ...inputStyle, width:80, color:"#FFE66D", fontWeight:800,
                  fontSize:16, padding:"10px 12px" }} />
              <span style={{ fontSize:13, color:"#666" }}>очков</span>
            </div>
            <button onClick={doQuickLog} disabled={loading || !quickName.trim()}
              style={{ width:"100%", padding:14,
                background: (!quickName.trim() || loading) ? "#333" : "#FFE66D",
                color: (!quickName.trim() || loading) ? "#666" : "#0F0F1A",
                border:"none", borderRadius:14, fontWeight:900, fontSize:15,
                cursor: (!quickName.trim() || loading) ? "not-allowed" : "pointer",
                fontFamily:"inherit", marginBottom:10 }}>
              {loading ? "..." : "⚡ Начислить очки"}
            </button>
            <button onClick={() => setQuickLogOpen(false)}
              style={{ width:"100%", padding:14, background:"transparent", color:"#555",
                border:"none", borderRadius:14, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit" }}>
              Отмена
            </button>
          </div>
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

      {/* Bottom Tab Bar */}
      {/* Bottom Tab Bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0,
        background:"#12121F", borderTop:"1px solid #1E1E35", display:"flex", zIndex:500,
        paddingBottom:"env(safe-area-inset-bottom)" }}>
        {[
          { id:"home", label:"Главная", icon: (c) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V10.5Z" fill={c}/>
            </svg>
          )},
          { id:"stats", label:"Статистика", icon: (c) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="12" width="4" height="9" rx="1" fill={c}/>
              <rect x="10" y="7" width="4" height="14" rx="1" fill={c}/>
              <rect x="17" y="3" width="4" height="18" rx="1" fill={c}/>
            </svg>
          )},
          { id:"settings", label:"Настройки", icon: (c) => (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill={c}/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )},
        ].map(({ id, label, icon }) => {
          const color = navTab === id ? "#FFE66D" : "#444";
          return (
            <button key={id} onClick={() => setNavTab(id)}
              style={{ flex:1, position:"relative", display:"flex", flexDirection:"column",
                alignItems:"center", gap:3, padding:"10px 4px 8px",
                border:"none", background:"transparent", cursor:"pointer",
                fontFamily:"inherit", transition:"color 0.2s" }}>
              {navTab === id && (
                <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
                  width:32, height:2, background:"#FFE66D", borderRadius:"0 0 2px 2px" }} />
              )}
              {icon(color)}
              <div style={{ fontSize:10, fontWeight:700, color }}>{label}</div>
            </button>
          );
        })}
      </div>

      {/* Stub pages */}
      {navTab === "stats" && (
        <StatsPage members={members} myID={myID} />
      )}
      {navTab === "settings" && (
        <div style={{ position:"fixed", inset:0, background:"#0F0F1A", zIndex:400,
          overflowY:"auto", fontFamily:"'Nunito',system-ui,sans-serif", paddingBottom:72 }}>
          <div style={{ padding:"24px 20px 32px" }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"#666",
              textTransform:"uppercase", marginBottom:4 }}>Настройки</div>
            <div style={{ fontSize:22, fontWeight:900, color:"#F0EEF6", marginBottom:24 }}>
              {family ? family.name : "Семья"}
            </div>

            {/* Invite code */}
            {family && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:2,
                  textTransform:"uppercase", marginBottom:8 }}>Инвайт-код</div>
                <div style={{ background:"#1E1E35", borderRadius:16, padding:"16px 18px" }}>
                  <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>
                    Поделись кодом, чтобы кто-то вступил в семью
                  </div>
                  <div className="btn" onClick={() => {
                      try {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(family.invite_code);
                        } else {
                          const el = document.createElement("textarea");
                          el.value = family.invite_code;
                          el.style.position = "fixed"; el.style.opacity = "0";
                          document.body.appendChild(el);
                          el.focus(); el.select();
                          document.execCommand("copy");
                          document.body.removeChild(el);
                        }
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch(e) { console.error("copy failed", e); }
                    }}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      cursor:"pointer" }}>
                    <div style={{ fontSize:30, fontWeight:900, letterSpacing:5, color:"#4ECDC4" }}>
                      {family.invite_code}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6,
                      color: copied ? "#4ECDC4" : "#555", fontSize:12, fontWeight:700,
                      transition:"color 0.2s" }}>
                      {copied ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="#4ECDC4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <rect x="9" y="9" width="13" height="13" rx="2" stroke="#555" strokeWidth="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="#555" strokeWidth="2"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile */}
            {(() => {
              const me = members.find(m => m.id === myID);
              if (!me) return null;
              const curAvatar = profileAvatar ?? me.avatar;
              const curColor  = profileColor  ?? me.color;
              const dirty = curAvatar !== me.avatar || curColor !== me.color;
              return (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:2,
                    textTransform:"uppercase", marginBottom:8 }}>Мой профиль</div>
                  <div style={{ background:"#1E1E35", borderRadius:16, padding:"16px 18px" }}>
                    {/* Preview */}
                    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                      <div style={{ fontSize:44, lineHeight:1,
                        background: curColor+"22", borderRadius:16, padding:10,
                        border: `2px solid ${curColor}` }}>{curAvatar}</div>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15 }}>{me.name}</div>
                        <div style={{ fontSize:12, color:curColor, fontWeight:700 }}>{me.points} pts</div>
                      </div>
                    </div>
                    {!editingProfile ? (
                      <button className="btn" onClick={() => setEditingProfile(true)}
                        style={{ width:"100%", padding:"9px 0", background:"#12121F",
                          border:"1px solid #2a2a3e", borderRadius:12, fontWeight:700,
                          fontSize:13, color:"#888", cursor:"pointer", fontFamily:"inherit" }}>
                        Изменить
                      </button>
                    ) : (
                      <>
                        {/* Avatar picker */}
                        <div style={{ fontSize:11, fontWeight:700, color:"#555", marginBottom:8 }}>Аватар</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
                          {AVATARS.map(a => (
                            <div key={a} onClick={() => setProfileAvatar(a)}
                              style={{ fontSize:26, padding:6, borderRadius:10, cursor:"pointer",
                                background: curAvatar===a ? curColor+"33" : "#12121F",
                                border: curAvatar===a ? `2px solid ${curColor}` : "2px solid transparent",
                                transition:"all 0.15s" }}>{a}</div>
                          ))}
                        </div>
                        {/* Color picker */}
                        <div style={{ fontSize:11, fontWeight:700, color:"#555", marginBottom:8 }}>Цвет</div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                          {COLORS.map(c => (
                            <div key={c} onClick={() => setProfileColor(c)}
                              style={{ width:28, height:28, borderRadius:"50%", background:c,
                                cursor:"pointer", border: curColor===c ? "3px solid #F0EEF6" : "3px solid transparent",
                                boxShadow: curColor===c ? `0 0 0 2px ${c}` : "none",
                                transition:"all 0.15s" }} />
                          ))}
                        </div>
                        <div style={{ display:"flex", gap:8 }}>
                          <button className="btn" onClick={() => { setEditingProfile(false); setProfileAvatar(null); setProfileColor(null); }}
                            style={{ flex:1, padding:"9px 0", background:"transparent",
                              border:"1px solid #2a2a3e", borderRadius:12, fontWeight:700,
                              fontSize:13, color:"#555", cursor:"pointer", fontFamily:"inherit" }}>
                            Отмена
                          </button>
                          <button className="btn" onClick={async () => { await doUpdateUser(); setProfileAvatar(null); setProfileColor(null); setEditingProfile(false); }}
                            style={{ flex:2, padding:"9px 0", background: dirty ? "#FFE66D" : "#2a2a3e",
                              border:"none", borderRadius:12, fontWeight:900,
                              fontSize:13, color: dirty ? "#0F0F1A" : "#555",
                              cursor: dirty ? "pointer" : "default", fontFamily:"inherit" }}>
                            Сохранить
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Change password */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:2,
                textTransform:"uppercase", marginBottom:8 }}>Сменить пароль</div>
              <div style={{ background:"#1E1E35", borderRadius:16, padding:"16px 18px" }}>
                {!changingPassword ? (
                  <button className="btn" onClick={() => { setChangingPassword(true); setPwError(""); setPwSuccess(false); }}
                    style={{ width:"100%", padding:"9px 0", background:"#12121F",
                      border:"1px solid #2a2a3e", borderRadius:12, fontWeight:700,
                      fontSize:13, color:"#888", cursor:"pointer", fontFamily:"inherit" }}>
                    Изменить пароль
                  </button>
                ) : pwSuccess ? (
                  <div style={{ textAlign:"center", padding:"8px 0", color:"#4ECDC4", fontWeight:800, fontSize:14 }}>
                    ✓ Пароль успешно изменён
                  </div>
                ) : (
                  <>
                    <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
                      <input
                        type="password"
                        placeholder="Текущий пароль"
                        value={pwForm.old}
                        onChange={e => setPwForm(f => ({ ...f, old: e.target.value }))}
                        style={{ ...inputStyle, fontSize:14, padding:"10px 14px" }}
                      />
                      <input
                        type="password"
                        placeholder="Новый пароль"
                        value={pwForm.new1}
                        onChange={e => setPwForm(f => ({ ...f, new1: e.target.value }))}
                        style={{ ...inputStyle, fontSize:14, padding:"10px 14px" }}
                      />
                      <input
                        type="password"
                        placeholder="Повтори новый пароль"
                        value={pwForm.new2}
                        onChange={e => setPwForm(f => ({ ...f, new2: e.target.value }))}
                        style={{ ...inputStyle, fontSize:14, padding:"10px 14px" }}
                      />
                    </div>
                    {pwError && (
                      <div style={{ color:"#FF6B6B", fontSize:12, fontWeight:700, marginBottom:10 }}>
                        {pwError}
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn"
                        onClick={() => { setChangingPassword(false); setPwForm({ old:"", new1:"", new2:"" }); setPwError(""); }}
                        style={{ flex:1, padding:"9px 0", background:"transparent",
                          border:"1px solid #2a2a3e", borderRadius:12, fontWeight:700,
                          fontSize:13, color:"#555", cursor:"pointer", fontFamily:"inherit" }}>
                        Отмена
                      </button>
                      <button className="btn" onClick={doChangePassword}
                        style={{ flex:2, padding:"9px 0", background:"#FFE66D",
                          border:"none", borderRadius:12, fontWeight:900,
                          fontSize:13, color:"#0F0F1A", cursor:"pointer", fontFamily:"inherit" }}>
                        Сохранить
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Reset */}
            {isOwner && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#666", letterSpacing:2,
                  textTransform:"uppercase", marginBottom:8 }}>Опасная зона</div>
                <button className="btn" onClick={doResetFamily}
                  style={{ width:"100%", background:"#FF6B6B11", border:"1px solid #FF6B6B33",
                    borderRadius:16, padding:"16px 18px", display:"flex", alignItems:"center",
                    gap:14, cursor:"pointer", fontFamily:"inherit", color:"#F0EEF6", textAlign:"left" }}>
                  <div style={{ background:"#FF6B6B22", borderRadius:10, padding:8, flexShrink:0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24L13 11h7V4l-2.35 2.35z"
                        fill="#FF6B6B"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800, color:"#FF6B6B" }}>Обнулить очки</div>
                    <div style={{ fontSize:11, color:"#666", marginTop:2 }}>Сбросить очки всех участников</div>
                  </div>
                </button>
              </div>
            )}

            {/* Logout */}
            <div style={{ marginBottom:12 }}>
              <button className="btn" onClick={logout}
                style={{ width:"100%", background:"#1E1E35", border:"1px solid #2a2a3e",
                  borderRadius:16, padding:"16px 18px", display:"flex", alignItems:"center",
                  gap:14, cursor:"pointer", fontFamily:"inherit", color:"#F0EEF6", textAlign:"left" }}>
                <div style={{ background:"#2a2a3e", borderRadius:10, padding:8, flexShrink:0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" fill="#888"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800 }}>Выйти</div>
                  <div style={{ fontSize:11, color:"#555", marginTop:2 }}>Вернуться на экран входа</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}