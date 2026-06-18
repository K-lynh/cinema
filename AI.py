import os, re, sys, math, unicodedata
from collections import defaultdict

import numpy as np
import faiss
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
CORS(app)

# ═══════════════════════════════════════════════
#  KNOWLEDGE BASE (EXPANDED FOR NATURAL LANGUAGE)
# ═══════════════════════════════════════════════

GENRE_ALIASES: dict[str, list[str]] = {
    "hành động":             ["hành động", "action", "võ thuật", "chiến đấu", "đánh nhau", "đấm đá", "phim chưởng", "bắn súng", "băng đảng"],
    "tình cảm":              ["tình cảm", "lãng mạn", "romantic", "tình yêu", "yêu đương", "ngôn tình", "sướt mướt", "ngọt ngào", "thanh xuân"],
    "hài":                   ["hài", "comedy", "hài hước", "vui nhộn", "buồn cười", "tấu hài", "cười đau bụng", "hài nhảm", "phim hài"],
    "kinh dị":               ["kinh dị", "horror", "ma quỷ", "rùng rợn", "đáng sợ", "phim ma", "tâm linh", "quỷ ám", "bùa ngải", "trừ tà"],
    "hoạt hình":             ["hoạt hình", "cartoon", "animation", "anime", "phim vẽ", "thiếu nhi", "trẻ em", "hoạt họa"],
    "tâm lý":                ["tâm lý", "drama", "cảm xúc", "sâu sắc", "nặng đô", "thực tế"],
    "khoa học viễn tưởng":   ["khoa học viễn tưởng", "sci-fi", "viễn tưởng", "ngoài hành tinh", "vũ trụ", "tương lai", "du hành thời gian", "robot", "người máy"],
    "cổ trang":              ["cổ trang", "lịch sử", "ngày xưa", "thời xưa", "kiếm hiệp", "cung đấu", "dã sử", "tiên hiệp", "phong kiến"],
    "gia đình":              ["gia đình", "family", "bố mẹ", "con cái", "tình thân", "mẹ chồng nàng dâu", "người thân"],
    "tội phạm":              ["tội phạm", "crime", "trinh thám", "điều tra", "xã hội đen", "phá án", "hình sự", "sát nhân", "cướp ngân hàng"],
    "giật gân":              ["giật gân", "thriller", "kịch tính", "thót tim", "hồi hộp", "truy sát"],
    "kỳ ảo":                 ["kỳ ảo", "fantasy", "phép thuật", "thần thoại", "siêu nhiên", "ma thuật", "phù thủy"],
    "thể thao":              ["thể thao", "bóng đá", "võ đài", "quyền anh", "thi đấu", "e-sports"],
    "âm nhạc":               ["âm nhạc", "ca nhạc", "musical", "nhảy múa", "ca sĩ", "thần tượng", "idol"],
    "tài liệu":              ["tài liệu", "documentary", "đời thực", "thực tế", "phóng sự"],
    "học đường":             ["học đường", "trường học", "sinh viên", "học sinh", "tuổi thanh xuân", "vườn trường"],
    "zombie":                ["zombie", "xác sống", "tận thế", "sinh tồn", "ngày tận thế", "hậu tận thế"],
    "lgbt":                  ["lgbt", "đồng tính", "gay", "les", "đam mỹ", "bách hợp", "boylove", "girllove"],
    "xã hội":                ["xã hội", "cuộc sống", "đời thường", "khởi nghiệp", "chốn công sở"]
}

