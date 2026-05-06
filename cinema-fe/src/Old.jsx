import { useState, useEffect, useCallback } from "react";

// ─── CẤU HÌNH ĐỊNH TUYẾN API (MICROSERVICES) ─────────────────────────────────
const CORE_API_BASE = "http://localhost:8080/api";     
const SEARCH_API_BASE = "http://localhost:8080/api";   

// ─── Design System ───────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --c-bg:       #0a0a0f;
    --c-surface:  #12121a;
    --c-card:     #1a1a26;
    --c-border:   rgba(255,255,255,0.07);
    --c-gold:     #e8b86d;
    --c-red:      #e05c5c;
    --c-text:     #f0eee8;
    --c-muted:    #8a8a9a;
    --c-dim:      #4a4a5a;
    --ff-display: 'Playfair Display', Georgia, serif;
    --ff-body:    'DM Sans', system-ui, sans-serif;
    --r-sm: 8px; --r-md: 12px; --r-lg: 18px; --r-xl: 24px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--c-bg); color: var(--c-text); font-family: var(--ff-body); font-size: 15px; line-height: 1.6; min-height: 100vh; }
  button { cursor: pointer; border: none; background: none; font-family: var(--ff-body); }
  input, select, textarea { font-family: var(--ff-body); }

  @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
  .fade-up { animation: fadeUp .45s ease both; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: var(--c-surface); }
  ::-webkit-scrollbar-thumb { background: var(--c-dim); border-radius: 4px; }
