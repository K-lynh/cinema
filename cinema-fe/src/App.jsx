import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
//  API — tất cả qua Gateway :8080 với JWT Bearer token
// ═══════════════════════════════════════════════════════════════
const GW = "http://localhost:8080";

function getToken() { return localStorage.getItem("cinema_token") || ""; }
function saveAuth(token, user) {
  localStorage.setItem("cinema_token", token);
  localStorage.setItem("cinema_user", JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem("cinema_token");
  localStorage.removeItem("cinema_user");
}
function loadUser() {
  try { return JSON.parse(localStorage.getItem("cinema_user")); } catch { return null; }
}

const authHeader = () => ({ "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" });

async function apiGet(path) {
  const r = await fetch(GW + path, { headers: authHeader() });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function apiPost(path, body) {
  const r = await fetch(GW + path, { method: "POST", headers: authHeader(), body: JSON.stringify(body) });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(errText || r.status);
  }

  const text = await r.text();
  try {
    return JSON.parse(text); // Cố gắng parse JSON
  } catch (e) {
    return text; // Nếu lỗi (vì là chuỗi text trần như "FE36F77C"), thì trả về nguyên chuỗi text
  }
}
async function apiPostForm(path, fd) {
  const h = { "Authorization": `Bearer ${getToken()}` };
  const r = await fetch(GW + path, { method: "POST", headers: h, body: fd });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function apiPut(path, body) {
  const r = await fetch(GW + path, { method: "PUT", headers: authHeader(), body: JSON.stringify(body) });
  if (!r.ok) { const errText = await r.text(); throw new Error(errText || r.status); }
  const text = await r.text();
  try { return JSON.parse(text); } catch (e) { return text; }
}

async function apiPutForm(path, fd) {
  const h = { "Authorization": `Bearer ${getToken()}` };
  const r = await fetch(GW + path, { method: "PUT", headers: h, body: fd });
  if (!r.ok) { const errText = await r.text(); throw new Error(errText || r.status); }
  const text = await r.text();
  try { return JSON.parse(text); } catch (e) { return text; }
}

// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════
const fmt = n => Number(n || 0).toLocaleString("vi-VN") + "đ";

// LocalTime từ backend: [H,M,S] | "09:30:00" | "09:30"
const fmtTime = v => {
  if (!v) return "--:--";
  if (Array.isArray(v)) return `${String(v[0]).padStart(2, "0")}:${String(v[1]).padStart(2, "0")}`;
  return String(v).slice(0, 5);
};

// LocalDate từ backend: [Y,M,D] | "2024-12-25"
const fmtDate = v => {
  if (!v) return "";
  if (Array.isArray(v)) return `${v[0]}-${String(v[1]).padStart(2, "0")}-${String(v[2]).padStart(2, "0")}`;
  return String(v).slice(0, 10);
};

const next3Days = () => Array.from({ length: 3 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() + i);
  return {
    val: d.toISOString().slice(0, 10),
    label: i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai"
      : d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" })
  };
});

const SEAT_PRICE = { standard: 80000, vip: 120000, couple: 200000 };
const ROWS = "ABCDEFGH".split("");

function genSeats(capacity = 60, booked = []) {
  const cols = Math.ceil(capacity / ROWS.length);
  return ROWS.flatMap(r => Array.from({ length: cols }, (_, i) => {
    const num = i + 1, id = `${r}${num}`;
    const type = r >= "G" ? "couple" : r >= "D" ? "vip" : "standard";
    return { id, row: r, num, type, taken: booked.includes(id), selected: false };
  }));
}

// ═══════════════════════════════════════════════════════════════
//  CSS / DESIGN SYSTEM (NÂNG CẤP PREMIUM)
// ═══════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,500;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:   #06060c; /* Đen sâu hơn */
  --bg2:  #11111a; 
  --bg3:  #1a1a2e;
  --brd:  rgba(255,255,255,.08); 
  --gold: #dfa65b; /* Vàng sáng và sang hơn */
  --gold-glow: rgba(223, 166, 91, 0.3);
  --aqua: #4ecdc4; --red: #e63946;
  --txt:  #f8f9fa; --txt2: #adb5bd; --dim: #495057;
  --ff:   'Cormorant', Georgia, serif;
  --fb:   'DM Sans', system-ui, sans-serif;
}

html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--txt); font-family: var(--fb); font-size: 15px; line-height: 1.6; min-height: 100vh; overflow-x: hidden; }
button { cursor: pointer; border: none; background: none; font-family: var(--fb); }
input, select, textarea { font-family: var(--fb); }
img { display: block; }

/* Scrollbar tinh tế hơn */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--dim); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: var(--gold); }

/* Utility Classes */
.glass { background: rgba(17, 17, 26, 0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--brd); }
.gold-text { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

@keyframes slideInRight { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 var(--gold-glow); } 70% { box-shadow: 0 0 15px 10px rgba(223,166,91,0); } 100% { box-shadow: 0 0 0 0 rgba(223,166,91,0); } }

