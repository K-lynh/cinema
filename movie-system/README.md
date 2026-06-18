# Movie System — Spring Boot Microservices

## Kiến trúc tổng quan

```
FE (React/Vue)
    │
    ▼
[API Gateway :8080]  ← CORS, Rate Limit, Circuit Breaker, Retry
    │
    ├──► [search-client-service :8082]
    │        │── Feign → Python AI :5001  (NLP search)
    │        └── Feign → movie-service    (bulk DB enrich)
    │
    ├──► [related-service :8083]
    │        │── Feign → movie-service    (same-genre, same-actor)
    │        └── Feign → Python AI :5001  (AI recommend)
    │
    └──► [movie-service :8081]
             └── MySQL :3306

[Eureka Server :8761]  ← Service Discovery
```

## Services

| Service | Port | Vai trò |
|---|---|---|
| `api-gateway` | 8080 | Cổng duy nhất cho FE |
| `movie-service` | 8081 | CRUD + DB queries |
| `search-client-service` | 8082 | Orchestrate AI search |
| `related-service` | 8083 | Phim liên quan (parallel) |
| `Eureka Server` | 8761 | Service Discovery |
| `Python AI` | 5001 | NLP + FAISS + BM25 |
| `MySQL` | 3306 | Database |

## Cài đặt và chạy

### 1. Chạy bằng Docker Compose (khuyến nghị)
```bash
cd docker/
docker compose up -d
```

### 2. Chạy thủ công (dev)
```bash
# Terminal 1 — Python AI
cd ../python/
pip install flask flask-cors sentence-transformers faiss-cpu numpy underthesea
python ai_movie_search.py movies.txt

# Terminal 2 — Eureka (cần file eureka-server.jar riêng)
java -jar eureka-server.jar

# Terminal 3 — movie-service
cd movie-service/
mvn spring-boot:run

# Terminal 4 — search-client-service
cd search-client-service/
mvn spring-boot:run

# Terminal 5 — related-service
cd related-service/
mvn spring-boot:run

# Terminal 6 — api-gateway
cd api-gateway/
mvn spring-boot:run
```

## API Endpoints (qua Gateway :8080)

### Tìm kiếm ngôn ngữ tự nhiên
```http
POST /api/search/natural
Content-Type: application/json

{
  "query": "phim mà Trấn Thành đóng vai bố cảm động",
  "topK": 5
}
```

**Response:**
```json
{
  "query": "phim mà Trấn Thành đóng vai bố cảm động",
  "parsedIntent": {
    "actors": ["Trấn Thành"],
    "roles": ["bố"],
    "genres": [],
    "emotions": ["cảm động"],
    "conditions": [],
    "semantic_query": "cảm động vai bố cảm động"
  },
  "results": [
    {
      "id": 1,
      "title": "Bố Già",
      "genre": "Hài - Tâm lý",
      "year": "2021",
      "rating": 8.2,
      "posterUrl": null,
      "actorNames": ["Trấn Thành", "Tuấn Trần", "Ngân Chi"]
    }
  ],
  "totalFound": 1,
  "responseTimeMs": 312
}
```

### Lấy phim + phim liên quan
```http
GET /api/related/1
```

**Response:**
```json
{
  "movie": {
    "id": 1,
    "title": "Bố Già",
    "genre": "Hài - Tâm lý",
    "actors": [
      { "id": 1, "name": "Trấn Thành", "roleName": "Bố - Sang xe ôm" }
    ]
  },
  "relatedBySameGenre": [...],
  "relatedBySameActor": [...],
  "aiRecommended": [...]
}
```

### Các endpoint khác
```http
GET  /api/movies/{id}                    # Chi tiết phim theo ID
GET  /api/movies/by-title?title=Bố Già  # Chi tiết theo tên
GET  /api/movies/search?keyword=trấn&page=0&size=12
GET  /api/movies/filter?genre=hài&page=0
POST /api/movies/bulk-by-titles          # Body: ["Bố Già", "Mai"]
```

## Data Flow chi tiết

### Flow 1: Tìm kiếm AI
```
FE POST /api/search/natural
  → Gateway (CORS + rate limit)
    → search-client-service
      → [Feign] Python AI /api/ai/search  ← NLP + FAISS + BM25
        ← List<{title, matched_intent}>
      → [Feign] movie-service /api/movies/bulk-by-titles
        ← List<MovieCardDto> (DB data, giữ rank order AI)
    ← SearchResponse { query, parsedIntent, results, responseTimeMs }
  ← FE nhận kết quả đã enrich
```

### Flow 2: Xem phim + liên quan
```
FE GET /api/related/{id}
  → Gateway
    → related-service
      → [Feign] movie-service /api/movies/{id}  ← sequential (cần trước)
      → CompletableFuture.allOf() — song song:
          a. [Feign] movie-service /api/movies/same-genre
          b. [Feign] movie-service /api/movies/same-actors
          c. [Feign] Python AI /api/ai/search (query từ title+genre)
      ← join all → MovieWithRelatedResponse
  ← FE nhận 1 object chứa đủ mọi thứ
```

## Tính năng kỹ thuật

- **Circuit Breaker** (Resilience4j): tự động mở khi AI service lỗi, có fallback
- **Load Balancing** (Eureka + Feign): tự động cân bằng tải giữa các instance
- **Parallel Fetching** (CompletableFuture): 3 nhóm liên quan fetch song song
- **Rank Preservation**: giữ đúng thứ tự AI rank khi bulk lookup DB
- **Global CORS**: config tập trung tại Gateway
- **Problem Details** (RFC 9457): chuẩn error response
- **Swagger UI**: http://localhost:808X/swagger-ui.html mỗi service

## FE Integration Example (React)

```javascript
// Tìm kiếm AI
const searchMovies = async (query) => {
  const res = await fetch('http://localhost:8080/api/search/natural', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK: 5 })
  });
  return res.json();
  // { query, parsedIntent, results: [{id, title, genre, rating, actorNames}] }
};

// Lấy phim + liên quan
const getMovieWithRelated = async (movieId) => {
  const res = await fetch(`http://localhost:8080/api/related/${movieId}`);
  return res.json();
  // { movie, relatedBySameGenre, relatedBySameActor, aiRecommended }
};
```