`;

// ─── HÀM AN TOÀN (CHỐNG CRASH REACT) ──────────────────────────────────────────
const fmt = n => (n || 0).toLocaleString("vi-VN") + "đ";

const safeFormatTime = (val) => {
  if (!val) return "00:00";
  if (Array.isArray(val)) {
    return `${String(val[3] || 0).padStart(2, '0')}:${String(val[4] || 0).padStart(2, '0')}`;
  }
  const StringVal = String(val);
  const timePart = StringVal.includes("T") ? StringVal.split("T")[1] : StringVal.split(" ")[1];
  return timePart ? timePart.substring(0, 5) : StringVal;
};

const safeFormatDateTime = (val) => {
  if (!val) return "Chưa cập nhật";
  if (Array.isArray(val)) {
    return `${val[0]}-${String(val[1] || 1).padStart(2, '0')}-${String(val[2] || 1).padStart(2, '0')} ${String(val[3] || 0).padStart(2, '0')}:${String(val[4] || 0).padStart(2, '0')}`;
  }
  return String(val).replace('T', ' ');
};

const getNextDays = () => {
  const d = new Date();
  return [0, 1, 2].map(i => {
    const dd = new Date(d); 
    dd.setDate(d.getDate() + i);
    const dateStr = dd.toISOString().slice(0, 10); 
    return { 
      date: dateStr, 
      label: i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : dd.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" }) 
    };
  });
};

function generateSeats(capacity = 60) {
  const rows = "ABCDEFGH".split("");
  const cols = Math.ceil((capacity || 60) / rows.length);
  return rows.flatMap(r => Array.from({length: cols}, (_, i) => {
    const n = i+1;
    const type = r >= "G" ? "couple" : r >= "D" ? "vip" : "standard";
    return { id: `${r}${n}`, row: r, num: n, type, taken: false, selected: false };
  }));
}

// ─── UI Components ────────────────────────────────────────────────────────────

function Badge({ children, color="var(--c-gold)" }) {
  return <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:500, background:`${color}20`, color, border:`1px solid ${color}40` }}>{children}</span>;
}

function StarRating({ value }) {
  const v = value || 0;
  return (
    <span style={{ color:"var(--c-gold)", fontSize:12, letterSpacing:1 }}>
      {"★".repeat(Math.floor(v/2))}{"☆".repeat(5-Math.floor(v/2))}
      <span style={{ color:"var(--c-muted)", marginLeft:4 }}>{v}</span>
    </span>
  );
}

function Btn({ children, variant="primary", size="md", onClick, disabled, style={} }) {
  const base = { display:"inline-flex", alignItems:"center", gap:6, borderRadius:"var(--r-sm)", fontWeight:500, cursor:disabled?"not-allowed":"pointer", transition:"all .2s", border:"1px solid transparent", opacity: disabled?.7:1, justifyContent: "center" };
  const sizes = { sm:{ padding:"6px 14px", fontSize:13 }, md:{ padding:"10px 22px", fontSize:14 }, lg:{ padding:"13px 30px", fontSize:15 } };
  const variants = {
    primary: { background:"var(--c-gold)", color:"#0a0a0f", borderColor:"var(--c-gold)" },
    outline: { background:"transparent", color:"var(--c-gold)", borderColor:"var(--c-gold)" },
    ghost:   { background:"rgba(255,255,255,.06)", color:"var(--c-text)", borderColor:"var(--c-border)" },
    danger:  { background:"var(--c-red)", color:"#fff", borderColor:"var(--c-red)" }
  };
  return <button onClick={onClick} disabled={disabled} style={{...base, ...sizes[size], ...variants[variant], ...style}}>{children}</button>;
}

function MovieCard({ movie, onClick }) {
  const [hov, setHov] = useState(false);
  const poster = movie.posterUrl || movie.poster || "https://picsum.photos/300/450"; 
  
  return (
    <div onClick={()=>onClick && onClick(movie)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{ cursor: onClick ? "pointer" : "default", borderRadius:"var(--r-lg)", overflow:"hidden", background:"var(--c-card)", border:"1px solid var(--c-border)", transition:"all .3s", transform: hov && onClick ?"translateY(-6px) scale(1.02)":"none" }}>
      <div style={{ position:"relative", aspectRatio:"2/3" }}>
        <img src={poster} alt={movie.title} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform .4s", transform: hov && onClick ?"scale(1.08)":"scale(1)" }} />
        <div style={{ position:"absolute", inset:0, background: hov && onClick ?"linear-gradient(to top, rgba(10,10,15,.95) 40%, transparent 100%)":"linear-gradient(to top, rgba(10,10,15,.7) 30%, transparent 70%)" }}/>
      </div>
      <div style={{ padding:"12px 14px" }}>
        <div style={{ fontFamily:"var(--ff-display)", fontWeight:600, fontSize:15, marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{movie.title}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12, color:"var(--c-muted)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{movie.genre}</span>
          <StarRating value={movie.rating}/>
        </div>
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ page, setPage, user, setUser }) {
  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(10,10,15,.92)", backdropFilter:"blur(16px)", borderBottom:"1px solid var(--c-border)", padding:"0 5vw", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>
      <div onClick={()=>setPage("home")} style={{ fontFamily:"var(--ff-display)", fontSize:22, fontWeight:700, color:"var(--c-gold)", cursor:"pointer" }}>◈ CINÉ</div>
      <div style={{ display:"flex", gap:8 }}>
        <Btn variant={page==="home"?"outline":"ghost"} size="sm" onClick={()=>setPage("home")}>Trang chủ</Btn>
        <Btn variant={page==="search"?"outline":"ghost"} size="sm" onClick={()=>setPage("search")}>Tìm kiếm</Btn>
        <Btn variant={page==="admin"?"outline":"ghost"} size="sm" onClick={()=>setPage("admin")}>Quản trị (Admin)</Btn>
      </div>
      <div>
        {user ? (
          <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>setPage("profile")}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:"var(--c-gold)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, color:"#0a0a0f" }}>{user.name[0]}</div>
            <span style={{ fontSize:13 }}>{user.name}</span>
          </div>
        ) : (
          <Btn size="sm" onClick={()=>setPage("login")}>Đăng nhập</Btn>
        )}
      </div>
    </nav>
  );
}

// ─── TRANG ADMIN ────────────────────────────
function AdminPage() {
  const [tab, setTab] = useState("movies");
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showtimes, setShowtimes] = useState([]);

  const fetchData = useCallback(() => {
    fetch(`${CORE_API_BASE}/movies`).then(r=>r.json()).then(data => setMovies(Array.isArray(data)?data:[])).catch(console.error);
    fetch(`${CORE_API_BASE}/rooms`).then(r=>r.json()).then(d => setRooms(d.content || [])).catch(console.error);
    fetch(`${CORE_API_BASE}/showtimes/filter`).then(r=>r.json()).then(d => setShowtimes(d.content || [])).catch(console.error);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateMovie = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const movieData = { title: fd.get("title"), genre: fd.get("genre"), releaseYear: fd.get("releaseYear"), director: fd.get("director"), duration: fd.get("duration"), description: fd.get("description"), status: "showing", rating: 8.0 };
    const finalFormData = new FormData();
    finalFormData.append("movie", new Blob([JSON.stringify(movieData)], { type: "application/json" }));
    if(fd.get("file").size > 0) finalFormData.append("file", fd.get("file"));

    try {
      const res = await fetch(`${CORE_API_BASE}/movies/create`, { method: "POST", body: finalFormData });
      if(res.ok) { alert("Tạo phim thành công!"); e.target.reset(); fetchData(); }
      else alert("Lỗi tạo phim!");
    } catch(err) { console.error(err); alert("Lỗi kết nối Server"); }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`${CORE_API_BASE}/rooms/create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), capacity: parseInt(fd.get("capacity")) })
      });
      if(res.ok) { alert("Tạo phòng thành công!"); e.target.reset(); fetchData(); } else alert("Lỗi tạo phòng!");
    } catch(err) { console.error(err); alert("Lỗi kết nối Server"); }
  };

  const handleCreateShowtime = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const startTimeRaw = fd.get("startTime");
    const startTimeFormatted = startTimeRaw.length === 16 ? startTimeRaw + ":00" : startTimeRaw;
    const showDateStr = startTimeRaw.split("T")[0];

    try {
      const res = await fetch(`${CORE_API_BASE}/showtimes/create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: parseInt(fd.get("movieId")), roomId: parseInt(fd.get("roomId")), showDate: showDateStr, startTime: startTimeFormatted, basePrice: parseFloat(fd.get("basePrice")) })
      });
      if(res.ok) { alert("Tạo suất chiếu thành công!"); e.target.reset(); fetchData(); } else alert("Lỗi tạo suất chiếu!");
    } catch(err) { console.error(err); alert("Lỗi kết nối Server"); }
  };

  const inputStyle = { width:"100%", padding:"10px", borderRadius:"var(--r-sm)", background:"var(--c-surface)", border:"1px solid var(--c-border)", color:"var(--c-text)", outline:"none", marginBottom:"15px" };

  return (
    <div style={{ paddingTop:100, minHeight:"100vh", paddingLeft:"5vw", paddingRight:"5vw" }}>
      <h1 style={{ fontFamily:"var(--ff-display)", fontSize:32, color:"var(--c-gold)", marginBottom:20 }}>Quản trị hệ thống</h1>
      <div style={{ display:"flex", gap:10, marginBottom:30 }}>
        <Btn variant={tab==="movies"?"primary":"ghost"} onClick={()=>setTab("movies")}>Phim</Btn>
        <Btn variant={tab==="rooms"?"primary":"ghost"} onClick={()=>setTab("rooms")}>Phòng chiếu</Btn>
        <Btn variant={tab==="showtimes"?"primary":"ghost"} onClick={()=>setTab("showtimes")}>Suất chiếu</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"350px 1fr", gap:30 }}>
        <div className="fade-up" style={{ background:"var(--c-card)", padding:24, borderRadius:"var(--r-lg)", border:"1px solid var(--c-border)" }}>
          <h3 style={{ marginBottom:20, fontFamily:"var(--ff-display)", fontSize:20 }}>Thêm {tab==="movies"?"Phim":tab==="rooms"?"Phòng chiếu":"Suất chiếu"} Mới</h3>
          {tab === "movies" && (
            <form onSubmit={handleCreateMovie}>
              <input name="title" placeholder="Tên phim (VD: Mai)" style={inputStyle} required />
              <input name="genre" placeholder="Thể loại" style={inputStyle} required />
              <input name="releaseYear" placeholder="Năm phát hành" style={inputStyle} required />
              <input name="director" placeholder="Đạo diễn" style={inputStyle} required />
              <input name="duration" placeholder="Thời lượng" style={inputStyle} required />
              <textarea name="description" placeholder="Nội dung mô tả phim..." style={{...inputStyle, height:80}} required />
              <label style={{fontSize:12, color:"var(--c-muted)", marginBottom:5, display:"block"}}>Ảnh Poster</label>
              <input name="file" type="file" style={inputStyle} accept="image/*" />
              <Btn style={{width:"100%"}}>Lưu Phim</Btn>
            </form>
          )}
          {tab === "rooms" && (
            <form onSubmit={handleCreateRoom}>
              <input name="name" placeholder="Tên phòng (VD: Phòng Cinema 1)" style={inputStyle} required />
              <input name="capacity" type="number" placeholder="Sức chứa (VD: 100)" style={inputStyle} required />
              <Btn style={{width:"100%"}}>Lưu Phòng Chiếu</Btn>
            </form>
          )}
          {tab === "showtimes" && (
            <form onSubmit={handleCreateShowtime}>
              <select name="movieId" style={inputStyle} required>
                <option value="">-- Chọn Phim --</option>
                {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <select name="roomId" style={inputStyle} required>
                <option value="">-- Chọn Phòng Chiếu --</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Sức chứa: {r.capacity})</option>)}
              </select>
              <label style={{fontSize:12, color:"var(--c-muted)", marginBottom:5, display:"block"}}>Thời gian bắt đầu</label>
              <input name="startTime" type="datetime-local" style={inputStyle} required />
              <input name="basePrice" type="number" placeholder="Giá vé (VD: 90000)" style={inputStyle} required />
              <Btn style={{width:"100%"}}>Lưu Suất Chiếu</Btn>
            </form>
          )}
        </div>

        <div className="fade-up" style={{ background:"var(--c-card)", padding:24, borderRadius:"var(--r-lg)", border:"1px solid var(--c-border)" }}>
           <h3 style={{ marginBottom:20, fontFamily:"var(--ff-display)", fontSize:20 }}>Danh sách hiện tại</h3>
           {tab === "movies" && (
             <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:15 }}>
               {movies.map(m => <MovieCard key={m.id} movie={m} />)}
             </div>
           )}
           {tab === "rooms" && (
             <div style={{display:"flex", flexDirection:"column", gap:10}}>
               {rooms.map(r => (
                 <div key={r.id} style={{padding:15, background:"var(--c-surface)", borderRadius:8, display:"flex", justifyContent:"space-between"}}>
                   <span><b>{r.name}</b></span><span style={{color:"var(--c-muted)"}}>Sức chứa: {r.capacity} ghế</span>
                 </div>
               ))}
             </div>
           )}
           {tab === "showtimes" && (
             <div style={{display:"flex", flexDirection:"column", gap:10}}>
               {showtimes.map(st => (
                 <div key={st.id} style={{padding:15, background:"var(--c-surface)", borderRadius:8, display:"flex", justifyContent:"space-between"}}>
                   <div>
                     <div style={{fontWeight:"bold", color:"var(--c-gold)"}}>{st.movie?.title}</div>
                     <div style={{fontSize:13, color:"var(--c-muted)"}}>Phòng: {st.room?.name} | Bắt đầu: {safeFormatDateTime(st.startTime)}</div>
                   </div>
                   <div style={{textAlign:"right"}}><div>Giá: {fmt(st.basePrice)}</div></div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

// ─── Trang Chủ ────────────────────────────────────────────────────────────────
function HomePage({ onSelect }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${CORE_API_BASE}/movies`).then(res => res.json()).then(data => { setMovies(Array.isArray(data)?data:[]); setLoading(false); }).catch(err => { console.error(err); setLoading(false); });
  }, []);

  return (
    <div style={{ padding:"100px 5vw 80px", minHeight:"100vh" }}>
      <h2 style={{ fontFamily:"var(--ff-display)", fontSize:28, marginBottom:20 }}>Phim Đang Chiếu</h2>
      {loading ? <div>Đang tải phim...</div> : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:20 }}>
          {movies.map(m => <MovieCard key={m.id} movie={m} onClick={onSelect}/>)}
        </div>
      )}
    </div>
  );
}