.fu  { animation: up .5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.fu2 { animation: up .5s cubic-bezier(0.16, 1, 0.3, 1) .1s forwards; opacity: 0; }
.fu3 { animation: up .5s cubic-bezier(0.16, 1, 0.3, 1) .2s forwards; opacity: 0; }
.spin { display: inline-block; animation: spin .8s linear infinite; }
`;

// ═══════════════════════════════════════════════════════════════
//  ATOMS
// ═══════════════════════════════════════════════════════════════
function Btn({ children, variant = "primary", size = "md", onClick, disabled, full, style = {} }) {
  const sz = { sm: { padding: "6px 14px", fontSize: 12 }, md: { padding: "10px 22px", fontSize: 14 }, lg: { padding: "13px 32px", fontSize: 15 } }[size];
  const vr = {
    primary: { background: "var(--gold)", color: "#080810", borderColor: "var(--gold)" },
    outline: { background: "transparent", color: "var(--gold)", borderColor: "var(--gold)" },
    ghost: { background: "rgba(255,255,255,.05)", color: "var(--txt)", borderColor: "var(--brd)" },
    aqua: { background: "var(--aqua)", color: "#080810", borderColor: "var(--aqua)" },
    danger: { background: "var(--red)", color: "#fff", borderColor: "var(--red)" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 7, fontFamily: "var(--fb)", fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, border: "1px solid transparent", transition: "all .18s", width: full ? "100%" : "auto", ...sz, ...vr, ...style }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.filter = "brightness(1.12)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { e.currentTarget.style.filter = ""; e.currentTarget.style.transform = ""; }}>
      {children}
    </button>
  );
}

const Badge = ({ children, color = "var(--gold)" }) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, letterSpacing: .4, background: `${color}22`, color, border: `1px solid ${color}44` }}>{children}</span>
);

const Stars = ({ v = 0 }) => (
  <span style={{ color: "var(--gold)", fontSize: 12 }}>
    {"★".repeat(Math.min(Math.round(v / 2), 5))}{"☆".repeat(Math.max(0, 5 - Math.round(v / 2)))}
    <span style={{ color: "var(--txt2)", marginLeft: 4 }}>{v}</span>
  </span>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 14, ...style }}>{children}</div>
);

function Field({ label, name, type = "text", placeholder, required, value, onChange, style = {} }) {
  return (
    <div style={{ marginBottom: 13 }}>
      {label && <div style={{ fontSize: 11, color: "var(--txt2)", letterSpacing: .6, textTransform: "uppercase", marginBottom: 5 }}>{label}</div>}
      <input name={name} type={type} placeholder={placeholder} required={required} value={value} onChange={onChange}
        style={{ width: "100%", padding: "10px 13px", borderRadius: 7, background: "var(--bg3)", border: "1px solid var(--brd)", color: "var(--txt)", fontSize: 14, outline: "none", ...style }}
        onFocus={e => e.target.style.borderColor = "var(--gold)"}
        onBlur={e => e.target.style.borderColor = "var(--brd)"} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MOVIE CARD — dùng MovieCardResponse: {id,title,genre,releaseYear,rating,posterUrl,actorNames[]}
// ═══════════════════════════════════════════════════════════════
function MovieCard({ movie, onClick, compact }) {
  const [hov, setHov] = useState(false);
  const poster = movie.posterUrl || `https://picsum.photos/seed/mv${movie.id || movie.title}/300/450`;
  return (
    <div onClick={() => onClick && onClick(movie)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ cursor: onClick ? "pointer" : "default", borderRadius: 12, overflow: "hidden", background: "var(--bg2)", border: "1px solid var(--brd)", transition: "all .27s", transform: hov && onClick ? "translateY(-6px)" : "none", boxShadow: hov && onClick ? "0 20px 50px rgba(0,0,0,.65)" : "none" }}>
      <div style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden" }}>
        <img src={poster} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s", transform: hov && onClick ? "scale(1.07)" : "scale(1)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(8,8,16,.92) 28%,transparent 70%)" }} />
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <Badge color={movie.status === "showing" ? "var(--aqua)" : "var(--gold)"}>
            {movie.status === "showing" ? "Đang chiếu" : movie.status === "coming" ? "Sắp chiếu" : ""}
          </Badge>
        </div>
        {hov && onClick && (
          <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center" }}>
            <Btn size="sm">Đặt vé ngay</Btn>
          </div>
        )}
      </div>
      <div style={{ padding: compact ? "9px 11px" : "12px 14px" }}>
        <div style={{ fontFamily: "var(--ff)", fontWeight: 500, fontSize: compact ? 13 : 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>{movie.title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--txt2)" }}>{movie.genre}</span>
          <Stars v={movie.rating} />
        </div>
        {!compact && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 3 }}>{movie.releaseYear || movie.year}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  NAVBAR (CÓ TÍCH HỢP NÚT BACK GÓC TRÁI)
// ═══════════════════════════════════════════════════════════════
function Navbar({ page, setPage, user, setUser, canGoBack, goBack }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 60, padding: "0 5vw", display: "flex", alignItems: "center", justifyContent: "space-between", background: scrolled ? "rgba(6,6,12,.94)" : "transparent", backdropFilter: scrolled ? "blur(18px)" : "none", borderBottom: scrolled ? "1px solid var(--brd)" : "none", transition: "all .3s" }}>

      {/* KHU VỰC LOGO & NÚT QUAY LẠI */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div onClick={() => setPage("home")} style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 24, fontWeight: 700, color: "var(--gold)", cursor: "pointer", letterSpacing: 1 }}>◈ CINÉ</div>

        {canGoBack && (
          <button
            onClick={goBack} title="Quay lại trang trước"
            style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid var(--brd)", color: "var(--txt)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", fontSize: 16 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "var(--gold)"; e.currentTarget.style.borderColor = "var(--gold)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--txt)"; e.currentTarget.style.borderColor = "var(--brd)"; }}
          >
            ←
          </button>
        )}

      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {[["home", "Trang chủ"], ["search", "Tìm kiếm AI"], ["admin", "Admin"], ["scanner", "Soát vé"]].map(([k, l]) => (
          <button key={k} onClick={() => setPage(k)} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", transition: "all .2s", color: page === k ? "var(--gold)" : "var(--txt2)", background: page === k ? "rgba(201,145,74,.12)" : "transparent" }}>{l}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setPage("profile")}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,var(--gold),#7a4a1a)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, color: "#080810" }}>{(user.name || "U")[0].toUpperCase()}</div>
            <span style={{ fontSize: 13 }}>{user.name}</span>
          </div>
        ) : (
          <Btn size="sm" onClick={() => setPage("login")}>Đăng nhập</Btn>
        )}
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HOME PAGE (NÂNG CẤP PREMIUM)
// ═══════════════════════════════════════════════════════════════
function HomePage({ onSelect }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiGet("/api/movies")
      .then(d => setMovies(Array.isArray(d) ? d : []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (movies.length < 2) return;
    const t = setInterval(() => setHeroIdx(i => (i + 1) % Math.min(movies.length, 5)), 6000);
    return () => clearInterval(t);
  }, [movies.length]);

  const showing = movies;
  const coming = [];
  const hero = showing[heroIdx % Math.max(showing.length, 1)];

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Hero Section - Full Viewport Height */}
      {hero && (
        <div style={{ position: "relative", height: "100vh", minHeight: 600, width: "100vw", overflow: "hidden", left: "50%", right: "50%", marginLeft: "-50vw", marginRight: "-50vw" }}>
          {/* Background Image with Vignette effect */}
          <div style={{ position: "absolute", inset: 0 }}>
            <img src={hero.posterUrl || `https://picsum.photos/seed/h${hero.id}/1920/1080`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.05)", transition: "all 1.5s ease-out", filter: "brightness(0.6)" }} />
            {/* Gradient Mask: Đen dần về phía dưới để nối với body */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--bg) 0%, transparent 60%, rgba(6,6,12,0.6) 100%)" }} />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at right, transparent 0%, var(--bg) 120%)" }} />
          </div>

          <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 6vw 100px", maxWidth: 1200, margin: "0 auto" }}>
            <div className="fu" style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <Badge color="var(--aqua)">Đang thịnh hành</Badge>
              {hero.genre && <Badge>{hero.genre}</Badge>}
            </div>

            <h1 className="fu2 gold-text" style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 700, lineHeight: 1, marginBottom: 20, textShadow: "0 10px 30px rgba(0,0,0,0.8)" }}>
              {hero.title}
            </h1>

            <div className="fu2" style={{ display: "flex", gap: 20, color: "var(--txt)", fontSize: 15, marginBottom: 24, fontWeight: 500, textShadow: "0 2px 10px rgba(0,0,0,0.8)", flexWrap: "wrap" }}>
              {hero.rating && <Stars v={hero.rating} />}
              {hero.duration && <span>⏱ {hero.duration}</span>}
              {hero.director && <span>🎬 {hero.director}</span>}
              {hero.year && <span>📅 {hero.year}</span>}
            </div>

            {hero.description && <p className="fu3" style={{ maxWidth: 600, color: "rgba(255,255,255,.8)", lineHeight: 1.7, marginBottom: 36, fontSize: 15, textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>{hero.description.slice(0, 160)}{hero.description.length > 160 ? "..." : ""}</p>}

            <div className="fu3" style={{ display: "flex", gap: 16 }}>
              <Btn size="lg" onClick={() => onSelect(hero)} style={{ padding: "16px 40px", fontSize: 16, borderRadius: 30, animation: "pulseGlow 2s infinite" }}>🎬 Đặt vé ngay</Btn>
              <Btn size="lg" variant="ghost" onClick={() => onSelect(hero)} style={{ padding: "16px 40px", fontSize: 16, borderRadius: 30, backdropFilter: "blur(10px)", background: "rgba(255,255,255,0.1)" }}>Chi tiết</Btn>
            </div>
          </div>

          {/* Carousel thumbnails */}
          {showing.length > 1 && (
            <div style={{ position: "absolute", bottom: 40, right: "6vw", display: "flex", gap: 12, zIndex: 2 }}>
              {showing.slice(0, 5).map((m, i) => (
                <div key={m.id} onClick={() => setHeroIdx(i)} style={{ width: i === heroIdx ? 90 : 60, height: i === heroIdx ? 135 : 90, borderRadius: 12, overflow: "hidden", cursor: "pointer", border: `2px solid ${i === heroIdx ? "var(--gold)" : "transparent"}`, opacity: i === heroIdx ? 1 : 0.5, transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: "0 10px 20px rgba(0,0,0,0.5)", transformOrigin: "bottom" }}>
                  <img src={m.posterUrl || `https://picsum.photos/seed/th${m.id}/200/300`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Danh sách phim */}
      <div style={{ padding: "80px 5vw 0", maxWidth: 1400, margin: "0 auto" }}>
        {err && <div style={{ color: "var(--txt2)", textAlign: "center", padding: "40px 0" }}>⚠️ Lỗi kết nối: {err}</div>}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 24 }}>
            {Array(10).fill(0).map((_, i) => <div key={i} className="skel" style={{ aspectRatio: "2/3", borderRadius: 16 }} />)}
          </div>
        ) : (
          <>
            {showing.length > 0 && <Section title="Phim Đang Chiếu" movies={showing} onSelect={onSelect} />}
            {coming.length > 0 && <Section title="Sắp Chiếu" movies={coming} onSelect={onSelect} style={{ marginTop: 60 }} />}
          </>
        )}
      </div>
    </div>
  );
}

// KHÔNG ĐƯỢC XÓA HÀM NÀY - HÀM RENDER TỪNG SECTION PHIM
function Section({ title, movies, onSelect, style = {} }) {
  return (
    <div style={style}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <h2 className="gold-text" style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 32, fontWeight: 700, whiteSpace: "nowrap", margin: 0 }}>{title}</h2>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--gold) 0%, transparent 100%)", opacity: 0.3 }} />
        <span style={{ fontSize: 13, color: "var(--txt2)", textTransform: "uppercase", letterSpacing: 1 }}>{movies.length} Phim</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 24 }}>
        {movies.map(m => <MovieCard key={m.id} movie={m} onClick={onSelect} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MOVIE DETAIL (NÂNG CẤP)
// ═══════════════════════════════════════════════════════════════
function MovieDetailPage({ movie, onBook }) {
  const [detail, setDetail] = useState(movie);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    apiGet(`/api/movies/${movie.id}`).then(data => setDetail(data)).catch(console.error);
  }, [movie.id]);

  const poster = detail.posterUrl || `https://picsum.photos/seed/dt${detail.id}/400/600`;
  const hasTrailer = !!detail.trailerUrl;
  const getEmbedUrl = (url) => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?autoplay=1` : url;
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Background Poster Blur khổng lồ */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100vh", zIndex: 0 }}>
        <img src={poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.3) saturate(1.5)", transform: "scale(1.1)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 0%, var(--bg) 100%)" }} />
      </div>

      <div className="fu" style={{ position: "relative", zIndex: 1, display: "flex", gap: 60, flexWrap: "wrap", padding: "140px 8vw 100px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Poster Cột Trái */}
        <div style={{ position: "relative", width: 320, flexShrink: 0, perspective: 1000 }}>
          <img src={poster} alt={detail.title} style={{ width: "100%", borderRadius: 20, objectFit: "cover", boxShadow: "0 30px 60px rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)" }} />
          {hasTrailer && (
            <div onClick={() => setShowTrailer(true)} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", borderRadius: 20, cursor: "pointer", transition: "all 0.3s" }}>
              <div style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.4)", transition: "transform 0.3s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                <div style={{ width: 0, height: 0, borderTop: "14px solid transparent", borderBottom: "14px solid transparent", borderLeft: "22px solid #fff", marginLeft: 6 }} />
              </div>
            </div>
          )}
        </div>

        {/* Nội dung Cột Phải */}
        <div style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Badge color="var(--gold)">{detail.genre || "Đang cập nhật"}</Badge>
          <h1 className="gold-text" style={{ fontFamily: "var(--ff)", fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1.1, margin: "16px 0 24px" }}>{detail.title}</h1>

          <div style={{ display: "flex", gap: 24, color: "var(--txt)", fontSize: 16, marginBottom: 30, fontWeight: 500 }}>
            {detail.rating && <Stars v={detail.rating} />}
            {detail.duration && <span>⏱ {detail.duration}</span>}
            {detail.director && <span>🎬 {detail.director}</span>}
            {detail.year && <span>📅 {detail.year}</span>}
          </div>

          <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: 40, lineHeight: 1.9, fontSize: 16, maxWidth: 800 }}>{detail.description || "Đang cập nhật nội dung..."}</p>

          <div className="glass" style={{ padding: "24px", borderRadius: 16, maxWidth: 500, marginBottom: 32 }}>
            <h3 style={{ fontFamily: "var(--ff)", fontSize: 20, marginBottom: 8, color: "var(--gold)" }}>🎟 Đặt vé trực tuyến</h3>
            <p style={{ fontSize: 14, color: "var(--txt2)", margin: 0 }}>Hệ thống chọn ghế thông minh, giá vé linh hoạt theo vị trí và khung giờ chiếu.</p>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <Btn size="lg" onClick={() => onBook(detail)} style={{ borderRadius: 30, padding: "16px 40px", fontSize: 16, boxShadow: "0 10px 20px rgba(223, 166, 91, 0.3)" }}>Đặt vé ngay</Btn>
          </div>
        </div>
      </div>

      {/* Modal Trailer giữ nguyên */}
      {showTrailer && hasTrailer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "5vw" }}>
          <div onClick={() => setShowTrailer(false)} style={{ position: "absolute", top: 30, right: 40, color: "#fff", fontSize: 48, cursor: "pointer", transition: "0.2s" }}>&times;</div>
          <div className="fu" style={{ width: "100%", maxWidth: 1100, aspectRatio: "16/9", background: "#000", borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 100px rgba(0,0,0,0.8)" }}>
            <iframe width="100%" height="100%" src={getEmbedUrl(detail.trailerUrl)} frameBorder="0" allow="autoplay; fullscreen" style={{ border: "none" }}></iframe>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BOOKING PAGE (FIXED: 10 COLS, PROFESSIONAL UI)
// ═══════════════════════════════════════════════════════════════
function BookingPage({ movie, user, onConfirm, setPage }) {
  const dates = next3Days();
  const [step, setStep] = useState(1);
  const [selDate, setSelDate] = useState(dates[0].val);
  const [showtimes, setShowtimes] = useState([]);
  const [selShowtime, setSelShowtime] = useState(null);

  const [seats, setSeats] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState("momo");

  // Fetch suất chiếu
  useEffect(() => {
    setSelShowtime(null);
    apiGet(`/api/showtimes/movie/${movie.id}?date=${selDate}`)
      .then(data => setShowtimes(Array.isArray(data) ? data : (data?.content || [])))
      .catch(console.error);
  }, [movie.id, selDate]);

  // Fetch ghế dựa trên 10 cột cố định
  useEffect(() => {
    if (selShowtime && selShowtime.room) {
      // Ép tạo 10 cột/hàng
      let initialSeats = genSeats(80);
      apiGet(`/api/orders/showtime/${selShowtime.id}/booked-seats`)
        .then(bookedSeatIds => {
          const bookedArray = Array.isArray(bookedSeatIds) ? bookedSeatIds : [];
          setSeats(initialSeats.map(seat => ({
            ...seat, taken: bookedArray.includes(seat.id), selected: false
          })));
        })
        .catch(() => setSeats(initialSeats));
    }
  }, [selShowtime]);

  const getDynamicPrice = (seatType) => {
    if (!selShowtime) return 0;
    const base = selShowtime.basePrice || 0;
    if (seatType === "couple") return base * 2;
    if (seatType === "vip") return base + 20000;
    return base;
  };

  const selected = seats.filter(s => s.selected);
  const totalAmount = selected.reduce((total, seat) => total + getDynamicPrice(seat.type), 0);
  const toggleSeat = (sid) => setSeats(ss => ss.map(s => s.id === sid && !s.taken ? { ...s, selected: !s.selected } : s));

  const handlePayment = async () => {
    if (!user) { toast.error("Vui lòng đăng nhập!"); setPage("login"); return; }
    setIsSubmitting(true);
    try {
      const data = await apiPost("/api/orders/create", {
        userId: user.id,
        showtimeId: selShowtime.id,
        seatNumbers: selected.map(s => s.id),
        payMethod
      });
      // Gửi data (orderCode) sang trang xác nhận
      onConfirm({ movie, date: selDate, showtime: selShowtime, seats: selected, total: totalAmount, orderId: data, payMethod });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = ["Suất chiếu", "Chọn ghế", "Thanh toán"];
  const durationText = movie.duration ? (String(movie.duration).includes("phút") ? movie.duration : `${movie.duration} phút`) : "120 phút";

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", paddingBottom: 100 }}>
      {/* HEADER PHIM GIỮ PHONG CÁCH KÍNH MỜ */}
      <div className="glass" style={{ margin: "0 5vw 40px", padding: "20px 30px", borderRadius: 20, display: "flex", gap: 24, alignItems: "center" }}>
        <img src={movie.posterUrl || `https://picsum.photos/seed/bk${movie.id}/80/120`} alt="" style={{ width: 64, height: 96, borderRadius: 12, objectFit: "cover", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }} />
        <div>
          <h2 style={{ fontFamily: "var(--ff)", fontSize: 32, margin: 0, color: "var(--gold)", fontStyle: "italic" }}>{movie.title}</h2>
          <div style={{ fontSize: 14, color: "var(--txt2)", marginTop: 6, fontWeight: 500 }}>{movie.genre} • {durationText}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 40, padding: "0 5vw", maxWidth: 1400, margin: "0 auto" }}>

        {/* CỘT TRÁI: FLOW CHÍNH */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

          {/* STEPPER CHUYÊN NGHIỆP */}
          <div style={{ display: "flex", justifyContent: "space-between", position: "relative", marginBottom: 10, padding: "0 30px" }}>
            <div style={{ position: "absolute", top: 18, left: 50, right: 50, height: 2, background: "var(--brd)", zIndex: 0 }} />
            {steps.map((label, idx) => {
              const isActive = step === idx + 1;
              const isPassed = step > idx + 1;
              return (
                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: isActive || isPassed ? "var(--gold)" : "var(--bg3)", color: isActive || isPassed ? "#000" : "var(--txt2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 14, transition: "0.3s", boxShadow: isActive ? "0 0 20px var(--gold-glow)" : "none" }}>
                    {isPassed ? "✓" : idx + 1}
                  </div>
                  <span style={{ fontSize: 12, color: isActive ? "var(--gold)" : "var(--txt2)", fontWeight: isActive ? 600 : 400, marginTop: 10, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* BƯỚC 1: CHỌN NGÀY & SUẤT */}
          {step === 1 && (
            <div className="fu">
              <div style={{ fontSize: 13, color: "var(--txt2)", marginBottom: 16, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>1. Chọn Ngày Chiếu</div>
              <div style={{ display: "flex", gap: 14, marginBottom: 40, overflowX: "auto", paddingBottom: 10 }}>
                {dates.map((d, idx) => {
                  const isActive = selDate === d.val;
                  const [y, m, day] = d.val.split("-");
                  return (
                    <div key={d.val} onClick={() => setSelDate(d.val)} style={{ padding: "16px 24px", borderRadius: 16, cursor: "pointer", background: isActive ? "linear-gradient(135deg, var(--gold), #b87a32)" : "var(--bg2)", color: isActive ? "#000" : "var(--txt)", textAlign: "center", minWidth: 105, transition: "all 0.3s", border: isActive ? "none" : "1px solid var(--brd)", transform: isActive ? "translateY(-4px)" : "none", boxShadow: isActive ? "0 12px 24px rgba(223,166,91,0.2)" : "none" }}>
                      <div style={{ fontSize: 11, opacity: isActive ? 0.8 : 0.5, marginBottom: 4, fontWeight: 600 }}>{idx === 0 ? "Hôm nay" : idx === 1 ? "Ngày mai" : "Thứ " + (new Date(y, m - 1, day).getDay() + 1)}</div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{day}/{m}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: 13, color: "var(--txt2)", marginBottom: 16, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>2. Chọn Suất Chiếu</div>
              {showtimes.length === 0 ? <div className="glass" style={{ padding: 40, borderRadius: 16, textAlign: "center", color: "var(--dim)" }}>Chưa có lịch chiếu cho ngày này.</div> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 16 }}>
                  {showtimes.map(st => (
                    <div key={st.id} onClick={() => setSelShowtime(st)} style={{ padding: "18px", borderRadius: 16, cursor: "pointer", background: selShowtime?.id === st.id ? "rgba(223,166,91,0.12)" : "var(--bg2)", color: selShowtime?.id === st.id ? "var(--gold)" : "var(--txt)", border: `2px solid ${selShowtime?.id === st.id ? "var(--gold)" : "var(--brd)"}`, textAlign: "center", transition: "0.2s" }}>
                      <div style={{ fontFamily: "var(--fb)", fontSize: 24, fontWeight: "bold" }}>{fmtTime(st.startTime)}</div>
                      <div style={{ fontSize: 12, color: "var(--txt2)", marginTop: 6, fontWeight: 500 }}>{st.room?.name || "Rạp"}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 48, display: "flex", justifyContent: "flex-end" }}>
                <Btn size="lg" disabled={!selShowtime} onClick={() => setStep(2)} style={{ borderRadius: 30, padding: "16px 40px" }}>Tiếp tục: Chọn ghế →</Btn>
              </div>
            </div>
          )}

          {/* BƯỚC 2: CHỌN GHẾ (ÉP 10 CỘT) */}
          {step === 2 && (
            <div className="fu glass" style={{ borderRadius: 24, padding: "50px 30px" }}>

              {/* Màn hình */}
              <div style={{ textAlign: "center", marginBottom: 64, position: "relative" }}>
                <div style={{ width: "85%", height: 6, margin: "0 auto", background: "var(--gold)", borderRadius: "50% 50% 0 0", boxShadow: "0 -8px 24px var(--gold-glow)" }} />
                <div style={{ marginTop: 12, fontSize: 11, color: "var(--gold)", letterSpacing: 8, fontWeight: 700, textTransform: "uppercase" }}>Màn Hình</div>
              </div>

              {/* Grid 10 Cột */}
              <div style={{ overflowX: "auto", paddingBottom: 20 }}>
                {["A", "B", "C", "D", "E", "F", "G", "H"].map(row => {
                  const rowSeats = seats.filter(s => s.row === row);
                  if (rowSeats.length === 0) return null;
                  return (
                    <div key={row} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, justifyContent: "center" }}>
                      <span style={{ width: 24, fontSize: 13, color: "var(--dim)", fontWeight: 800, textAlign: "right" }}>{row}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        {rowSeats.map((s, idx) => {
                          let bgColor = s.type === "couple" ? "#7c3aed" : s.type === "vip" ? "#e63946" : "rgba(255,255,255,0.06)";
                          let borderColor = s.type === "couple" ? "#6d28d9" : s.type === "vip" ? "#c1121f" : "var(--brd)";
                          let width = s.type === "couple" ? 68 : 34;

                          if (s.taken) { bgColor = "#161625"; borderColor = "transparent"; }
                          if (s.selected) { bgColor = "var(--gold)"; borderColor = "var(--gold)"; }

                          // Lối đi ở giữa sau cột 5
                          let marginLeft = (s.type !== "couple" && idx === 5) ? 32 : 0;
                          if (s.type === "couple" && idx === 3) marginLeft = 32;

                          return (
                            <div key={s.id} onClick={() => toggleSeat(s.id)}
                              style={{ width, height: 34, marginLeft, borderRadius: "8px 8px 3px 3px", background: bgColor, border: `1px solid ${borderColor}`, cursor: s.taken ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: s.selected ? "#000" : (s.taken ? "rgba(255,255,255,0.15)" : "var(--txt)"), transition: "all 0.2s", fontWeight: 800, boxShadow: s.selected ? "0 4px 15px var(--gold-glow)" : "inset 0 -4px 0 rgba(0,0,0,0.2)", transform: s.selected ? "scale(1.18) translateY(-4px)" : "scale(1)" }}>
                              {s.num}
                            </div>
                          );
                        })}
                      </div>
                      <span style={{ width: 24, fontSize: 13, color: "var(--dim)", fontWeight: 800, textAlign: "left" }}>{row}</span>
                    </div>
                  );
                })}
              </div>

              {/* Chú thích */}
              <div style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", marginTop: 48, paddingTop: 32, borderTop: "1px solid var(--brd)" }}>
                {[{ label: "Đã bán", color: "#161625" }, { label: "Thường", color: "rgba(255,255,255,0.06)" }, { label: "VIP", color: "#e63946" }, { label: "Cặp đôi", color: "#7c3aed" }, { label: "Đang chọn", color: "var(--gold)" }].map(lg => (
                  <div key={lg.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--txt2)", fontWeight: 500 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: lg.color, border: `1px solid ${lg.color}` }} />
                    {lg.label}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 48, justifyContent: "space-between" }}>
                <Btn variant="ghost" onClick={() => setStep(1)} style={{ borderRadius: 30 }}>← Suất chiếu</Btn>
                <Btn size="lg" disabled={selected.length === 0} onClick={() => setStep(3)} style={{ borderRadius: 30, padding: "16px 40px" }}>Thanh toán ({selected.length} ghế) →</Btn>
              </div>
            </div>
          )}

          {/* BƯỚC 3: THANH TOÁN */}
          {step === 3 && (
            <div className="fu glass" style={{ borderRadius: 24, padding: 32 }}>
              <div style={{ fontSize: 13, color: "var(--txt2)", marginBottom: 20, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Chọn Phương Thức</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                {[
                  { id: "momo", name: "Ví MoMo", color: "#a50064", icon: "👛" },
                  { id: "vnpay", name: "VNPay", color: "#005baa", icon: "🏦" },
                  { id: "zalopay", name: "ZaloPay", color: "#0068ff", icon: "💬" },
                  { id: "cash", name: "Tại quầy", color: "var(--aqua)", icon: "🎟️" }
                ].map(pm => (
                  <div key={pm.id} onClick={() => setPayMethod(pm.id)} style={{ padding: "22px", borderRadius: 18, cursor: "pointer", background: payMethod === pm.id ? `${pm.color}15` : "var(--bg3)", border: `2px solid ${payMethod === pm.id ? pm.color : "transparent"}`, display: "flex", alignItems: "center", gap: 14, transition: "0.2s" }}>
                    <div style={{ fontSize: 32 }}>{pm.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{pm.name}</div>
                    {payMethod === pm.id && <div style={{ marginLeft: "auto", color: pm.color, fontSize: 24 }}>✓</div>}
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(223,166,91,0.05)", border: "1px dashed rgba(223,166,91,0.25)", borderRadius: 12, padding: "16px 20px", marginBottom: 40, fontSize: 14, color: "var(--txt2)", lineHeight: 1.6 }}>
                <span style={{ color: "var(--gold)", fontWeight: 700 }}>Lưu ý:</span> Vé đã đặt thành công không thể thay đổi thông tin hoặc hoàn tiền. Vui lòng kiểm tra kỹ suất chiếu và số ghế.
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
                <Btn variant="ghost" onClick={() => setStep(2)} style={{ borderRadius: 30 }}>← Chọn lại ghế</Btn>
                <Btn size="lg" onClick={handlePayment} disabled={isSubmitting} style={{ borderRadius: 30, padding: "18px 50px", fontSize: 17 }}>
                  {isSubmitting ? "Đang xử lý..." : `Xác nhận ${fmt(totalAmount)}`}
                </Btn>
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: TICKET SIDEBAR (PREMIUM TICKET DESIGN) */}
        <div>
          <div style={{ position: "sticky", top: 100 }}>
            <div style={{ background: "var(--bg3)", borderRadius: 24, border: "1px solid var(--brd)", boxShadow: "0 24px 48px rgba(0,0,0,0.5)", overflow: "hidden" }}>

              {/* Top Phần vé */}
              <div style={{ padding: 28, borderBottom: "2px dashed var(--dim)", position: "relative" }}>
                <div style={{ position: "absolute", bottom: -12, left: -12, width: 24, height: 24, borderRadius: "50%", background: "var(--bg)" }} />
                <div style={{ position: "absolute", bottom: -12, right: -12, width: 24, height: 24, borderRadius: "50%", background: "var(--bg)" }} />

                <div style={{ fontSize: 11, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 3, marginBottom: 10, textAlign: "center", fontWeight: 700 }}>CinéHub Ticket</div>
                <h3 style={{ fontFamily: "var(--ff)", fontSize: 30, margin: "0 0 24px", color: "#fff", lineHeight: 1.1, textAlign: "center", fontStyle: "italic" }}>{movie.title}</h3>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 14 }}>
                  <span style={{ color: "var(--txt2)" }}>Phòng chiếu</span>
                  <span style={{ fontWeight: 700 }}>{selShowtime?.room?.name || "Ciné Center"}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--txt2)" }}>Suất chiếu</span>
                  {selShowtime ? (
                    <span style={{ textAlign: "right" }}>
                      <span style={{ color: "var(--gold)", fontWeight: 800, fontSize: 18 }}>{fmtTime(selShowtime.startTime)}</span><br />
                      <span style={{ color: "var(--txt2)", fontSize: 13 }}>{selDate}</span>
                    </span>
                  ) : <span style={{ color: "var(--dim)" }}>Chưa chọn</span>}
                </div>
              </div>

              {/* Bottom Phần vé */}
              <div style={{ padding: 28 }}>
                <div style={{ fontSize: 12, color: "var(--txt2)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Vị trí ghế ({selected.length})</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 44 }}>
                  {selected.length === 0 && <span style={{ color: "var(--dim)", fontStyle: "italic", fontSize: 14 }}>Vui lòng chọn ghế...</span>}
                  {selected.map(s => (
                    <Badge key={s.id} color={s.type === 'couple' ? '#7c3aed' : s.type === 'vip' ? '#e63946' : 'var(--gold)'}>{s.id}</Badge>
                  ))}
                </div>

                <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--brd)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <span style={{ color: "var(--txt2)", fontSize: 15, fontWeight: 500 }}>Thành tiền</span>
                  <span style={{ fontFamily: "var(--fb)", fontSize: 34, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>{fmt(totalAmount)}</span>
                </div>
              </div>

            </div>

            {/* Trang trí chân vé */}
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 2 }}>
              Enjoy Your Movie Time
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
//  CONFIRMATION PAGE (Chỉ In phần Vé Điện Tử)
// ═══════════════════════════════════════════════════════════════
function ConfirmationPage({ booking, onHome }) {
  const code = booking.orderId || "ERROR_CODE";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}&color=080810&bgcolor=ece6db&margin=10`;

  return (
    <>
      {/* KHỐI CSS DÀNH RIÊNG CHO CHỨC NĂNG IN (window.print) */}
      <style>{`
        @media print {
          @page { 
            margin: 0; 
            size: portrait; /* Ép in theo khổ dọc */
          }
          
          /* 1. Reset nền giấy về màu trắng, xóa padding/margin và chặn trang 2 */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important; /* Giấy in nền trắng cho sạch và đỡ tốn mực */
            height: 100vh !important;
            overflow: hidden !important; /* Khóa chết không cho tràn trang 2 */
          }

          /* 2. Ẩn tất cả mọi thứ trên trang web */
          body * { 
            visibility: hidden; 
          }
          
          /* 3. Chỉ hiện thị vùng vé */
          #ticket-wrapper, #ticket-wrapper * { 
            visibility: visible; 
          }
          
          /* 4. Nhổ bật tấm vé ra khỏi khung cũ, ghim sát lên đỉnh tờ giấy */
          #ticket-wrapper {
            position: absolute !important;
            top: -240px !important; /* Đẩy sát lên mép trên */
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: 400px !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* 5. Ép trình duyệt in các màu nền đen của vé */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      <div style={{ paddingTop: 80, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 5vw 80px" }}>
        <div className="fu" style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>

          {/* --- CÁC THÀNH PHẦN NÀY SẼ BỊ ẨN KHI IN --- */}
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(78,205,196,.15)", border: "2px solid rgba(78,205,196,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 24px", color: "var(--aqua)", filter: "drop-shadow(0 0 20px rgba(78,205,196,0.4))" }}>
            ✓
          </div>
          <h1 style={{ fontFamily: "var(--ff)", fontSize: 32, fontWeight: 300, marginBottom: 8, color: "var(--aqua)" }}>Đặt vé thành công!</h1>
          <p style={{ color: "var(--txt2)", marginBottom: 32, fontSize: 14 }}>Vui lòng lưu lại mã QR hoặc chụp màn hình mã đơn hàng để xuất trình tại quầy vé.</p>

          {/* --- KHUNG VÉ NÀY LÀ PHẦN DUY NHẤT ĐƯỢC IN --- */}
          <div id="ticket-wrapper">
            <Card style={{ overflow: "hidden", textAlign: "left", marginBottom: 32, border: "1px solid var(--brd)", borderRadius: 16 }}>

              {/* Phim Info */}
              <div style={{ background: "linear-gradient(135deg, rgba(201,145,74,0.15), rgba(201,145,74,0.02))", padding: "20px 24px", borderBottom: "2px dashed var(--brd)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                <div style={{ position: "absolute", bottom: -12, left: -12, width: 24, height: 24, borderRadius: "50%", background: "var(--bg)", borderTop: "1px solid var(--brd)", borderRight: "1px solid var(--brd)", transform: "rotate(45deg)" }} />
                <div style={{ position: "absolute", bottom: -12, right: -12, width: 24, height: 24, borderRadius: "50%", background: "var(--bg)", borderBottom: "1px solid var(--brd)", borderLeft: "1px solid var(--brd)", transform: "rotate(45deg)" }} />

                <div>
                  <div style={{ fontFamily: "var(--ff)", fontSize: 22, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{booking.movie.title}</div>
                  <div style={{ fontSize: 13, color: "var(--txt2)" }}>{booking.movie.genre}</div>
                </div>
                <img src={booking.movie.posterUrl || `https://picsum.photos/seed/cf${booking.movie.id}/60/90`} alt="" style={{ width: 56, height: 84, objectFit: "cover", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }} />
              </div>

              {/* Chi tiết suất chiếu */}
              <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, borderBottom: "2px dashed var(--brd)", position: "relative" }}>
                <div style={{ position: "absolute", bottom: -12, left: -12, width: 24, height: 24, borderRadius: "50%", background: "var(--bg)", borderTop: "1px solid var(--brd)", borderRight: "1px solid var(--brd)", transform: "rotate(45deg)" }} />
                <div style={{ position: "absolute", bottom: -12, right: -12, width: 24, height: 24, borderRadius: "50%", background: "var(--bg)", borderBottom: "1px solid var(--brd)", borderLeft: "1px solid var(--brd)", transform: "rotate(45deg)" }} />

                {[
                  ["Ngày chiếu", booking.date],
                  ["Suất chiếu", fmtTime(booking.showtime?.startTime)],
                  ["Phòng", booking.showtime?.room?.name || "—"],
                  ["Ghế", booking.seats.map(s => s.id).join(", ")],
                  ["Tổng tiền", fmt(booking.total)],
                  ["Thanh toán", (booking.payMethod || "").toUpperCase()]
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: l === "Tổng tiền" ? "var(--gold)" : "var(--txt)" }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Khu vực chứa Mã Code & QR */}
              <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", background: "var(--bg2)" }}>
                <div style={{ background: "#ece6db", padding: "10px", borderRadius: "14px", marginBottom: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
                  <img src={qrCodeUrl} alt="Ticket QR Code" style={{ width: 160, height: 160, display: "block", borderRadius: "8px" }} />
                </div>

                <div style={{ fontSize: 12, color: "var(--txt2)", textTransform: "uppercase", letterSpacing: 3, marginBottom: 6 }}>Mã nhận vé</div>
                <div style={{ fontFamily: "var(--fb)", fontSize: 32, fontWeight: 700, letterSpacing: 6, color: "var(--gold)", textTransform: "uppercase" }}>
                  {code}
                </div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>Vui lòng đưa mã này cho nhân viên</div>
              </div>

            </Card>
          </div>

          {/* --- CÁC NÚT ĐIỀU HƯỚNG NÀY SẼ BỊ ẨN KHI IN --- */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Btn onClick={onHome} size="lg">Về trang chủ</Btn>
            {/* Lệnh window.print() sẽ kích hoạt CSS @media print ở trên */}
            <Btn variant="ghost" size="lg" onClick={() => window.print()}>📥 Tải vé / In vé</Btn>
          </div>

        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SCANNER PAGE — TRANG SOÁT VÉ CHO NHÂN VIÊN (Khớp với OrderQRDto)
// ═══════════════════════════════════════════════════════════════
function TicketScannerPage() {
  const [code, setCode] = useState("");
  const [order, setOrder] = useState(null); // Dữ liệu giờ là OrderQRDto
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  // LUÔN GIỮ FOCUS VÀO Ô INPUT: Để máy quét QR vật lý có thể tự động "gõ" vào bất cứ lúc nào
  useEffect(() => {
    inputRef.current?.focus();
    const handleBlur = () => setTimeout(() => inputRef.current?.focus(), 100);
    window.addEventListener("click", handleBlur);
    return () => window.removeEventListener("click", handleBlur);
  }, []);

  const handleSearch = async () => {
    if (!code.trim()) return;
    setLoading(true); setErr(""); setOrder(null);
    try {
      // Gọi API trả về OrderQRDto
      const data = await apiGet(`/api/orders/code/${code.trim()}`);
      setOrder(data);
      setCode(""); // Xóa trắng để quét vé tiếp theo
    } catch (error) {
      setErr("Mã vé không hợp lệ hoặc không tìm thấy đơn hàng.");
      setCode("");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleCheckIn = async () => {
    // Logic xác nhận vé vào rạp
    toast.success(`Đã xác nhận vé cho khách hàng: ${order.userName}`);
    setOrder(null); // Reset màn hình chờ quét khách tiếp theo
    inputRef.current?.focus();
  };

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", paddingBottom: 80, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 600, padding: "0 5vw" }}>

        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(201,145,74,0.15)", border: "2px solid rgba(201,145,74,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px", color: "var(--gold)" }}>
            📷
          </div>
          <h1 style={{ fontFamily: "var(--ff)", fontSize: 32, fontWeight: 300, color: "var(--gold)" }}>Soát vé điện tử</h1>
          <p style={{ color: "var(--txt2)", fontSize: 14 }}>Dùng máy quét QR để tít mã (Tự động nhận diện)</p>
        </div>

        {/* Ô Nhập Mã - Máy Quét QR sẽ gõ thẳng vào đây và tự kích hoạt onKeyDown Enter */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <input
            ref={inputRef}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="SẴN SÀNG QUÉT MÃ..."
            autoFocus
            style={{ flex: 1, padding: "16px 24px", borderRadius: 12, background: "var(--bg2)", border: "2px solid var(--gold)", color: "var(--gold)", fontSize: 20, fontWeight: "bold", outline: "none", letterSpacing: 2, textTransform: "uppercase" }}
          />
          <Btn size="lg" onClick={handleSearch} disabled={loading || !code.trim()}>
            {loading ? <span className="spin">⟳</span> : "Kiểm tra"}
          </Btn>
        </div>

        {err && (
          <div className="fu" style={{ background: "rgba(224,85,85,.15)", border: "1px solid rgba(224,85,85,.3)", borderRadius: 12, padding: "16px", textAlign: "center", color: "var(--red)", marginBottom: 24 }}>
            ⚠️ {err}
          </div>
        )}

        {/* Hiển thị thông tin Vé dựa trên OrderQRDto mới */}
        {order && (
          <Card className="fu" style={{ overflow: "hidden", border: "1px solid var(--brd)", borderRadius: 16 }}>
            <div style={{ background: "linear-gradient(135deg, rgba(78,205,196,0.15), transparent)", padding: "20px 24px", borderBottom: "1px solid var(--brd)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--txt2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Trạng thái vé</div>
                <Badge color="var(--aqua)">HỢP LỆ</Badge>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--txt2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Mã Đơn</div>
                <div style={{ fontFamily: "var(--fb)", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>{order.orderCode}</div>
              </div>
            </div>

            <div style={{ padding: 24 }}>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase" }}>Khách hàng</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{order.userName || "Khách Vãng Lai"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase" }}>Tổng thanh toán</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--gold)" }}>{fmt(order.totalAmount)}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "var(--bg)", padding: 16, borderRadius: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase" }}>Suất chiếu</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--gold)" }}>{fmtTime(order.startTime)}</div>
                  <div style={{ fontSize: 13, color: "var(--txt2)" }}>{fmtDate(order.showDate)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase" }}>Phòng chiếu</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{order.roomName || "—"}</div>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase", marginBottom: 8 }}>Danh sách ghế</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {/* FE xử lý cắt chuỗi "A1, A2" thành mảng để in từng Badge ghế ra */}
                  {order.seatNumber ? order.seatNumber.split(",").map(seat => (
                    <Badge key={seat.trim()} color="var(--gold)">Ghế {seat.trim()}</Badge>
                  )) : <span style={{ color: "var(--dim)" }}>Không có thông tin ghế</span>}
                </div>
              </div>
            </div>

            <div style={{ padding: 20, background: "var(--bg2)", borderTop: "1px solid var(--brd)" }}>
              <Btn full size="lg" onClick={handleCheckIn} variant="aqua">
                Đánh dấu khách đã vào rạp
              </Btn>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
//  SEARCH — POST /api/search/natural → SearchResponse{query,results[],parsedIntent,totalFound}
// ═══════════════════════════════════════════════════════════════
function SearchPage({ onSelect }) {
  const [q, setQ] = useState("");
  const [aiMode, setAiMode] = useState(true);
  const [loading, setLoad] = useState(false);
  const [results, setRes] = useState([]);
  const [intent, setIntent] = useState(null);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    if (!q.trim()) return;
    setLoad(true); setSearched(true);
    try {
      if (aiMode) {
        const data = await apiPost("/api/search/natural", { query: q, topK: 10 });
        // SearchResponse: {query, results: MovieCardDto[], parsedIntent: IntentDebug{actors,roles,genres,...}, totalFound}
        setRes(data.results || []);
        setIntent(data.parsedIntent || null);
      } else {
        const data = await apiGet(`/api/movies?keyword=${encodeURIComponent(q)}`);
        setRes(Array.isArray(data) ? data : []);
        setIntent(null);
      }
    } catch { setRes([]); }
    setLoad(false);
  }, [q, aiMode]);

  const examples = ["phim Trấn Thành đóng vai bố", "phim hành động người mẹ tìm con", "phim kinh dị ma quỷ", "phim đánh giá trên 8 điểm", "phim gia đình cảm động 2023"];

  return (
    <div style={{ paddingTop: 60, minHeight: "100vh", padding: "90px 5vw 60px" }}>
      <h1 style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 36, fontWeight: 300, marginBottom: 6 }}>Tìm kiếm phim</h1>
      <p style={{ color: "var(--txt2)", marginBottom: 22, fontSize: 14 }}>Bật AI để tìm bằng ngôn ngữ tự nhiên tiếng Việt</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 13 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder={aiMode ? '"phim mà Trấn Thành đóng vai bố cảm động..."' : "Tên phim, diễn viên..."}
            style={{ width: "100%", padding: "12px 16px 12px 42px", borderRadius: 9, background: "var(--bg2)", border: "1px solid var(--brd)", color: "var(--txt)", fontSize: 14, outline: "none" }}
            onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 17, pointerEvents: "none" }}>🔍</span>
        </div>
        <Btn onClick={doSearch} disabled={loading || !q.trim()}>{loading ? <span className="spin">⟳</span> : "Tìm"}</Btn>
      </div>

      {/* AI toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div onClick={() => setAiMode(m => !m)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "7px 13px", borderRadius: 7, background: aiMode ? "rgba(201,145,74,.1)" : "rgba(255,255,255,.04)", border: `1px solid ${aiMode ? "var(--gold)" : "var(--brd)"}`, transition: "all .2s" }}>
          <div style={{ width: 30, height: 17, borderRadius: 8, background: aiMode ? "var(--gold)" : "var(--dim)", position: "relative", transition: "all .2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 2, left: aiMode ? 13 : 2, width: 13, height: 13, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: aiMode ? "var(--gold)" : "var(--txt2)" }}>Tìm kiếm AI</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--dim)" }}>NLP + FAISS + BM25 · Hiểu tiếng Việt</span>
      </div>

      {!searched && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 24 }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => { setQ(ex); setAiMode(true); }}
              style={{ padding: "5px 13px", borderRadius: 20, fontSize: 12, cursor: "pointer", background: "rgba(255,255,255,.04)", border: "1px solid var(--brd)", color: "var(--txt2)", transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--txt)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--brd)"; e.currentTarget.style.color = "var(--txt2)"; }}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Intent — IntentDebug: {actors[], roles[], genres[], emotions[], conditions[], semantic_query} */}
      {intent && (
        <div className="fu" style={{ background: "rgba(201,145,74,.06)", border: "1px solid rgba(201,145,74,.2)", borderRadius: 9, padding: "10px 14px", marginBottom: 18, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--txt2)" }}>AI nhận diện:</span>
          {intent.actors?.map(a => <Badge key={a}>{a}</Badge>)}
          {intent.genres?.map(g => <Badge key={g} color="var(--aqua)">{g}</Badge>)}
          {intent.roles?.map(r => <Badge key={r} color="#a78bfa">{r}</Badge>)}
          {intent.emotions?.map(e => <Badge key={e} color="#fb7185">{e}</Badge>)}
          {intent.conditions?.length > 0 && <Badge color="#fbbf24">{intent.conditions.length} điều kiện</Badge>}
          <span style={{ fontSize: 11, color: "var(--dim)", marginLeft: 4 }}>→ {results.length} kết quả</span>
        </div>
      )}

      {loading ? <div style={{ textAlign: "center", padding: "50px 0", color: "var(--txt2)", fontSize: 13 }}><span className="spin" style={{ fontSize: 26 }}>⟳</span><p style={{ marginTop: 10 }}>AI đang phân tích...</p></div>
        : searched && results.length === 0 ? <div style={{ textAlign: "center", padding: "50px 0", color: "var(--txt2)" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div><p>Không tìm thấy phim phù hợp</p></div>
          : <div className="fu" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 18 }}>{results.map(m => <MovieCard key={m.id} movie={m} onClick={onSelect} />)}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN — CRUD PHIM/PHÒNG/SUẤT CHIẾU (CÓ TÍNH NĂNG CHỈNH SỬA)
// ═══════════════════════════════════════════════════════════════
function AdminPage() {
  const [tab, setTab] = useState("movies");
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [saving, setSaving] = useState(false);

  // States lưu trữ item đang được chỉnh sửa
  const [editingMovie, setEditingMovie] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editingShowtime, setEditingShowtime] = useState(null);

  const fetchAll = useCallback(() => {
    apiGet("/api/movies").then(d => setMovies(Array.isArray(d) ? d : [])).catch(() => {});
    apiGet("/api/rooms").then(d => setRooms(d.content || (Array.isArray(d) ? d : []))).catch(() => {});
    apiGet("/api/showtimes/filter?page=0&size=50").then(d => setShowtimes(d.content || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const changeTab = (k) => {
    setTab(k);
    setEditingMovie(null); setEditingRoom(null); setEditingShowtime(null); // Reset form khi chuyển tab
  };

  const inpSt = { width: "100%", padding: "10px 13px", borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--brd)", color: "var(--txt)", fontSize: 14, outline: "none", marginBottom: 12, transition: "0.2s" };

  // Xử lý Phim (Tạo mới HOẶC Cập nhật)
  const handleMovie = async e => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData(e.target);

    const trailerTitle = fd.get("trailerTitle");
    const trailerUrl = fd.get("trailerUrl");
    const trailers = trailerUrl ? [{ title: trailerTitle || "Trailer", videoUrl: trailerUrl }] : [];

    const movieJson = {
      title: fd.get("title"), genre: fd.get("genre"), releaseYear: fd.get("releaseYear"),
      director: fd.get("director"), duration: fd.get("duration"), description: fd.get("description"),
      status: "showing", rating: editingMovie ? editingMovie.rating : 8.0, 
      trailers: trailers, endDate: fd.get("endDate")
    };

    const body = new FormData();
    body.append("movie", new Blob([JSON.stringify(movieJson)], { type: "application/json" }));
    if (fd.get("file")?.size > 0) body.append("file", fd.get("file"));

    try {
      if (editingMovie) {
        await apiPutForm(`/api/movies/${editingMovie.id}`, body);
        toast.success("Cập nhật phim thành công!");
      } else {
        await apiPostForm("/api/movies/create", body);
        toast.success("Tạo phim thành công!");
      }
      e.target.reset(); setEditingMovie(null); fetchAll();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  // Xử lý Phòng chiếu (Tạo mới HOẶC Cập nhật)
  const handleRoom = async e => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData(e.target);
    const payload = { name: fd.get("name"), capacity: parseInt(fd.get("capacity")) };
    try { 
      if (editingRoom) {
        await apiPut(`/api/rooms/${editingRoom.id}`, payload);
        toast.success("Cập nhật phòng thành công!");
      } else {
        await apiPost("/api/rooms/create", payload); 
        toast.success("Tạo phòng thành công!");
      }
      e.target.reset(); setEditingRoom(null); fetchAll(); 
    }
    catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  // Xử lý Suất chiếu (Tạo mới HOẶC Cập nhật)
  const handleShowtime = async e => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData(e.target);
    const raw = fd.get("startTime"); 
    const showDate = raw.split("T")[0];          
    const startTime = raw.split("T")[1] + ":00"; 
    
    const payload = { movieId: parseInt(fd.get("movieId")), roomId: parseInt(fd.get("roomId")), showDate, startTime, basePrice: parseFloat(fd.get("basePrice")) };
    
    try {
      if (editingShowtime) {
        await apiPut(`/api/showtimes/${editingShowtime.id}`, payload);
        toast.success("Cập nhật suất chiếu thành công!");
      } else {
        await apiPost("/api/showtimes/create", payload);
        toast.success("Tạo suất chiếu thành công!"); 
      }
      e.target.reset(); setEditingShowtime(null); fetchAll();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  // Hàm helper ghép ngày giờ cho thẻ input type="datetime-local"
  const formatDateTimeLocal = (dateArr, timeArr) => {
    if(!dateArr || !timeArr) return "";
    let d = Array.isArray(dateArr) ? `${dateArr[0]}-${String(dateArr[1]).padStart(2,'0')}-${String(dateArr[2]).padStart(2,'0')}` : dateArr;
    let t = Array.isArray(timeArr) ? `${String(timeArr[0]).padStart(2,'0')}:${String(timeArr[1]).padStart(2,'0')}` : timeArr.substring(0,5);
    return `${d}T${t}`;
  };

  return (
    <div style={{ paddingTop: 60, minHeight: "100vh", padding: "90px 5vw 60px" }}>
      <h1 style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 32, fontWeight: 300, color: "var(--gold)", marginBottom: 22 }}>Quản trị hệ thống</h1>
      
      <div style={{ display: "flex", gap: 8, marginBottom: 26 }}>
        {[["movies", "🎬 Phim"], ["rooms", "🏛 Phòng chiếu"], ["showtimes", "🕘 Suất chiếu"]].map(([k, l]) => (
          <Btn key={k} variant={tab === k ? "primary" : "ghost"} onClick={() => changeTab(k)}>{l}</Btn>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>
        
        {/* KHU VỰC FORM (TRÁI) */}
        <Card className="fu" style={{ padding: 24, position: "sticky", top: 80 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 20, color: "var(--gold)", margin: 0 }}>
              {tab === "movies" ? (editingMovie ? "Sửa Phim" : "Thêm Phim Mới") : 
               tab === "rooms" ? (editingRoom ? "Sửa Phòng" : "Thêm Phòng Mới") : 
               (editingShowtime ? "Sửa Suất Chiếu" : "Thêm Suất Chiếu Mới")}
            </h3>
            {/* Nút Hủy Sửa */}
            {(editingMovie || editingRoom || editingShowtime) && (
              <Badge color="var(--red)">
                <span style={{cursor: "pointer"}} onClick={() => { setEditingMovie(null); setEditingRoom(null); setEditingShowtime(null); }}>✕ Hủy sửa</span>
              </Badge>
            )}
          </div>

          {/* Dùng thủ thuật key={id} để React tự động reset form defaultValue khi thay đổi item đang sửa */}
          {tab === "movies" && (
            <form key={editingMovie ? editingMovie.id : "new"} onSubmit={handleMovie}>
              <input name="title" defaultValue={editingMovie?.title} placeholder="Tên phim *" style={inpSt} required />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                 <input name="genre" defaultValue={editingMovie?.genre} placeholder="Thể loại *" style={inpSt} required />
                 <input name="releaseYear" defaultValue={editingMovie?.releaseYear || editingMovie?.year} placeholder="Năm (VD: 2024) *" style={inpSt} required />
                 <input name="director" defaultValue={editingMovie?.director} placeholder="Đạo diễn *" style={inpSt} required />
                 <input name="duration" defaultValue={editingMovie?.duration} placeholder="Thời lượng *" style={inpSt} required />
              </div>
              <label style={{ fontSize: 11, color: "var(--txt2)", display: "block", marginBottom: 5 }}>Ngày kết thúc chiếu *</label>
              <input name="endDate" defaultValue={editingMovie?.endDate} type="date" style={inpSt} required />
              <textarea name="description" defaultValue={editingMovie?.description} placeholder="Mô tả nội dung..." rows={4} style={{ ...inpSt, resize: "vertical" }} required />
              
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px dashed var(--brd)", marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "var(--gold)", display: "block", marginBottom: 8, fontWeight: "bold" }}>TRAILER (TÙY CHỌN)</label>
                <input name="trailerTitle" defaultValue={editingMovie?.trailers?.[0]?.title} placeholder="Tên Trailer" style={{ ...inpSt, marginBottom: 8 }} />
                <input name="trailerUrl" defaultValue={editingMovie?.trailers?.[0]?.videoUrl} placeholder="Link Youtube" style={{ ...inpSt, marginBottom: 0 }} />
              </div>
              
              <label style={{ fontSize: 11, color: "var(--txt2)", display: "block", marginBottom: 5 }}>Ảnh poster (Bỏ trống nếu không đổi)</label>
              <input name="file" type="file" accept="image/*" style={{ ...inpSt, padding: "6px" }} />
              <Btn full disabled={saving} style={{ marginTop: 8 }}>{saving ? <><span className="spin">⟳</span> Đang lưu...</> : (editingMovie ? "Cập nhật Phim" : "Lưu Phim")}</Btn>
            </form>
          )}

          {tab === "rooms" && (
            <form key={editingRoom ? editingRoom.id : "new"} onSubmit={handleRoom}>
              <input name="name" defaultValue={editingRoom?.name} placeholder="Tên phòng *" style={inpSt} required />
              <input name="capacity" defaultValue={editingRoom?.capacity} type="number" min={1} placeholder="Sức chứa (số ghế) *" style={inpSt} required />
              <Btn full disabled={saving} style={{ marginTop: 8 }}>{saving ? <><span className="spin">⟳</span> Đang lưu...</> : (editingRoom ? "Cập nhật Phòng" : "Lưu Phòng")}</Btn>
            </form>
          )}

          {tab === "showtimes" && (
            <form key={editingShowtime ? editingShowtime.id : "new"} onSubmit={handleShowtime}>
              <select name="movieId" defaultValue={editingShowtime?.movie?.id} style={inpSt} required>
                <option value="">— Chọn phim —</option>
                {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <select name="roomId" defaultValue={editingShowtime?.room?.id} style={inpSt} required>
                <option value="">— Chọn phòng chiếu —</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity} ghế)</option>)}
              </select>
              <label style={{ fontSize: 11, color: "var(--txt2)", display: "block", marginBottom: 5 }}>Thời gian chiếu</label>
              <input name="startTime" defaultValue={formatDateTimeLocal(editingShowtime?.showDate, editingShowtime?.startTime)} type="datetime-local" style={inpSt} required />
              <input name="basePrice" defaultValue={editingShowtime?.basePrice} type="number" min={0} placeholder="Giá vé cơ bản (VD: 90000) *" style={inpSt} required />
              <Btn full disabled={saving} style={{ marginTop: 8 }}>{saving ? <><span className="spin">⟳</span> Đang lưu...</> : (editingShowtime ? "Cập nhật Suất Chiếu" : "Lưu Suất Chiếu")}</Btn>
            </form>
          )}
        </Card>

        {/* KHU VỰC DANH SÁCH (PHẢI) */}
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
             <h3 style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 20, margin: 0 }}>Danh sách</h3>
             <span style={{ fontSize: 12, color: "var(--dim)" }}>Nhấn vào thẻ để sửa</span>
          </div>

          {tab === "movies" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 16 }}>
              {movies.map(m => (
                 <div key={m.id} onClick={() => setEditingMovie(m)} style={{ cursor: "pointer", transition: "0.2s", outline: editingMovie?.id === m.id ? "2px solid var(--gold)" : "none", borderRadius: 12, outlineOffset: 2 }}>
                    <MovieCard movie={m} compact />
                 </div>
              ))}
            </div>
          )}
          
          {tab === "rooms" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rooms.length === 0 && <p style={{ color: "var(--dim)", fontStyle: "italic" }}>Chưa có phòng nào.</p>}
              {rooms.map(r => (
                <div key={r.id} onClick={() => setEditingRoom(r)} style={{ padding: "14px 18px", background: "var(--bg3)", borderRadius: 10, border: `1px solid ${editingRoom?.id === r.id ? "var(--gold)" : "var(--brd)"}`, display: "flex", justifyContent: "space-between", cursor: "pointer", transition: "0.2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--gold)"} onMouseLeave={e=>{if(editingRoom?.id !== r.id) e.currentTarget.style.borderColor="var(--brd)"}}>
                  <span style={{ fontWeight: 600, color: editingRoom?.id === r.id ? "var(--gold)" : "var(--txt)" }}>{r.name}</span>
                  <span style={{ color: "var(--txt2)", fontSize: 13 }}>{r.capacity} ghế</span>
                </div>
              ))}
            </div>
          )}
          
          {tab === "showtimes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {showtimes.length === 0 && <p style={{ color: "var(--dim)", fontStyle: "italic" }}>Chưa có suất chiếu nào.</p>}
              {showtimes.map(st => (
                <div key={st.id} onClick={() => setEditingShowtime(st)} style={{ padding: "14px 18px", background: "var(--bg3)", borderRadius: 10, border: `1px solid ${editingShowtime?.id === st.id ? "var(--gold)" : "var(--brd)"}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "0.2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--gold)"} onMouseLeave={e=>{if(editingShowtime?.id !== st.id) e.currentTarget.style.borderColor="var(--brd)"}}>
                  <div>
                    <div style={{ fontFamily: "var(--ff)", fontWeight: 600, fontSize: 18, color: editingShowtime?.id === st.id ? "var(--gold)" : "var(--txt)" }}>{st.movie?.title || "Phim bị xóa"}</div>
                    <div style={{ fontSize: 13, color: "var(--txt2)", marginTop: 4 }}>📅 {fmtDate(st.showDate)} · ⏱ {fmtTime(st.startTime)} · 🏛 {st.room?.name}</div>
                  </div>
                  <div style={{ color: "var(--gold)", fontWeight: 600, fontSize: 15, background: "rgba(223,166,91,0.1)", padding: "4px 10px", borderRadius: 6 }}>{fmt(st.basePrice)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
//  PROFILE — GET /api/orders/user/{userId}  → Page<Order>
//  Order: {id, userId, showtime:{id,movie,room,showDate,startTime,basePrice}, totalAmount, status, tickets[], createdAt}
// ═══════════════════════════════════════════════════════════════
function ProfilePage({ user, setUser, setPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/api/orders/user/${user.id}`)
      .then(d => setOrders(d.content || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user.id]);

  const logout = () => { clearAuth(); setUser(null); setPage("home"); };

  return (
    <div style={{ paddingTop: 60, minHeight: "100vh", padding: "90px 5vw 60px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 26, alignItems: "start" }}>
        <div className="fu">
          <Card style={{ padding: 24, textAlign: "center" }}>
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,var(--gold),#7a4a1a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 600, color: "#080810", margin: "0 auto 14px" }}>
              {(user.name || "U")[0].toUpperCase()}
            </div>
            <div style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 18, fontWeight: 300 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: "var(--txt2)", marginTop: 3 }}>{user.email}</div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--brd)", display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--ff)", fontSize: 22, fontWeight: 500, color: "var(--gold)" }}>{orders.length}</div>
                <div style={{ fontSize: 10, color: "var(--dim)" }}>Vé đã đặt</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--ff)", fontSize: 22, fontWeight: 500, color: "var(--gold)" }}>{orders.filter(o => o.status === "PAID").length}</div>
                <div style={{ fontSize: 10, color: "var(--dim)" }}>Đã TT</div>
              </div>
            </div>
            <Btn variant="ghost" full style={{ marginTop: 14 }} onClick={logout}>Đăng xuất</Btn>
          </Card>
        </div>

        <div>
          <h2 style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 24, fontWeight: 300, marginBottom: 18 }}>Lịch sử đặt vé</h2>
          {loading ? <div style={{ color: "var(--txt2)", fontSize: 13 }}><span className="spin">⟳</span> Đang tải...</div>
            : orders.length === 0 ? <p style={{ color: "var(--txt2)", fontSize: 14 }}>Chưa có đơn vé nào. <span onClick={() => setPage("home")} style={{ color: "var(--gold)", cursor: "pointer" }}>Đặt vé ngay →</span></p>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {orders.map(o => (
                    <div key={o.id} className="fu" style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontWeight: 500, fontSize: 15 }}>
                          {o.showtime?.movie?.title || `Đơn #${o.id}`}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--txt2)", marginTop: 3 }}>
                          {fmtDate(o.showtime?.showDate)} · {fmtTime(o.showtime?.startTime)} · {o.tickets?.length || 0} vé
                        </div>
                        {o.showtime?.room?.name && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{o.showtime.room.name}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <Badge color={o.status === "PAID" ? "var(--aqua)" : o.status === "CANCELLED" ? "var(--red)" : "var(--gold)"}>{o.status}</Badge>
                        <div style={{ fontSize: 13, color: "var(--gold)", marginTop: 6, fontWeight: 500 }}>{fmt(o.totalAmount)}</div>
                        <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>#{String(o.id).padStart(6, "0")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
//  LOGIN / REGISTER PAGE (PREMIUM UI)
// ═══════════════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" hoặc "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        await apiPost("/api/auth/register", { name: form.name, email: form.email, password: form.password });
        toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
        setMode("login");
      } else {
        const data = await apiPost("/api/auth/login", { email: form.email, password: form.password });
        
        // Kiểm tra xem backend có trả về token không
        if (data && data.token) {
          saveAuth(data.token, data.user);
          toast.success("Đăng nhập thành công!");
          onLogin(data.user);
        } else {
          throw new Error("Đăng nhập thất bại: Không nhận được phản hồi hợp lệ.");
        }
      }
    } catch (error) {
      toast.error(error.message || "Tài khoản hoặc mật khẩu không chính xác!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "20px" }}>
      
      {/* Cinematic Background Blur */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(15px) brightness(0.3) saturate(1.2)", transform: "scale(1.1)", zIndex: 0 }} />

      <Card className="fu" style={{ width: "100%", maxWidth: 420, padding: "40px 32px", position: "relative", zIndex: 1, background: "rgba(17,17,26,0.75)", backdropFilter: "blur(24px)", boxShadow: "0 24px 60px rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24 }}>
        
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 36, fontWeight: 700, color: "var(--gold)", letterSpacing: 2, marginBottom: 8, filter: "drop-shadow(0 0 10px rgba(223,166,91,0.3))" }}>◈ CINÉ</div>
          <div style={{ fontSize: 14, color: "var(--txt2)", textTransform: "uppercase", letterSpacing: 1 }}>
            {mode === "login" ? "Đăng nhập để trải nghiệm" : "Đăng ký thành viên mới"}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "register" && (
            <Field name="name" placeholder="Họ và tên" value={form.name} onChange={handleChange} required />
          )}
          <Field name="email" type="email" placeholder="Địa chỉ Email" value={form.email} onChange={handleChange} required />
          <Field name="password" type="password" placeholder="Mật khẩu" value={form.password} onChange={handleChange} required />

          <Btn size="lg" full disabled={loading} style={{ marginTop: 12, borderRadius: 12, padding: "16px", fontSize: 16, boxShadow: "0 8px 20px rgba(223,166,91,0.2)" }}>
            {loading ? <span className="spin">⟳</span> : (mode === "login" ? "Đăng nhập ngay" : "Tạo tài khoản")}
          </Btn>
        </form>

        <div style={{ marginTop: 28, textAlign: "center", fontSize: 14, color: "var(--txt2)" }}>
          {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
          <span 
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setForm({ name: "", email: "", password: "" }); }} 
            style={{ color: "var(--gold)", cursor: "pointer", fontWeight: 600, transition: "0.2s" }} 
            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"} 
            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
          >
            {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
          </span>
        </div>

      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  APP ROOT (LƯU LỊCH SỬ DUYỆT WEB ĐỂ QUAY LẠI)
// ═══════════════════════════════════════════════════════════════
export default function App() {
  // Dùng mảng History thay vì 1 String để lưu vết các trang đã qua
  const [history, setHistory] = useState(["home"]);
  const page = history[history.length - 1] || "home"; // Trang hiện tại luôn là phần tử cuối cùng của mảng

  // Hàm chuyển trang thông minh
  const setPage = useCallback((newPage) => {
    setHistory(prev => {
      if (prev[prev.length - 1] === newPage) return prev; // Đang ở trang đó rồi thì không push thêm
      if (newPage === "home") return ["home"]; // Nếu ấn về Trang chủ thì xóa sạch lịch sử
      return [...prev, newPage]; // Push trang mới vào lịch sử
    });
  }, []);

  // Hàm lùi lại trang trước đó
  const goBack = useCallback(() => {
    // Chỉ lùi nếu mảng có lớn hơn 1 phần tử (Nghĩa là có trang để lùi)
    setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  }, []);

  const [selMovie, setSelMovie] = useState(null);
  const [booking, setBooking] = useState(null);
  const [user, setUser] = useState(loadUser);

  const goMovie = m => { setSelMovie(m); setPage("movie"); };
  const goBook = m => { if (!user) { setSelMovie(m); setPage("login"); return; } setSelMovie(m); setPage("booking"); };

  const goConfirm = b => {
    setBooking(b);
    // XÓA LỊCH SỬ BOOKING: Khi thanh toán xong, ta ép lịch sử chỉ còn ["home", "confirm"]
    // Điều này chặn khách hàng ấn nút Back để quay ngược lại trang thanh toán gây lỗi double-booking
    setHistory(["home", "confirm"]);
  };

  const goLogin = u => {
    setUser(u);
    // XÓA TRANG LOGIN: Khi login thành công, ta xóa cái bước "login" ra khỏi mảng lịch sử.
    // Để khi người dùng ấn nút Back từ trang Booking, nó sẽ lùi thẳng về trang Chi Tiết Phim chứ không bắt đăng nhập lại.
    setHistory(prev => {
      const cleanHistory = prev.filter(p => p !== "login");
      if (selMovie) return [...cleanHistory, "booking"];
      return ["home"];
    });
  };

return (
    <>
      <style>{CSS}</style>
      <ToastContainer /> {/* <--- THÊM DÒNG NÀY VÀO ĐÂY */}
      
      <Navbar page={page} setPage={setPage} user={user} setUser={setUser} canGoBack={history.length > 1} goBack={goBack} />
      {page === "home" && <HomePage onSelect={goMovie} />}
      {page === "search" && <SearchPage onSelect={goMovie} />}
      {page === "movie" && selMovie && <MovieDetailPage movie={selMovie} onBook={goBook} />}
      {page === "booking" && selMovie && <BookingPage movie={selMovie} user={user} onConfirm={goConfirm} setPage={setPage} />}
      {page === "confirm" && booking && <ConfirmationPage booking={booking} onHome={() => setPage("home")} />}
      {page === "login" && <LoginPage onLogin={goLogin} />}
      {page === "profile" && user && <ProfilePage user={user} setUser={setUser} setPage={setPage} />}
      {page === "admin" && <AdminPage />}
      {page === "scanner" && <TicketScannerPage />}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION SYSTEM (THÔNG BÁO NỔI)
// ═══════════════════════════════════════════════════════════════
export const toast = {
  listeners: [],
  success(msg) { this.listeners.forEach(l => l({ id: Date.now() + Math.random(), msg, type: "success" })); },
  error(msg) { this.listeners.forEach(l => l({ id: Date.now() + Math.random(), msg, type: "error" })); },
  info(msg) { this.listeners.forEach(l => l({ id: Date.now() + Math.random(), msg, type: "info" })); },
  subscribe(listener) {
    this.listeners.push(listener);
    return () => this.listeners = this.listeners.filter(l => l !== listener);
  }
};

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = toast.subscribe(t => {
      setToasts(prev => [...prev, t]);
      // Tự động tắt sau 3.5 giây
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, 3500);
    });
    return unsub;
  }, []);

  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 99999, display: "flex", flexDirection: "column", gap: 12 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ 
          background: "rgba(17,17,26,0.85)", color: "var(--txt)", padding: "16px 24px", borderRadius: 16, 
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)", border: "1px solid var(--brd)",
          borderLeft: `4px solid ${t.type === "success" ? "var(--aqua)" : t.type === "error" ? "var(--red)" : "var(--gold)"}`, 
          display: "flex", alignItems: "center", gap: 14, minWidth: 300, backdropFilter: "blur(16px)",
          animation: "slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}>
          <div style={{ fontSize: 22, filter: "drop-shadow(0 0 10px currentColor)", color: t.type === "success" ? "var(--aqua)" : t.type === "error" ? "var(--red)" : "var(--gold)" }}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{t.msg}</div>
        </div>
      ))}
    </div>
  );
}