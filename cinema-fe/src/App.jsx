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
//  CSS / DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,500;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:   #080810; --bg2: #0f0f1c; --bg3: #181828;
  --brd:  rgba(255,255,255,.07); --brd2: rgba(255,255,255,.14);
  --gold: #c9914a; --gold2: #e8b86d;
  --aqua: #4ecdc4; --red: #e05555;
  --txt:  #ece6db; --txt2: #888899; --dim: #3c3c54;
  --ff:   'Cormorant', Georgia, serif;
  --fb:   'DM Sans', system-ui, sans-serif;
}

html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--txt); font-family: var(--fb); font-size: 15px; line-height: 1.65; min-height: 100vh; }
button { cursor: pointer; border: none; background: none; font-family: var(--fb); }
input, select, textarea { font-family: var(--fb); }
img { display: block; }

::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: var(--bg2); }
::-webkit-scrollbar-thumb { background: var(--dim); border-radius: 3px; }

@keyframes up   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes glim { 0%,100%{opacity:1} 50%{opacity:.35} }

.fu  { animation: up .36s ease both; }
.fu2 { animation: up .36s .08s ease both; }
.fu3 { animation: up .36s .16s ease both; }
.spin { display: inline-block; animation: spin .65s linear infinite; }
.skel { animation: glim 1.4s infinite; background: var(--bg3); border-radius: 8px; }
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
//  NAVBAR
// ═══════════════════════════════════════════════════════════════
function Navbar({ page, setPage, user, setUser }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 60, padding: "0 5vw", display: "flex", alignItems: "center", justifyContent: "space-between", background: scrolled ? "rgba(8,8,16,.94)" : "transparent", backdropFilter: scrolled ? "blur(18px)" : "none", borderBottom: scrolled ? "1px solid var(--brd)" : "none", transition: "all .3s" }}>
      <div onClick={() => setPage("home")} style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 22, fontWeight: 300, color: "var(--gold)", cursor: "pointer", letterSpacing: 1 }}>◈ CINÉ</div>
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
//  HOME PAGE
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
    const t = setInterval(() => setHeroIdx(i => (i + 1) % Math.min(movies.length, 5)), 5500);
    return () => clearInterval(t);
  }, [movies.length]);

  // SỬA Ở ĐÂY: API không có trường 'status', nên gán trực tiếp movies vào showing
  const showing = movies;
  const coming = [];
  const hero = showing[heroIdx % Math.max(showing.length, 1)];

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Hero */}
      {hero && (
        <div style={{ position: "relative", height: "90vh", minHeight: 520, overflow: "hidden" }}>
          <img src={hero.posterUrl || `https://picsum.photos/seed/h${hero.id}/900/500`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(4px) brightness(.24)", transform: "scale(1.07)", transition: "all 1.2s" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg,rgba(8,8,16,.94) 0%,rgba(8,8,16,.25) 62%,transparent)" }} />
          <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8vw", paddingTop: 60 }}>
            <div className="fu" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <Badge color="var(--aqua)">Đang chiếu</Badge>
              {hero.genre && <Badge>{hero.genre}</Badge>}
            </div>
            <h1 className="fu2" style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: "clamp(38px,6vw,78px)", fontWeight: 300, lineHeight: 1.08, marginBottom: 12, maxWidth: 560 }}>{hero.title}</h1>
            <div className="fu2" style={{ display: "flex", gap: 16, color: "var(--txt2)", fontSize: 13, marginBottom: 14, flexWrap: "wrap" }}>
              {hero.rating && <Stars v={hero.rating} />}
              {hero.duration && <span>⏱ {hero.duration}</span>}
              {hero.director && <span>🎬 {hero.director}</span>}
              {/* SỬA Ở ĐÂY: Đổi hero.releaseYear thành hero.year cho khớp API */}
              {hero.year && <span>📅 {hero.year}</span>}
            </div>
            {hero.description && <p className="fu3" style={{ maxWidth: 430, color: "rgba(236,230,219,.7)", lineHeight: 1.8, marginBottom: 26, fontSize: 14 }}>{hero.description.slice(0, 140)}{hero.description.length > 140 ? "…" : ""}</p>}
            <div className="fu3" style={{ display: "flex", gap: 12 }}>
              <Btn size="lg" onClick={() => onSelect(hero)}>🎬 Đặt vé ngay</Btn>
              <Btn size="lg" variant="ghost" onClick={() => onSelect(hero)}>Xem chi tiết</Btn>
            </div>
          </div>
          {showing.length > 1 && (
            <div style={{ position: "absolute", bottom: 26, left: "8vw", display: "flex", gap: 9, zIndex: 2 }}>
              {showing.slice(0, 5).map((m, i) => (
                <div key={m.id} onClick={() => setHeroIdx(i)} style={{ width: i === heroIdx ? 68 : 48, height: i === heroIdx ? 68 : 48, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `2px solid ${i === heroIdx ? "var(--gold)" : "transparent"}`, opacity: i === heroIdx ? 1 : .42, transition: "all .3s" }}>
                  <img src={m.posterUrl || `https://picsum.photos/seed/th${m.id}/100/150`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: "52px 5vw 0" }}>
        {err && <div style={{ color: "var(--txt2)", textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>⚠️</div>
          <p>Không kết nối được backend ({err})</p>
          <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 6 }}>Kiểm tra api-gateway tại localhost:8080 và đăng nhập để lấy JWT token</p>
        </div>}

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 20 }}>
            {Array(8).fill(0).map((_, i) => <div key={i} className="skel" style={{ aspectRatio: "2/3", borderRadius: 12 }} />)}
          </div>
        ) : (
          <>
            {showing.length > 0 && <Section title="Đang chiếu" movies={showing} onSelect={onSelect} />}
            {coming.length > 0 && <Section title="Sắp chiếu" movies={coming} onSelect={onSelect} style={{ marginTop: 52 }} />}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, movies, onSelect, style = {} }) {
  return (
    <div style={style}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <h2 style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 28, fontWeight: 300, whiteSpace: "nowrap" }}>{title}</h2>
        <div style={{ flex: 1, height: 1, background: "var(--brd)" }} />
        <span style={{ fontSize: 12, color: "var(--txt2)" }}>{movies.length} phim</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 20 }}>
        {movies.map(m => <MovieCard key={m.id} movie={m} onClick={onSelect} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MOVIE DETAIL
// ═══════════════════════════════════════════════════════════════
function MovieDetailPage({ movie, onBook }) {
  const [detail, setDetail] = useState(movie);
  const [showTrailer, setShowTrailer] = useState(false); // State quản lý mở/đóng Modal Trailer

  useEffect(() => {
    apiGet(`/api/movies/${movie.id}`)
      .then(data => setDetail(data))
      .catch(console.error);
  }, [movie.id]);

  const poster = detail.posterUrl || `https://picsum.photos/seed/dt${detail.id}/400/600`;

  // Kiểm tra xem phim có trailer không (dựa trên trường trailerUrl bạn đã map ở BE)
  const hasTrailer = !!detail.trailerUrl;

  // Hàm chuyển đổi URL Youtube dạng watch?v= sang dạng embed/ (để iframe có thể phát)
  const getEmbedUrl = (url) => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11)
      ? `https://www.youtube.com/embed/${match[2]}?autoplay=1`
      : url; // Trả lại url gốc nếu không phải dạng chuẩn Youtube
  };

  return (
    <div style={{ paddingTop: 100, paddingLeft: "5vw", paddingRight: "5vw", minHeight: "100vh", position: "relative" }}>
      <div className="fu" style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        {/* Cột Trái: Poster */}
        <div style={{ position: "relative", width: 280, flexShrink: 0 }}>
          <img src={poster} alt={detail.title} style={{ width: "100%", borderRadius: 14, objectFit: "cover", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />

          {/* Nút Play đè lên Poster (Chỉ hiện khi có trailer) */}
          {hasTrailer && (
            <div
              onClick={() => setShowTrailer(true)}
              style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", borderRadius: 14, cursor: "pointer", transition: "all 0.3s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.5)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.3)"}
            >
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(201,145,74,0.5)" }}>
                <div style={{ width: 0, height: 0, borderTop: "12px solid transparent", borderBottom: "12px solid transparent", borderLeft: "20px solid #000", marginLeft: 6 }} />
              </div>
            </div>
          )}
        </div>

        {/* Cột Phải: Thông tin */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <Badge>{detail.genre || "Đang cập nhật"}</Badge>
          <h1 style={{ fontFamily: "var(--ff)", fontSize: 44, color: "var(--gold)", margin: "10px 0" }}>{detail.title}</h1>

          <div style={{ display: "flex", gap: 16, color: "var(--txt2)", fontSize: 14, marginBottom: 20 }}>
            {detail.rating && <Stars v={detail.rating} />}
            {detail.duration && <span>⏱ {detail.duration}</span>}
            {detail.director && <span>🎬 {detail.director}</span>}
            {detail.year && <span>📅 {detail.year}</span>}
          </div>

          <p style={{ color: "var(--txt2)", marginBottom: 30, lineHeight: 1.8 }}>{detail.description || "Đang cập nhật nội dung..."}</p>

          <div style={{ background: "var(--bg2)", padding: "16px 20px", borderRadius: 12, border: "1px solid var(--brd)", maxWidth: 400, marginBottom: 24 }}>
            <h3 style={{ fontFamily: "var(--ff)", fontSize: 18, marginBottom: 8 }}>Thông tin đặt vé</h3>
            <p style={{ fontSize: 13, color: "var(--txt2)", lineHeight: 1.6, margin: 0 }}>
              Giá vé thay đổi linh hoạt theo suất chiếu và loại ghế. Vui lòng chọn suất chiếu để xem giá chi tiết.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Btn size="lg" onClick={() => onBook(detail)}>🎬 Mua vé ngay</Btn>
            {hasTrailer && (
              <Btn size="lg" variant="ghost" onClick={() => setShowTrailer(true)}>▶ Xem Trailer</Btn>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL XEM TRAILER */}
      {/* ───────────────────────────────────────────────────────── */}
      {showTrailer && hasTrailer && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "5vw" }}>

          {/* Nút Đóng */}
          <div
            onClick={() => setShowTrailer(false)}
            style={{ position: "absolute", top: 20, right: 30, color: "#fff", fontSize: 40, cursor: "pointer", opacity: 0.7, transition: "0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
          >
            &times;
          </div>

          {/* Khung Video */}
          <div className="fu" style={{ width: "100%", maxWidth: 1000, aspectRatio: "16/9", background: "#000", borderRadius: 12, overflow: "hidden", border: "1px solid var(--brd)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <iframe
              width="100%"
              height="100%"
              src={getEmbedUrl(detail.trailerUrl)}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: "none" }}
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BOOKING PAGE (Lấy giá động từ API basePrice)
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

  // Fetch ghế
  useEffect(() => {
    if (selShowtime && selShowtime.room) {
      let initialSeats = genSeats(selShowtime.room.capacity);
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

  // HÀM TÍNH GIÁ ĐỘNG DỰA TRÊN BASEPRICE CỦA API
  const getDynamicPrice = (seatType) => {
    if (!selShowtime) return 0;
    const base = selShowtime.basePrice || 0;
    if (seatType === "couple") return base * 2;       // Ghế đôi tính tiền 2 vé
    if (seatType === "vip") return base + 20000;      // Ghế VIP phụ thu 20k (bạn có thể tự điều chỉnh)
    return base;                                      // Ghế thường
  };

  const selected = seats.filter(s => s.selected);
  const totalAmount = selected.reduce((total, seat) => total + getDynamicPrice(seat.type), 0);

  const toggleSeat = (sid) => setSeats(ss => ss.map(s => s.id === sid && !s.taken ? { ...s, selected: !s.selected } : s));

  const handlePayment = async () => {
    if (!user) { alert("Vui lòng đăng nhập!"); setPage("login"); return; }
    setIsSubmitting(true);
    try {
      // data lúc này chính là chuỗi mã vé (VD: "FE36F77C")
      const data = await apiPost("/api/orders/create", {
        userId: user.id, showtimeId: selShowtime.id, seatNumbers: selected.map(s => s.id), payMethod
      });

      // SỬA Ở ĐÂY: Thay orderId: data.id thành orderId: data
      onConfirm({ movie, date: selDate, showtime: selShowtime, seats: selected, total: totalAmount, orderId: data, payMethod });
    } catch (error) {
      alert("❌ Lỗi: Ghế có thể đã bị đặt hoặc hệ thống bận (" + error.message + ").");
    } finally { setIsSubmitting(false); }
  };

  const steps = ["Chọn suất chiếu", "Chọn ghế", "Thanh toán"];
  const durationText = movie.duration ? (String(movie.duration).includes("phút") ? movie.duration : `${movie.duration} phút`) : "120 phút";

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", paddingBottom: 80 }}>
      {/* HEADER TÓM TẮT PHIM */}
      <div style={{ background: "linear-gradient(to bottom, rgba(8,8,16,0.9), var(--bg))", padding: "0 5vw 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 16, alignItems: "center" }}>
          <img src={movie.posterUrl || `https://picsum.photos/seed/bk${movie.id}/60/90`} alt="" style={{ width: 60, height: 90, borderRadius: 8, objectFit: "cover", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }} />
          <div>
            <h2 style={{ fontFamily: "var(--ff)", fontSize: 24, margin: 0, color: "var(--gold)" }}>{movie.title}</h2>
            <div style={{ fontSize: 13, color: "var(--txt2)", marginTop: 4 }}>{movie.genre} • {durationText}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, padding: "20px 5vw", maxWidth: 1100, margin: "0 auto" }}>

        {/* CỘT TRÁI: NỘI DUNG CHÍNH */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>

          {/* THANH TIẾN TRÌNH */}
          <div style={{ display: "flex", position: "relative", marginBottom: 10 }}>
            {steps.map((label, idx) => {
              const isActive = step === idx + 1;
              const isPassed = step > idx + 1;
              return (
                <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  {idx < steps.length - 1 && (
                    <div style={{ position: "absolute", top: 15, left: "50%", width: "100%", height: 2, background: isPassed ? "var(--gold)" : "var(--brd)", zIndex: 0 }} />
                  )}
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: isActive || isPassed ? "var(--gold)" : "var(--bg2)", border: `2px solid ${isActive || isPassed ? "var(--gold)" : "var(--brd)"}`, color: isActive || isPassed ? "#080810" : "var(--txt2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 14, zIndex: 1, position: "relative", transition: "0.3s" }}>
                    {isPassed ? "✓" : idx + 1}
                  </div>
                  <span style={{ fontSize: 12, color: isActive ? "var(--gold)" : "var(--txt2)", fontWeight: isActive ? 600 : 400, marginTop: 8, whiteSpace: "nowrap" }}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* BƯỚC 1: CHỌN NGÀY & SUẤT */}
          {step === 1 && (
            <div className="fu" style={{ background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--brd)", padding: 24 }}>
              <div style={{ fontSize: 13, color: "var(--txt2)", marginBottom: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Chọn ngày chiếu</div>
              <div style={{ display: "flex", gap: 12, marginBottom: 32, overflowX: "auto", paddingBottom: 8 }}>
                {dates.map((d, idx) => {
                  const [y, m, day] = d.val.split("-");
                  const dateObj = new Date(y, m - 1, day);
                  const topText = idx === 0 ? "Hôm nay" : idx === 1 ? "Ngày mai" : dateObj.toLocaleDateString("vi-VN", { weekday: "short" });
                  const bottomText = `${day}/${m}`;

                  return (
                    <div key={d.val} onClick={() => setSelDate(d.val)} style={{ padding: "12px 20px", borderRadius: 12, cursor: "pointer", background: selDate === d.val ? "rgba(201,145,74,0.15)" : "var(--bg)", border: `1px solid ${selDate === d.val ? "var(--gold)" : "var(--brd)"}`, color: selDate === d.val ? "var(--gold)" : "var(--txt)", textAlign: "center", minWidth: 100, transition: "all 0.2s", transform: selDate === d.val ? "translateY(-2px)" : "none" }}>
                      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, textTransform: "capitalize" }}>{topText}</div>
                      <div style={{ fontSize: 16, fontWeight: "bold" }}>{bottomText}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: 13, color: "var(--txt2)", marginBottom: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Suất chiếu có sẵn</div>
              {showtimes.length === 0 ? <div style={{ color: "var(--dim)", fontStyle: "italic", padding: "20px 0" }}>Chưa có lịch chiếu cho ngày này.</div> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
                  {showtimes.map(st => (
                    <div key={st.id} onClick={() => setSelShowtime(st)} style={{ padding: "14px", borderRadius: 12, cursor: "pointer", background: selShowtime?.id === st.id ? "var(--gold)" : "var(--bg)", color: selShowtime?.id === st.id ? "#000" : "var(--txt)", border: `1px solid ${selShowtime?.id === st.id ? "var(--gold)" : "var(--brd)"}`, transition: "all 0.2s", textAlign: "center", boxShadow: selShowtime?.id === st.id ? "0 4px 12px rgba(201,145,74,0.3)" : "none" }}>
                      <div style={{ fontFamily: "var(--ff)", fontSize: 22, fontWeight: "bold", lineHeight: 1 }}>{fmtTime(st.startTime)}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.room?.name || "Phòng chiếu"}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--brd)", marginTop: 32, paddingTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <Btn disabled={!selShowtime} onClick={() => setStep(2)}>Tiếp tục: Chọn ghế →</Btn>
              </div>
            </div>
          )}

          {/* BƯỚC 2: CHỌN GHẾ */}
          {step === 2 && (
            <div className="fu" style={{ background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--brd)", padding: "30px 20px" }}>

              <div style={{ textAlign: "center", marginBottom: 50, position: "relative" }}>
                <div style={{ position: "relative", width: "80%", height: 40, margin: "0 auto", borderTop: "4px solid var(--gold)", borderRadius: "50% 50% 0 0", filter: "drop-shadow(0 -5px 15px rgba(201,145,74,0.4))", background: "linear-gradient(to bottom, rgba(201,145,74,0.1), transparent)" }} />
                <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "var(--gold)", letterSpacing: 4, fontWeight: "bold" }}>MÀN HÌNH</div>
              </div>

              <div style={{ overflowX: "auto", paddingBottom: 20 }}>
                {["A", "B", "C", "D", "E", "F", "G", "H"].map(row => {
                  const rowSeats = seats.filter(s => s.row === row);
                  if (rowSeats.length === 0) return null;
                  return (
                    <div key={row} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, justifyContent: "center" }}>
                      <span style={{ width: 20, fontSize: 12, color: "var(--txt2)", fontWeight: "bold", textAlign: "right", marginRight: 8 }}>{row}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {rowSeats.map((s, idx) => {
                          let bgColor = s.type === "couple" ? "#7c3aed" : s.type === "vip" ? "#b91c1c" : "var(--bg3)";
                          let borderColor = s.type === "couple" ? "#6d28d9" : s.type === "vip" ? "#991b1b" : "var(--brd)";
                          let width = s.type === "couple" ? 56 : 28;

                          if (s.taken) { bgColor = "#1f1f28"; borderColor = "transparent"; }
                          if (s.selected) { bgColor = "var(--gold)"; borderColor = "#fff"; }

                          let marginLeft = idx === Math.floor(rowSeats.length / 2) ? 20 : 0;

                          return (
                            <div
                              key={s.id}
                              onClick={() => toggleSeat(s.id)}
                              title={`${s.id} - ${fmt(getDynamicPrice(s.type))}`} // Hover để xem giá từng ghế
                              style={{ width, height: 28, marginLeft, borderRadius: "6px 6px 2px 2px", background: bgColor, border: `1px solid ${borderColor}`, cursor: s.taken ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: s.selected ? "#000" : (s.taken ? "rgba(255,255,255,0.2)" : "#fff"), opacity: s.taken ? 0.6 : 1, transition: "all 0.2s", fontWeight: "bold", boxShadow: s.selected ? "0 0 10px rgba(201,145,74,0.6)" : "inset 0 -4px 0 rgba(0,0,0,0.2)", transform: s.selected ? "scale(1.1)" : "scale(1)" }}>
                              {s.num}
                            </div>
                          );
                        })}
                      </div>
                      <span style={{ width: 20, fontSize: 12, color: "var(--txt2)", fontWeight: "bold", textAlign: "left", marginLeft: 8 }}>{row}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--brd)" }}>
                {[{ label: "Đã bán", color: "#1f1f28" }, { label: "Thường", color: "var(--bg3)", brd: "var(--brd)" }, { label: "VIP", color: "#b91c1c" }, { label: "Cặp đôi", color: "#7c3aed" }].map(lg => (
                  <div key={lg.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--txt2)" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: lg.color, border: `1px solid ${lg.brd || lg.color}` }} />
                    {lg.label}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "space-between" }}>
                <Btn variant="ghost" onClick={() => setStep(1)}>← Đổi suất chiếu</Btn>
                <Btn disabled={selected.length === 0} onClick={() => setStep(3)}>Tiếp tục ({selected.length} ghế) →</Btn>
              </div>
            </div>
          )}

          {/* BƯỚC 3: THANH TOÁN */}
          {step === 3 && (
            <div className="fu" style={{ background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--brd)", padding: 24 }}>
              <div style={{ fontSize: 13, color: "var(--txt2)", marginBottom: 16, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Phương thức thanh toán</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 30 }}>
                {[
                  { id: "momo", name: "Ví MoMo", color: "#a50064", icon: "👛" },
                  { id: "vnpay", name: "VNPay", color: "#005baa", icon: "🏦" },
                  { id: "zalopay", name: "ZaloPay", color: "#0068ff", icon: "💬" },
                  { id: "cash", name: "Tại quầy", color: "var(--aqua)", icon: "🎟️" }
                ].map(pm => (
                  <div key={pm.id} onClick={() => setPayMethod(pm.id)} style={{ padding: "16px", borderRadius: 12, cursor: "pointer", background: payMethod === pm.id ? `${pm.color}15` : "var(--bg)", border: `2px solid ${payMethod === pm.id ? pm.color : "var(--brd)"}`, display: "flex", alignItems: "center", gap: 12, transition: "0.2s" }}>
                    <div style={{ fontSize: 24 }}>{pm.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{pm.name}</div>
                    {payMethod === pm.id && <div style={{ marginLeft: "auto", color: pm.color, fontWeight: "bold" }}>✓</div>}
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(201,145,74,.05)", border: "1px dashed rgba(201,145,74,.3)", borderRadius: 8, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "var(--txt2)", display: "flex", gap: 10 }}>
                <span style={{ color: "var(--gold)" }}>ⓘ</span> Vé đã mua không thể hoàn hoặc đổi trả. Vui lòng kiểm tra lại thông tin ghế ngồi.
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
                <Btn variant="ghost" onClick={() => setStep(2)}>← Chọn lại ghế</Btn>
                <Btn size="lg" onClick={handlePayment} disabled={isSubmitting}>
                  {isSubmitting ? "Đang xử lý..." : `Thanh toán ${fmt(totalAmount)}`}
                </Btn>
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: TICKET SIDEBAR */}
        <div>
          <div style={{ position: "sticky", top: 80, background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--brd)", filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))", overflow: "hidden" }}>

            {/* Header Ticket */}
            <div style={{ padding: "20px 20px 16px", borderBottom: "2px dashed var(--brd)", position: "relative", background: "linear-gradient(135deg, rgba(201,145,74,0.1), transparent)" }}>
              <div style={{ position: "absolute", bottom: -10, left: -10, width: 20, height: 20, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--brd)" }} />
              <div style={{ position: "absolute", bottom: -10, right: -10, width: 20, height: 20, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--brd)" }} />

              <div style={{ fontSize: 11, color: "var(--txt2)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Tóm tắt đơn hàng</div>
              <h3 style={{ fontFamily: "var(--ff)", fontSize: 22, margin: 0, color: "#fff", lineHeight: 1.2 }}>{movie.title}</h3>
            </div>

            {/* Body Ticket */}
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--txt2)" }}>Rạp chiếu</span>
                <span style={{ fontWeight: 600 }}>CinéHub Center</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--txt2)" }}>Suất chiếu</span>
                {selShowtime ? (
                  <span style={{ color: "var(--gold)", fontWeight: "bold", textAlign: "right" }}>
                    {fmtTime(selShowtime.startTime)}<br />
                    <span style={{ color: "var(--txt)", fontWeight: 400, fontSize: 12 }}>{selDate} ({selShowtime.room?.name})</span>
                  </span>
                ) : <span style={{ color: "var(--dim)" }}>Chưa chọn</span>}
              </div>

              {selected.length > 0 && (
                <>
                  <div style={{ width: "100%", height: 1, background: "var(--brd)", margin: "4px 0" }} />
                  <div style={{ fontSize: 13 }}>
                    <div style={{ color: "var(--txt2)", marginBottom: 8 }}>Ghế đã chọn ({selected.length})</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selected.map(s => (
                        <Badge key={s.id} color={s.type === 'couple' ? '#7c3aed' : s.type === 'vip' ? '#b91c1c' : 'var(--gold)'}>
                          {s.id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Ticket */}
            <div style={{ background: "rgba(0,0,0,0.2)", padding: 20, borderTop: "2px dashed var(--brd)", position: "relative" }}>
              <div style={{ position: "absolute", top: -10, left: -10, width: 20, height: 20, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--brd)" }} />
              <div style={{ position: "absolute", top: -10, right: -10, width: 20, height: 20, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--brd)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ color: "var(--txt2)", fontSize: 13 }}>Tổng thanh toán</span>
                <span style={{ fontFamily: "var(--ff)", fontSize: 28, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>{fmt(totalAmount)}</span>
              </div>
              {step === 3 && (
                <div style={{ marginTop: 12, textAlign: "right", fontSize: 11, color: "var(--dim)", textTransform: "uppercase" }}>
                  Qua: {payMethod.toUpperCase()}
                </div>
              )}
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
    alert(`✅ Đã xác nhận vé cho khách hàng: ${order.userName}`);
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
//  ADMIN — CRUD phim/phòng/suất chiếu
// ═══════════════════════════════════════════════════════════════
function AdminPage() {
  const [tab, setTab] = useState("movies");
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(() => {
    apiGet("/api/movies").then(d => setMovies(Array.isArray(d) ? d : [])).catch(() => { });
    // GET /api/rooms → Page<Room>
    apiGet("/api/rooms").then(d => setRooms(d.content || (Array.isArray(d) ? d : []))).catch(() => { });
    // GET /api/showtimes/filter?page=0&size=20 (sau khi fix — KHÔNG dùng sort param tùy ý)
    apiGet("/api/showtimes/filter?page=0&size=20").then(d => setShowtimes(d.content || [])).catch(() => { });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const inpSt = { width: "100%", padding: "10px 13px", borderRadius: 7, background: "var(--bg3)", border: "1px solid var(--brd)", color: "var(--txt)", fontSize: 14, outline: "none", marginBottom: 12 };

  // POST /api/movies/create  multipart: movie(JSON) + file
  const handleMovie = async e => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData(e.target);

    // Lấy thông tin trailer (nếu có nhập)
    const trailerTitle = fd.get("trailerTitle");
    const trailerUrl = fd.get("trailerUrl");
    const trailers = trailerUrl ? [{ title: trailerTitle || "Official Trailer", videoUrl: trailerUrl }] : [];

    const movieJson = {
      title: fd.get("title"),
      genre: fd.get("genre"),
      releaseYear: fd.get("releaseYear"),
      director: fd.get("director"),
      duration: fd.get("duration"),
      description: fd.get("description"),
      status: "showing",
      rating: 8.0,
      trailers: trailers // Truyền list trailer xuống BE
    };

    const body = new FormData();
    body.append("movie", new Blob([JSON.stringify(movieJson)], { type: "application/json" }));
    if (fd.get("file")?.size > 0) body.append("file", fd.get("file"));

    try {
      await apiPostForm("/api/movies/create", body);
      alert("✅ Tạo phim thành công!");
      e.target.reset();
      fetchAll();
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    }
    setSaving(false);
  };

  // POST /api/rooms/create  {name, capacity}
  const handleRoom = async e => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData(e.target);
    try { await apiPost("/api/rooms/create", { name: fd.get("name"), capacity: parseInt(fd.get("capacity")) }); alert("✅ Tạo phòng thành công!"); e.target.reset(); fetchAll(); }
    catch (err) { alert("❌ Lỗi: " + err.message); }
    setSaving(false);
  };

  // POST /api/showtimes/create  {movieId, roomId, showDate:"YYYY-MM-DD", startTime:"HH:MM:SS", basePrice}
  const handleShowtime = async e => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData(e.target);
    const raw = fd.get("startTime"); // "2024-12-25T09:00"
    const showDate = raw.split("T")[0];          // "2024-12-25"
    const startTime = raw.split("T")[1] + ":00"; // "09:00:00"
    try {
      await apiPost("/api/showtimes/create", { movieId: parseInt(fd.get("movieId")), roomId: parseInt(fd.get("roomId")), showDate, startTime, basePrice: parseFloat(fd.get("basePrice")) });
      alert("✅ Tạo suất chiếu thành công!"); e.target.reset(); fetchAll();
    } catch (err) { alert("❌ Lỗi: " + err.message); }
    setSaving(false);
  };

  return (
    <div style={{ paddingTop: 60, minHeight: "100vh", padding: "90px 5vw 60px" }}>
      <h1 style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 32, fontWeight: 300, color: "var(--gold)", marginBottom: 22 }}>Quản trị hệ thống</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 26 }}>
        {[["movies", "🎬 Phim"], ["rooms", "🏛 Phòng chiếu"], ["showtimes", "🕘 Suất chiếu"]].map(([k, l]) => (
          <Btn key={k} variant={tab === k ? "primary" : "ghost"} onClick={() => setTab(k)}>{l}</Btn>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 22 }}>
        {/* Form */}
        <Card style={{ padding: 22 }}>
          <h3 style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 18, marginBottom: 18 }}>Thêm {tab === "movies" ? "Phim" : tab === "rooms" ? "Phòng" : "Suất chiếu"}</h3>

          {tab === "movies" && (
            <form onSubmit={handleMovie}>
              <input name="title" placeholder="Tên phim *" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
              <input name="genre" placeholder="Thể loại *" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
              <input name="releaseYear" placeholder="Năm (VD: 2024) *" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
              <input name="director" placeholder="Đạo diễn *" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
              <input name="duration" placeholder="Thời lượng (VD: 120 phút) *" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
              <textarea name="description" placeholder="Mô tả nội dung..." rows={3} style={{ ...inpSt, resize: "vertical" }} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />

              <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--brd)", marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "var(--gold)", display: "block", marginBottom: 8, fontWeight: "bold" }}>THÊM TRAILER (TÙY CHỌN)</label>
                <input name="trailerTitle" placeholder="Tên Trailer (VD: Official Trailer)" style={{ ...inpSt, marginBottom: 8 }} onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
                <input name="trailerUrl" placeholder="Link Video (Youtube/URL)" style={{ ...inpSt, marginBottom: 0 }} onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
              </div>

              <label style={{ fontSize: 11, color: "var(--txt2)", display: "block", marginBottom: 5 }}>Ảnh poster</label>
              <input name="file" type="file" accept="image/*" style={{ ...inpSt, padding: "6px" }} />

              <Btn full disabled={saving} style={{ marginTop: 4 }}>{saving ? <><span className="spin">⟳</span> Đang lưu...</> : "Lưu phim"}</Btn>
            </form>
          )}

          {tab === "rooms" && (
            <form onSubmit={handleRoom}>
              <input name="name" placeholder="Tên phòng *" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
              <input name="capacity" type="number" min={1} placeholder="Sức chứa (số ghế) *" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
              <Btn full disabled={saving}>{saving ? <><span className="spin">⟳</span> Đang lưu...</> : "Lưu phòng"}</Btn>
            </form>
          )}

          {tab === "showtimes" && (
            <form onSubmit={handleShowtime}>
              <select name="movieId" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"}>
                <option value="">— Chọn phim —</option>
                {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <select name="roomId" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"}>
                <option value="">— Chọn phòng chiếu —</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity} ghế)</option>)}
              </select>
              <label style={{ fontSize: 11, color: "var(--txt2)", display: "block", marginBottom: 5 }}>Thời gian bắt đầu</label>
              <input name="startTime" type="datetime-local" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
              <input name="basePrice" type="number" min={0} placeholder="Giá vé (VD: 90000) *" style={inpSt} required onFocus={e => e.target.style.borderColor = "var(--gold)"} onBlur={e => e.target.style.borderColor = "var(--brd)"} />
              <Btn full disabled={saving}>{saving ? <><span className="spin">⟳</span> Đang lưu...</> : "Lưu suất chiếu"}</Btn>
            </form>
          )}
        </Card>

        {/* List */}
        <Card style={{ padding: 22 }}>
          <h3 style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 18, marginBottom: 18 }}>Danh sách</h3>
          {tab === "movies" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 14 }}>
              {movies.map(m => <MovieCard key={m.id} movie={m} compact />)}
            </div>
          )}
          {tab === "rooms" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rooms.length === 0 && <p style={{ color: "var(--txt2)", fontSize: 14 }}>Chưa có phòng nào.</p>}
              {rooms.map(r => (
                <div key={r.id} style={{ padding: "12px 16px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--brd)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 500 }}>{r.name}</span>
                  <span style={{ color: "var(--txt2)", fontSize: 13 }}>{r.capacity} ghế</span>
                </div>
              ))}
            </div>
          )}
          {tab === "showtimes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {showtimes.length === 0 && <p style={{ color: "var(--txt2)", fontSize: 14 }}>Chưa có suất chiếu nào.</p>}
              {showtimes.map(st => (
                <div key={st.id} style={{ padding: "13px 16px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--brd)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "var(--ff)", fontWeight: 500, color: "var(--gold)" }}>{st.movie?.title || `Phim #${st.movie?.id}`}</div>
                    <div style={{ fontSize: 12, color: "var(--txt2)", marginTop: 3 }}>{fmtDate(st.showDate)} · {fmtTime(st.startTime)} · {st.room?.name}</div>
                  </div>
                  <div style={{ color: "var(--gold)", fontWeight: 500, fontSize: 13 }}>{fmt(st.basePrice)}</div>
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
//  LOGIN — POST /api/auth/login {email,password} → {token, user:{id,name,email}}
//          POST /api/auth/register {name,email,password} → User
// ═══════════════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async () => {
    if (!form.email || !form.password) return;
    setLoading(true); setErr("");
    try {
      if (mode === "register") {
        // POST /api/auth/register  body: {name, email, password}
        await apiPost("/api/auth/register", { name: form.name, email: form.email, password: form.password });
        alert("✅ Đăng ký thành công! Vui lòng đăng nhập.");
        setMode("login");
      } else {
        // POST /api/auth/login  body: {email, password}  → {token, user:{id,name,email}}
        const data = await apiPost("/api/auth/login", { email: form.email, password: form.password });
        saveAuth(data.token, data.user);
        onLogin(data.user);
      }
    } catch (e) {
      setErr(e.message === "401" ? "Sai email hoặc mật khẩu." : "Lỗi kết nối server (" + e.message + ")");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
      <div className="fu" style={{ width: "100%", maxWidth: 380, padding: "36px 32px", background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--brd)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--ff)", fontStyle: "italic", fontSize: 26, fontWeight: 300, color: "var(--gold)" }}>◈ CINÉ</div>
          <div style={{ color: "var(--txt2)", fontSize: 13, marginTop: 5 }}>{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</div>
        </div>
        {err && <div style={{ background: "rgba(224,85,85,.12)", border: "1px solid rgba(224,85,85,.3)", borderRadius: 7, padding: "9px 13px", marginBottom: 14, fontSize: 13, color: "var(--red)" }}>{err}</div>}
        {mode === "register" && <Field label="Họ tên" value={form.name} onChange={set("name")} placeholder="Nguyễn Văn A" />}
        <Field label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
        <Field label="Mật khẩu" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />
        <Btn full disabled={loading} style={{ marginTop: 6 }} onClick={handle}>
          {loading ? <><span className="spin">⟳</span> Đang xử lý...</> : (mode === "login" ? "Đăng nhập" : "Tạo tài khoản")}
        </Btn>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--txt2)" }}>
          {mode === "login" ? <>Chưa có tài khoản? <span onClick={() => { setMode("register"); setErr(""); }} style={{ color: "var(--gold)", cursor: "pointer" }}>Đăng ký</span></>
            : <>Đã có tài khoản? <span onClick={() => { setMode("login"); setErr(""); }} style={{ color: "var(--gold)", cursor: "pointer" }}>Đăng nhập</span></>}
        </div>
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
//  APP ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("home");
  const [selMovie, setSelMovie] = useState(null);
  const [booking, setBooking] = useState(null);
  const [user, setUser] = useState(loadUser);

  const goMovie = m => { setSelMovie(m); setPage("movie"); };
  const goBook = m => { if (!user) { setSelMovie(m); setPage("login"); return; } setSelMovie(m); setPage("booking"); };
  const goConfirm = b => { setBooking(b); setPage("confirm"); };
  const goLogin = u => { setUser(u); setPage(selMovie ? "booking" : "home"); };

  return (
    <>
      <style>{CSS}</style>
      <Navbar page={page} setPage={setPage} user={user} setUser={setUser} />
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