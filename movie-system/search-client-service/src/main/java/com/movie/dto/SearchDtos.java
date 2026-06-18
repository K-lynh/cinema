package com.movie.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

public class SearchDtos {

    // ── Request đến search-service ────────────────────────────────────────
    @Data @NoArgsConstructor @AllArgsConstructor
    public static class NaturalLanguageRequest {
        @lombok.NonNull
        private String query;
        private int topK = 5;
    }

    // ── Payload gửi sang Python AI ────────────────────────────────────────
    @Data @AllArgsConstructor
    public static class AiSearchRequest {
        private String query;
        private int    top_k;
    }

    // ── Response từ Python AI ─────────────────────────────────────────────
    @Data @NoArgsConstructor
    public static class AiMovieResult {
        private String title;
        private String genre;
        private List<String> actors;
        private String description;
        private String year;
        private String rating;
        private MatchedIntent matched_intent;
    }

    @Data @NoArgsConstructor
    public static class MatchedIntent {
        private List<String> actors;
        private List<String> roles;
        private List<String> genres;
        private List<String> emotions;
        private List<Object> conditions;
        private String       semantic_query;
    }

    @Data @NoArgsConstructor
    public static class IntentDebug {
        private List<String> actors;
        private List<String> roles;
        private List<String> genres;
        private List<String> negated_genres;
        private List<String> emotions;
        private List<Object> conditions;
        private String       semantic_query;
    }

    // ── DTOs nhận từ movie-service ────────────────────────────────────────
    @Data @NoArgsConstructor
    public static class MovieCardDto {
        private Long         id;
        private String       title;
        private String       genre;
        private String       year;
        private BigDecimal   rating;
        private String       posterUrl;
        private List<String> actorNames;
    }

    @Data @NoArgsConstructor
    public static class MovieDetailDto {
        private Long           id;
        private String         title;
        private String         genre;
        private String         description;
        private String         year;
        private BigDecimal     rating;
        private String         posterUrl;
        private String         trailerUrl;
        private String         director;
        private String         duration;
        private String         country;
        private List<ActorDto> actors;
    }

    @Data @NoArgsConstructor
    public static class ActorDto {
        private Long   id;
        private String name;
        private String avatarUrl;
        private String roleName;
    }

    // ── Response tổng hợp trả về FE ──────────────────────────────────────
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SearchResponse {
        private String           query;
        private IntentDebug      parsedIntent;       // AI hiểu query thế nào
        private List<MovieCardDto> results;           // Kết quả theo rank AI
        private long             totalFound;
        private long             responseTimeMs;
    }
}
