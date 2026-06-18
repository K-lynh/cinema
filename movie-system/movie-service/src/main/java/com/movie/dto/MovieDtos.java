package com.movie.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

// ── Request ────────────────────────────────────────────────────────────

public class MovieDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ActorDto {
        private Long   id;
        private String name;
        private String avatarUrl;
        private String roleName;
    }

    /** Response đầy đủ trả về FE */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MovieDetailResponse {
        private Long         id;
        private String       title;
        private String       genre;
        private String       description;
        private String       year;
        private BigDecimal   rating;
        private String       posterUrl;
        private String       trailerUrl;
        private String       director;
        private String       duration;
        private String       country;
        private List<ActorDto> actors;
    }

    /** Card nhỏ — dùng trong danh sách / phim liên quan */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MovieCardResponse {
        private Long       id;
        private String     title;
        private String     genre;
        private String     year;
        private BigDecimal rating;
        private String     posterUrl;
        private List<String> actorNames;
    }

    /** Phim liên quan gộp từ related-service */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RelatedMovieResponse {
        private MovieDetailResponse          movie;
        private List<MovieCardResponse>      relatedBySameGenre;
        private List<MovieCardResponse>      relatedBySameActor;
        private List<MovieCardResponse>      aiRecommended;
    }

    /** Payload từ AI service trả về (dùng nội bộ giữa các service) */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiSearchResult {
        private String title;
        // matched_intent từ Python
        private MatchedIntent matchedIntent;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class MatchedIntent {
        private List<String> actors;
        private List<String> roles;
        private List<String> genres;
        private List<String> emotions;
        private List<Object> conditions;
    }
}