ROLE_ALIASES: dict[str, list[str]] = {
    "bố":          ["bố", "cha", "ba", "phụ thân", "người cha", "tía", "bố bỉm", "vai bố"],
    "mẹ":          ["mẹ", "má", "mẫu thân", "người mẹ", "mẹ bỉm", "mẹ kế", "dì ghẻ", "vai mẹ"],
    "con":         ["con", "con trai", "con gái", "đứa con", "quý tử", "ái nữ"],
    "người yêu":   ["người yêu", "bạn gái", "bạn trai", "crush", "bồ", "đào", "tình đầu"],
    "vợ chồng":    ["vợ", "chồng", "bà xã", "ông xã", "bạn đời", "hôn phu", "hôn thê"],
    "người thứ 3": ["tiểu tam", "trà xanh", "tuesday", "người thứ ba", "kẻ phá hoại", "ngoại tình", "cắm sừng"],
    "phản diện":   ["phản diện", "kẻ xấu", "ác nhân", "villain", "trùm cuối", "kẻ thủ ác"],
    "tổng tài":    ["tổng tài", "chủ tịch", "ceo", "đại gia", "sếp", "bá đạo", "thiếu gia", "phú nhị đại"],
    "cảnh sát":    ["cảnh sát", "công an", "sĩ quan", "hình sự", "mật vụ", "điệp viên", "fbi", "cia"],
    "sát thủ":     ["sát thủ", "lính đánh thuê", "tay súng", "assassin", "kẻ giết người"],
    "bác sĩ":      ["bác sĩ", "y sĩ", "thầy thuốc", "y tá", "phẫu thuật"],
    "siêu anh hùng": ["siêu anh hùng", "anh hùng", "dị nhân", "người đột biến", "cứu thế giới"],
    "ma quỷ":      ["con ma", "quỷ dữ", "yêu tinh", "quái vật", "thần linh", "ác quỷ"]
}

EMOTION_ALIASES: dict[str, list[str]] = {
    "cảm động":  ["cảm động", "xúc động", "nước mắt", "khóc", "buồn", "da diết", "nuối tiếc", "bi đát", "bi kịch", "khóc sưng mắt", "rớt nước mắt"],
    "vui vẻ":    ["vui", "hài hước", "cười", "thoải mái", "vui nhộn", "giải trí", "xả stress", "cười ỉa", "cười xỉu", "vui vẻ"],
    "chữa lành": ["chữa lành", "healing", "nhẹ nhàng", "bình yên", "ấm áp", "thư giãn", "chill", "an ủi"],
    "hồi hộp":   ["hồi hộp", "căng thẳng", "kịch tính", "gay cấn", "nghẹt thở", "đổ mồ hôi", "đứng tim"],
    "hack não":  ["hack não", "xoắn não", "khó hiểu", "thông minh", "lật lọng", "plot twist", "suy luận", "đảo ngược", "bất ngờ"],
    "sợ hãi":    ["sợ", "rùng mình", "đáng sợ", "ám ảnh", "nổi da gà", "mất ngủ", "giật mình", "hãi hùng"],
    "ức chế":    ["ức chế", "tức giận", "phẫn nộ", "máu chó", "cẩu huyết", "cay cú", "tức điên", "khó chịu"],
    "truyền cảm hứng": ["nhiệt huyết", "truyền cảm hứng", "ý chí", "nỗ lực", "cố gắng", "vươn lên", "động lực"]
}

# Numeric condition patterns: (regex, field, operator)
COMPARATIVE_PATTERNS: list[tuple[str, str, str]] = [
    (r'(?:đánh giá|điểm số?|rating|điểm)\s*(?:trên|lớn hơn|cao hơn|từ|>=?)\s*(\d+(?:[.,]\d+)?)', 'rating', '>='),
    (r'(?:đánh giá|điểm số?|rating|điểm)\s*(?:dưới|nhỏ hơn|thấp hơn|<=?)\s*(\d+(?:[.,]\d+)?)',   'rating', '<='),
    (r'(?:đánh giá|điểm số?|rating|điểm)\s*(?:bằng|là|=)\s*(\d+(?:[.,]\d+)?)',                    'rating', '=='),
    (r'(?:trên|lớn hơn|cao hơn)\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|sao)',                              'rating', '>='),
    (r'(?:dưới|nhỏ hơn|thấp hơn)\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|sao)',                             'rating', '<='),
    (r'(?:sau năm|từ năm)\s*(\d{4})',                                                               'year',   '>='),
    (r'(?:trước năm)\s*(\d{4})',                                                                    'year',   '<'),
    (r'(?:năm)\s*(\d{4})\s*(?:trở về sau|trở lên|trở đi)',                                         'year',   '>='),
    (r'(?:ra mắt|phát hành|chiếu)\s*(?:năm\s*)?(\d{4})',                                           'year',   '=='),
    (r'\bnăm\s+(\d{4})\b',                                                                         'year',   '=='),
]