// ─── Trang Tìm Kiếm ───────────────────────────────────────────────────────────
function SearchPage({ onSelect }) {
  const [query, setQuery] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const url = aiMode ? `${SEARCH_API_BASE}/search/natural?query=${encodeURIComponent(query)}&topK=10` : `${CORE_API_BASE}/movies?keyword=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.movies || data.results || (Array.isArray(data)?data:[]) || []);
    } catch(e) { console.error("Lỗi tìm kiếm:", e); }
    setLoading(false);
  }, [query, aiMode]);

  return (
    <div style={{ paddingTop:80, minHeight:"100vh", padding:"100px 5vw 60px" }}>
      <h1 style={{ fontFamily:"var(--ff-display)", fontSize:36, fontWeight:700, marginBottom:8 }}>Tìm kiếm phim</h1>
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()} placeholder={aiMode ? 'AI Search: "phim hài Trấn Thành"...' : "Tìm kiếm tên phim..."} style={{ flex:1, padding:"14px 20px", borderRadius:"var(--r-md)", background:"var(--c-card)", border:"1px solid var(--c-border)", color:"var(--c-text)", outline:"none" }} />
        <Btn onClick={doSearch} disabled={loading}>{loading?"⏳":"Tìm"}</Btn>
      </div>
      <div style={{ marginBottom:24 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", width:"fit-content" }}>
          <input type="checkbox" checked={aiMode} onChange={(e)=>setAiMode(e.target.checked)} />
          <span style={{color:"var(--c-gold)"}}>Tìm kiếm thông minh (AI NLP)</span>
        </label>
      </div>
      <div className="fade-up" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:20 }}>
        {results.map(m=><MovieCard key={m.id} movie={m} onClick={onSelect}/>)}
      </div>
    </div>
  );
}

// ─── Trang Chi Tiết Phim ──────────────────────────────────────────────────────
function MovieDetailPage({ movieCardInfo, onBook }) {
  const [detail, setDetail] = useState(movieCardInfo);

  useEffect(() => {
    fetch(`${CORE_API_BASE}/movies/${movieCardInfo.id}`).then(res => res.json()).then(data => setDetail(data));
  }, [movieCardInfo.id]);

  const poster = detail.posterUrl || "https://picsum.photos/400/600";

  return (
    <div style={{ paddingTop:100, paddingLeft:"5vw", paddingRight:"5vw", minHeight:"100vh" }}>
      <div className="fade-up" style={{ display:"flex", gap:40, flexWrap:"wrap" }}>
         <img src={poster} style={{ width:280, borderRadius:"var(--r-lg)", objectFit:"cover" }} />
         <div style={{ flex:1, minWidth:300 }}>
            <Badge>{detail.genre}</Badge>
            <h1 style={{ fontFamily:"var(--ff-display)", fontSize:44, color:"var(--c-gold)", margin:"10px 0" }}>{detail.title}</h1>
            <p style={{ color:"var(--c-muted)", marginBottom:30 }}>{detail.description || "Đang cập nhật nội dung..."}</p>
            <Btn size="lg" onClick={()=>onBook(detail)}>🎬 Mua vé ngay</Btn>
         </div>
      </div>
    </div>
  );
}

// ─── Trang Đặt Vé (CÓ TÍCH HỢP RENDER GHẾ ĐÃ ĐẶT) ─────────────────────────────
function BookingPage({ movie, user, onConfirm, setPage }) {
  const dates = getNextDays();
  const [step, setStep] = useState(1);
  const [selDate, setSelDate] = useState(dates[0].date);
  const [showtimes, setShowtimes] = useState([]);
  const [selShowtime, setSelShowtime] = useState(null);
  
  const [seats, setSeats] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lấy Lịch chiếu theo ngày
  useEffect(() => {
    setSelShowtime(null);
    fetch(`${CORE_API_BASE}/showtimes/movie/${movie.id}?date=${selDate}`)
      .then(res => res.json())
      .then(data => {
        setShowtimes(Array.isArray(data) ? data : (data?.content || []));
      })
      .catch(console.error);
  }, [movie.id, selDate]);

  // Sinh sơ đồ ghế trống & Gọi API check ghế đã bán
  useEffect(() => {
    if(selShowtime && selShowtime.room) {
       let initialSeats = generateSeats(selShowtime.room.capacity);
       
       fetch(`${CORE_API_BASE}/orders/showtime/${selShowtime.id}/booked-seats`)
         .then(res => res.json())
         .then(bookedSeatIds => {
             const bookedArray = Array.isArray(bookedSeatIds) ? bookedSeatIds : [];
             const updatedSeats = initialSeats.map(seat => ({
                 ...seat,
                 taken: bookedArray.includes(seat.id), // Disable nếu ID nằm trong mảng đã đặt
                 selected: false
             }));
             setSeats(updatedSeats);
         })
         .catch(err => {
             console.error("Lỗi lấy ghế đã đặt:", err);
             setSeats(initialSeats);
         });
    }
  }, [selShowtime]);

  const basePrice = selShowtime ? selShowtime.basePrice : 80000;
  const selected = seats.filter(s=>s.selected);
  const totalAmount = selected.reduce((total, seat) => total + basePrice, 0);

  const toggleSeat = (sid) => setSeats(ss=>ss.map(s=> s.id===sid && !s.taken ? {...s, selected:!s.selected} : s));

  const handlePayment = async () => {
    if(!user) { alert("Vui lòng đăng nhập!"); setPage("login"); return; }
    setIsSubmitting(true);
    try {
        const response = await fetch(`${CORE_API_BASE}/orders/create`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, showtimeId: selShowtime.id, seatNumbers: selected.map(s => s.id) })
        });
        if (response.ok) {
            const data = await response.json();
            onConfirm({ movie, date: selDate, showtime: selShowtime, seats: selected, total: totalAmount, orderId: data.id });
        } else {
            const error = await response.json(); alert("❌ Lỗi: " + (error.message || "Ghế này đã bị đặt."));
        }
    } catch (error) { alert("❌ Lỗi hệ thống Backend."); } finally { setIsSubmitting(false); }
  };

  return (
    <div style={{ paddingTop:100, minHeight:"100vh" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:24, padding:"0 5vw", maxWidth:1100, margin:"0 auto" }}>
        <div>
          {step===1 && (
            <div className="fade-up">
              <div style={{fontSize:12, color:"var(--c-muted)", marginBottom:10}}>1. CHỌN NGÀY</div>
              <div style={{ display:"flex", gap:10, marginBottom:24 }}>
                {dates.map(d=><Btn key={d.date} variant={selDate===d.date?"primary":"ghost"} onClick={()=>setSelDate(d.date)}>{d.label}</Btn>)}
              </div>
              <div style={{fontSize:12, color:"var(--c-muted)", marginBottom:10}}>2. CHỌN SUẤT CHIẾU</div>
              {showtimes.length === 0 ? <div style={{color:"var(--c-red)", marginBottom:20}}>Chưa có lịch chiếu.</div> : (
                  <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24 }}>
                    {showtimes.map(st => (
                      <div key={st.id} onClick={()=>setSelShowtime(st)} style={{ padding:"12px 16px", borderRadius:"var(--r-sm)", cursor:"pointer", background: selShowtime?.id === st.id ? "var(--c-gold)" : "var(--c-card)", color: selShowtime?.id === st.id ? "#000" : "#fff", border: `1px solid ${selShowtime?.id === st.id ? "var(--c-gold)" : "var(--c-border)"}` }}>
                          <div style={{fontSize:18, fontWeight:"bold"}}>{safeFormatTime(st.startTime)}</div>
                          <div style={{fontSize:12, opacity:0.8}}>{st.room?.name}</div>
                          <div style={{fontSize:11, opacity:0.6}}>{fmt(st.basePrice)}</div>
                      </div>
                    ))}
                  </div>
              )}
              <Btn disabled={!selShowtime} onClick={()=>setStep(2)}>Chọn ghế →</Btn>
            </div>
          )}

          {step===2 && (
            <div className="fade-up">
              <div style={{ textAlign:"center", marginBottom:28 }}><div style={{ width:"70%", margin:"0 auto 8px", height:6, background:"var(--c-gold)" }}/><div style={{ fontSize:12, color:"var(--c-dim)" }}>MÀN HÌNH</div></div>
              <div style={{ overflowX:"auto", paddingBottom:8 }}>
                {["A","B","C","D","E","F","G","H"].map(row=>(
                  <div key={row} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, justifyContent:"center" }}>
                    {seats.filter(s=>s.row===row).length > 0 && <span style={{ width:18, fontSize:12, color:"var(--c-dim)" }}>{row}</span>}
                    <div style={{ display:"flex", gap:5 }}>
                      {seats.filter(s=>s.row===row).map(s=>(
                        <div key={s.id} onClick={()=>toggleSeat(s.id)} style={{ width: 28, height:26, borderRadius:4, background: s.taken?"var(--c-dim)": s.selected?"var(--c-gold)":"#3a5a6a", cursor: s.taken?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color: s.selected?"#000":"#fff", opacity: s.taken? 0.5 : 1 }}>{s.num}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:12, marginTop:24 }}>
                <Btn variant="ghost" onClick={()=>setStep(1)}>← Quay lại</Btn>
                <Btn disabled={selected.length===0} onClick={()=>setStep(3)}>Xác nhận ghế →</Btn>
              </div>
            </div>
          )}

          {step===3 && (
            <div className="fade-up">
              <div style={{fontSize:12, color:"var(--c-muted)", marginBottom:10}}>3. XÁC NHẬN THANH TOÁN</div>
              <div style={{ display:"flex", gap:12 }}>
                <Btn variant="ghost" onClick={()=>setStep(2)}>← Chọn lại ghế</Btn>
                <Btn onClick={handlePayment} disabled={isSubmitting}>{isSubmitting ? "Đang xử lý..." : `Thanh toán ${fmt(totalAmount)}`}</Btn>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div style={{ background:"var(--c-card)", borderRadius:"var(--r-lg)", border:"1px solid var(--c-border)", padding:20 }}>
            <h3 style={{ fontFamily:"var(--ff-display)", fontSize:17, marginBottom:16 }}>Đơn vé</h3>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}><span style={{color:"var(--c-muted)"}}>Phim</span><span>{movie.title}</span></div>
            {selShowtime && (
               <>
                 <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}><span style={{color:"var(--c-muted)"}}>Giờ</span><span style={{color:"var(--c-gold)", fontWeight:"bold"}}>{safeFormatTime(selShowtime.startTime)}</span></div>
                 <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}><span style={{color:"var(--c-muted)"}}>Phòng</span><span>{selShowtime.room?.name}</span></div>
               </>
            )}
            {selected.length>0 && (
              <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--c-border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontWeight:500 }}>Tổng tiền</span><span style={{ fontFamily:"var(--ff-display)", fontSize:20, fontWeight:700, color:"var(--c-gold)" }}>{fmt(totalAmount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Trang Xác Nhận ───────────────────────────────────────────────────────────
function ConfirmationPage({ booking, onHome }) {
  return (
    <div style={{ paddingTop:80, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="fade-up" style={{ textAlign:"center", background:"var(--c-card)", padding:40, borderRadius:"var(--r-xl)", border:"1px solid var(--c-border)" }}>
        <h1 style={{ fontFamily:"var(--ff-display)", fontSize:32, color:"#6de8b8", marginBottom:10 }}>GIAO DỊCH THÀNH CÔNG!</h1>
        <p style={{ color:"var(--c-muted)", marginBottom:20 }}>Mã Đơn: <b style={{fontSize:18, color:"#fff"}}>#{booking.orderId}</b></p>
        <div style={{ fontSize:22, color:"var(--c-gold)", marginBottom:30 }}>{fmt(booking.total)}</div>
        <Btn onClick={onHome}>Về Trang chủ</Btn>
      </div>
    </div>
  );
}

// ─── Trang Đăng Nhập ──────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"var(--c-card)", padding: 40, borderRadius: 20, textAlign: "center", border:"1px solid var(--c-border)" }}>
        <h2 style={{ fontFamily:"var(--ff-display)", color:"var(--c-gold)", marginBottom: 20 }}>Đăng nhập</h2>
        <Btn onClick={()=>onLogin({ id: 1, name: "Quản Trị Viên", email:"admin@gmail.com" })}>Login Admin (ID: 1)</Btn>
      </div>
    </div>
  );
}

// ─── Trang Cá Nhân ────────────────────────────────────────────────────────────
function ProfilePage({ user, setUser, setPage }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch(`${CORE_API_BASE}/orders/user/${user.id}`).then(res => res.json()).then(data => setHistory(data.content || [])).catch(console.error);
  }, [user.id]);

  return (
    <div style={{ paddingTop:100, minHeight:"100vh", paddingLeft:"5vw", paddingRight:"5vw" }}>
      <div style={{ display:"flex", gap:32, alignItems:"flex-start", flexWrap:"wrap" }}>
        <div style={{ width:280, flexShrink:0, background:"var(--c-card)", borderRadius:"var(--r-xl)", padding:28, textAlign:"center" }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:"var(--c-gold)", margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, color:"#0a0a0f", fontWeight:700 }}>{user.name[0]}</div>
          <div style={{ fontSize:20, fontWeight:600 }}>{user.name}</div>
          <Btn variant="ghost" style={{ width:"100%", marginTop:20, justifyContent:"center" }} onClick={()=>{setUser(null); setPage("home");}}>Đăng xuất</Btn>
        </div>

        <div style={{ flex:1, minWidth:300 }}>
          <h2 style={{ fontFamily:"var(--ff-display)", fontSize:24, marginBottom:20 }}>Lịch sử đặt vé</h2>
          {history.length === 0 ? <p style={{color:"var(--c-muted)"}}>Bạn chưa có đơn vé nào.</p> : (
             <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
               {history.map(h => (
                 <div key={h.id} style={{ background:"var(--c-card)", borderRadius:"var(--r-lg)", padding:"18px", border:"1px solid var(--c-border)", display:"flex", justifyContent:"space-between" }}>
                   <div>
                     <div style={{ fontWeight:600 }}>Mã đơn: #{h.id}</div>
                     <div style={{ fontSize:13, color:"var(--c-muted)", marginTop:4 }}>{h.showtime?.movie?.title} - {h.showtime?.room?.name}</div>
                   </div>
                   <div style={{ textAlign:"right" }}>
                     <Badge color={h.status==="PAID" ? "#6de8b8" : "var(--c-red)"}>{h.status}</Badge>
                     <div style={{ fontSize:14, color:"var(--c-gold)", marginTop:6, fontWeight:500 }}>{fmt(h.totalAmount)}</div>
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

// ─── Điều Hướng (App Root) ────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]       = useState("home");
  const [selMovie, setSelMovie] = useState(null);
  const [booking, setBooking]  = useState(null);
  const [user, setUser]        = useState({ id: 1, name: "Quản Trị", email:"admin@gmail.com" });

  const goMovie = (m) => { setSelMovie(m); setPage("movie"); };
  const goBook  = (m) => { setSelMovie(m); setPage("booking"); };
  const goConfirm = (b) => { setBooking(b); setPage("confirm"); };
  const goLogin  = (u) => { setUser(u); setPage("home"); };

  return (
    <>
      <style>{CSS}</style>
      <Navbar page={page} setPage={setPage} user={user} setUser={setUser}/>

      {page==="home"     && <HomePage onSelect={goMovie}/>}
      {page==="search"   && <SearchPage onSelect={goMovie}/>}
      {page==="movie"    && selMovie && <MovieDetailPage movieCardInfo={selMovie} onBook={goBook}/>}
      {page==="booking"  && selMovie && <BookingPage movie={selMovie} user={user} setPage={setPage} onConfirm={goConfirm}/>}
      {page==="confirm"  && booking  && <ConfirmationPage booking={booking} onHome={()=>setPage("home")}/>}
      {page==="profile"  && user     && <ProfilePage user={user} setUser={setUser} setPage={setPage}/>}
      {page==="login"    && <LoginPage onLogin={goLogin} />}
      {page==="admin"    && <AdminPage />}
    </>
  );
}