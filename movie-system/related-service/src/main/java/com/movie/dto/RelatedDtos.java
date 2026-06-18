package com.movie.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

public class RelatedDtos {

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

    /** Payload gửi Python AI để lấy gợi ý tương tự */
    @Data @AllArgsConstructor
    public static class AiSearchRequest {
        private String query;
        private int    top_k;
    }

    @Data @NoArgsConstructor
    public static class AiMovieResult {
        private Long         id;
        private String       title;
        private String       genre;
        private List<String> actors;
        private String       description;
        private String       year;
        private String       rating;
    }

    /** Response tổng hợp: chi tiết phim + 3 nhóm phim liên quan */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MovieWithRelatedResponse {
        private MovieDetailDto       movie;
        private List<MovieCardDto>   relatedBySameGenre;    // cùng thể loại
        private List<MovieCardDto>   relatedBySameActor;    // cùng diễn viên
        private List<MovieCardDto>   aiRecommended;         // AI gợi ý thêm
    }
}