NEGATION_WORDS = ["không phải", "không có", "không", "chẳng", "tránh", "đừng"]
STOP_WORDS     = {"phim", "bộ", "tập", "movie", "tìm", "cho", "tôi", "muốn", "xem", "hay", "mà", "và", "hoặc", "là", "có"}

# ═══════════════════════════════════════════════
#  GLOBAL STATE
# ═══════════════════════════════════════════════

model         = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
movie_db:       list[dict]         = []
faiss_index                        = None
corpus_texts:   list[str]          = []
bm25_doc_freqs: list[dict[str,int]]= []
bm25_idf:       dict[str,float]    = {}
bm25_avg_dl:    float              = 0.0
actor_norm_map: dict[str,str]      = {}

BM25_K1, BM25_B = 1.5, 0.75
RRF_K           = 60

# ═══════════════════════════════════════════════
#  TEXT UTILITIES
# ═══════════════════════════════════════════════

def normalize(text: str) -> str:
    text = unicodedata.normalize('NFC', text).lower().strip()
    text = re.sub(r'[^\w\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def tokenize(text: str) -> list[str]:
    return [t for t in normalize(text).split() if len(t) > 1 and t not in STOP_WORDS]

# ═══════════════════════════════════════════════
#  BM25 SPARSE INDEX
# ═══════════════════════════════════════════════

def build_bm25(docs: list[str]) -> None:
    global bm25_doc_freqs, bm25_idf, bm25_avg_dl
    N = len(docs)
    df: dict[str, int] = defaultdict(int)
    bm25_doc_freqs = []
    dl_list = []
    for doc in docs:
        tokens = tokenize(doc)
        dl_list.append(len(tokens))
        tf: dict[str, int] = defaultdict(int)
        for t in tokens:
            tf[t] += 1
        bm25_doc_freqs.append(dict(tf))
        for term in set(tokens):
            df[term] += 1
    bm25_avg_dl = sum(dl_list) / max(N, 1)
    bm25_idf = {
        term: math.log((N - freq + 0.5) / (freq + 0.5) + 1)
        for term, freq in df.items()
    }

def bm25_score(query_tokens: list[str], doc_idx: int) -> float:
    tf_map = bm25_doc_freqs[doc_idx]
    dl = sum(tf_map.values())
    score = 0.0
    for term in query_tokens:
        if term not in tf_map:
            continue
        tf  = tf_map[term]
        idf = bm25_idf.get(term, 0.0)
        num = tf * (BM25_K1 + 1)
        den = tf + BM25_K1 * (1 - BM25_B + BM25_B * dl / max(bm25_avg_dl, 1))
        score += idf * (num / den)
    return score

# ═══════════════════════════════════════════════
#  QUERY UNDERSTANDING — NLP Intent Pipeline
# ═══════════════════════════════════════════════

class QueryIntent:
    def __init__(self):
        self.actors:         list[str]  = []
        self.roles:          list[str]  = []
        self.genres:         list[str]  = []
        self.negated_genres: list[str]  = []
        self.emotions:       list[str]  = []
        self.conditions:     list[dict] = []
        self.semantic_query: str        = ""
        self.raw:            str        = ""

    def to_dict(self) -> dict:
        return {
            "actors":         self.actors,
            "roles":          self.roles,
            "genres":         self.genres,
            "negated_genres": self.negated_genres,
            "emotions":       self.emotions,
            "conditions":     self.conditions,
            "semantic_query": self.semantic_query,
        }


def parse_numeric_conditions(query: str) -> tuple[list[dict], str]:
    """
    Extract numeric conditions and return (conditions_list, cleaned_query).
    Example: "đánh giá trên 8.0 điểm" → [{field:'rating', op:'>=', value:8.0}]
    """
    conditions: list[dict] = []
    cleaned = query
    seen_fields: set[str] = set()

    for pattern, field, op in COMPARATIVE_PATTERNS:
        for m in re.finditer(pattern, query, re.IGNORECASE):
            raw_val = m.group(1).replace(',', '.')
            try:
                value = float(raw_val)
                key = f"{field}{op}"
                if key not in seen_fields:
                    conditions.append({"field": field, "op": op, "value": value})
                    seen_fields.add(key)
                cleaned = cleaned.replace(m.group(0), ' ')
            except ValueError:
                pass

    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return conditions, cleaned


def extract_intent(raw_query: str) -> QueryIntent:
    intent     = QueryIntent()
    intent.raw = raw_query

    # Step 1 — Parse numeric conditions (rating/year filters)
    intent.conditions, q_stripped = parse_numeric_conditions(raw_query)

    qn = normalize(q_stripped)

    # Step 2 — Detect negated genres
    for neg in NEGATION_WORDS:
        neg_n = normalize(neg)
        idx   = qn.find(neg_n)
        if idx == -1:
            continue
        fragment = qn[idx + len(neg_n): idx + len(neg_n) + 30]
        for genre, aliases in GENRE_ALIASES.items():
            if any(a in fragment for a in aliases):
                intent.negated_genres.append(genre)

    # Step 3 — Actor detection (longest match first to avoid partial hits)
    actor_spans: list[str] = []
    for norm_name, orig_name in sorted(actor_norm_map.items(), key=lambda x: -len(x[0])):
        if norm_name in qn and orig_name not in intent.actors:
            intent.actors.append(orig_name)
            actor_spans.append(norm_name)

    # Step 4 — Genre detection (skip negated)
    for genre, aliases in GENRE_ALIASES.items():
        if genre not in intent.negated_genres and any(a in qn for a in aliases):
            intent.genres.append(genre)

    # Step 5 — Role detection
    for role, aliases in ROLE_ALIASES.items():
        if any(a in qn for a in aliases):
            intent.roles.append(role)

    # Step 6 — Emotion detection
    for emotion, aliases in EMOTION_ALIASES.items():
        if any(a in qn for a in aliases):
            intent.emotions.append(emotion)

    # Step 7 — Build enriched semantic query
    sem = qn
    for span in actor_spans:
        sem = sem.replace(span, ' ')
    tokens = [t for t in sem.split() if t not in STOP_WORDS]
    if intent.roles:
        tokens += ["vai"] + intent.roles
    if intent.emotions:
        tokens += intent.emotions
    if intent.genres:
        tokens += intent.genres

    intent.semantic_query = ' '.join(tokens).strip() or raw_query
    return intent

# ═══════════════════════════════════════════════
#  STRUCTURED HARD FILTER
# ═══════════════════════════════════════════════

def passes_hard_filter(movie: dict, intent: QueryIntent) -> bool:
    # --- Numeric field conditions ---
    for cond in intent.conditions:
        raw = movie.get(cond["field"], "")
        if not raw:
            return False
        try:
            mv = float(str(raw).replace(',', '.'))
        except ValueError:
            return False
        op, val = cond["op"], cond["value"]
        ok = (op == '>=' and mv >= val) or \
             (op == '<=' and mv <= val) or \
             (op == '>'  and mv >  val) or \
             (op == '<'  and mv <  val) or \
             (op == '==' and abs(mv - val) < 0.05)
        if not ok:
            return False

    # --- Actor hard filter ---
    if intent.actors:
        movie_actors_n = {normalize(a) for a in movie.get("actors", [])}
        if not {normalize(a) for a in intent.actors}.intersection(movie_actors_n):
            return False

    # --- Negated genre filter ---
    genre_n = normalize(movie.get("genre", ""))
    for neg in intent.negated_genres:
        if any(a in genre_n for a in GENRE_ALIASES.get(neg, [])):
            return False

    return True

# ═══════════════════════════════════════════════
#  SOFT BONUS SCORING
# ═══════════════════════════════════════════════

def compute_bonus(movie: dict, intent: QueryIntent) -> float:
    bonus    = 0.0
    desc_n   = normalize(movie.get("description", ""))
    genre_n  = normalize(movie.get("genre", ""))
    actors_n = [normalize(a) for a in movie.get("actors", [])]

    for genre in intent.genres:
        if any(a in genre_n for a in GENRE_ALIASES.get(genre, [])):
            bonus += 0.4

    for role in intent.roles:
        if any(a in desc_n for a in ROLE_ALIASES.get(role, [])):
            bonus += 0.6

    for emotion in intent.emotions:
        if any(a in desc_n for a in EMOTION_ALIASES.get(emotion, [])):
            bonus += 0.3

    for actor in intent.actors:
        if normalize(actor) in actors_n:
            bonus += 0.5

    # Gentle rating quality bias (only when no explicit rating condition)
    if not any(c['field'] == 'rating' for c in intent.conditions):
        try:
            bonus += (float(movie.get("rating", 0) or 0) - 5.0) * 0.04
        except (ValueError, TypeError):
            pass

    return bonus

# ═══════════════════════════════════════════════
#  RRF FUSION
# ═══════════════════════════════════════════════

def reciprocal_rank_fusion(
    dense_rank:  list[int],
    sparse_rank: list[int],
    w_dense:     float = 0.6,
    w_sparse:    float = 0.4,
) -> list[tuple[int, float]]:
    scores: dict[int, float] = defaultdict(float)
    for r, idx in enumerate(dense_rank):
        scores[idx] += w_dense  * (1.0 / (RRF_K + r + 1))
    for r, idx in enumerate(sparse_rank):
        scores[idx] += w_sparse * (1.0 / (RRF_K + r + 1))
    return sorted(scores.items(), key=lambda x: -x[1])

# ═══════════════════════════════════════════════
#  BUILD ENGINE
# ═══════════════════════════════════════════════

def build_search_engine(file_path: str) -> None:
    global movie_db, faiss_index, corpus_texts, actor_norm_map

    if not os.path.exists(file_path):
        print(f"[ERROR] File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = [l.strip() for l in f if l.strip() and not l.startswith('#')]

    movie_db.clear(); corpus_texts.clear(); actor_norm_map.clear()
    raw_actors: set[str] = set()

    for line in lines:
        parts = line.split('|')
        if len(parts) < 4:
            continue
        actors_list = [a.strip() for a in parts[2].split(',')]
        movie = {
            "title":       parts[0].strip(),
            "genre":       parts[1].strip(),
            "actors":      actors_list,
            "description": parts[3].strip(),
            "year":        parts[4].strip() if len(parts) > 4 else "",
            "rating":      parts[5].strip() if len(parts) > 5 else "",
            "tags":        parts[6].strip() if len(parts) > 6 else "",
        }
        movie_db.append(movie)
        raw_actors.update(actors_list)
        corpus_texts.append(
            f"Phim {movie['title']}. Thể loại {movie['genre']}. "
            f"Diễn viên {parts[2].strip()}. Nội dung: {movie['description']}. "
            f"Tags: {movie.get('tags','')}."
        )

    actor_norm_map = {normalize(a): a for a in raw_actors}

    # BM25
    build_bm25(corpus_texts)

    # FAISS with cosine similarity (normalize → IndexFlatIP)
    print(f"[INFO] Encoding {len(corpus_texts)} documents...")
    emb = model.encode(corpus_texts, show_progress_bar=True, batch_size=32)
    faiss.normalize_L2(emb)
    faiss_index = faiss.IndexFlatIP(emb.shape[1])
    faiss_index.add(emb.astype('float32'))
    print(f"[OK] {len(movie_db)} phim | {len(actor_norm_map)} diễn viên | dim={emb.shape[1]}")

# ═══════════════════════════════════════════════
#  HYBRID SEARCH
# ═══════════════════════════════════════════════

def hybrid_search(query: str, top_k: int = 5) -> list[dict]:
    if faiss_index is None:
        return []

    intent = extract_intent(query)
    N      = len(movie_db)

    # Dense retrieval
    q_vec = model.encode([intent.semantic_query]).astype('float32')
    faiss.normalize_L2(q_vec)
    _, idx_dense = faiss_index.search(q_vec, N)
    dense_rank   = idx_dense[0].tolist()

    # Sparse retrieval (BM25)
    q_tokens      = tokenize(intent.semantic_query)
    sparse_scores = sorted(range(N), key=lambda i: -bm25_score(q_tokens, i))

    # RRF fusion
    fused = reciprocal_rank_fusion(dense_rank, sparse_scores)

    # Filter + score
    results = []
    for idx, rrf_score in fused:
        movie = movie_db[idx]
        if not passes_hard_filter(movie, intent):
            continue
        bonus       = compute_bonus(movie, intent)
        final_score = rrf_score + bonus * 0.01
        results.append({
            "title":          movie["title"],
            "genre":          movie["genre"],
            "actors":         movie["actors"],
            "description":    movie["description"],
            "year":           movie.get("year", ""),
            "rating":         movie.get("rating", ""),
            "matched_intent": intent.to_dict(),
            "_score":         final_score,
        })

    results.sort(key=lambda x: -x["_score"])
    for r in results:
        r.pop("_score", None)
    return results[:top_k]

# ═══════════════════════════════════════════════
#  FLASK API
# ═══════════════════════════════════════════════

@app.route('/api/ai/search', methods=['POST'])
def api_search():
    if faiss_index is None:
        return jsonify({"error": "Engine chưa sẵn sàng"}), 503
    body  = request.get_json(silent=True) or {}
    query = body.get('query', '').strip()
    top_k = min(int(body.get('top_k', 5)), 20)
    if not query:
        return jsonify([])
    return jsonify(hybrid_search(query, top_k))

@app.route('/api/ai/intent', methods=['POST'])
def api_intent():
    body  = request.get_json(silent=True) or {}
    query = body.get('query', '').strip()
    if not query:
        return jsonify({"error": "Thiếu query"}), 400
    return jsonify(extract_intent(query).to_dict())

@app.route('/api/movies', methods=['GET'])
def api_movies():
    page  = max(int(request.args.get('page', 1)), 1)
    size  = min(int(request.args.get('size', 20)), 100)
    genre = request.args.get('genre', '').strip().lower()
    actor = request.args.get('actor', '').strip().lower()
    pool  = movie_db
    if genre:
        pool = [m for m in pool if genre in normalize(m['genre'])]
    if actor:
        pool = [m for m in pool if any(actor in normalize(a) for a in m['actors'])]
    start = (page - 1) * size
    return jsonify({"total": len(pool), "page": page, "size": size, "data": pool[start:start+size]})

@app.route('/api/actors', methods=['GET'])
def api_actors():
    q      = normalize(request.args.get('q', ''))
    actors = sorted(actor_norm_map.values())
    if q:
        actors = [a for a in actors if q in normalize(a)]
    return jsonify({"total": len(actors), "data": actors})

@app.route('/api/health', methods=['GET'])
def api_health():
    return jsonify({
        "status":      "ok",
        "movies":      len(movie_db),
        "actors":      len(actor_norm_map),
        "bm25_terms":  len(bm25_idf),
        "index_ready": faiss_index is not None,
    })

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else r'D:\Python\movies.txt'
    build_search_engine(path)
    app.run(port=5001, debug=False)