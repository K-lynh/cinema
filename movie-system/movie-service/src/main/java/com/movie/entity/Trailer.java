package com.movie.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "trailers")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Trailer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "NVARCHAR(255)")
    private String title; // Ví dụ: "Teaser 1", "Official Trailer"

    @Column(nullable = false, columnDefinition = "VARCHAR(500)")
    private String videoUrl; // Link lưu trữ video (YouTube, MinIO, CDN...)

    @Column(columnDefinition = "VARCHAR(500)")
    private String thumbnailUrl; // Ảnh cover của trailer (tuỳ chọn)

    // Quan hệ N-1 với Movie
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false)
    @JsonIgnore // Quan trọng: Tránh lỗi vòng lặp vô hạn (Infinite Recursion) khi parse JSON
    @ToString.Exclude // Tránh lỗi StackOverflow khi in log
    private Movie movie;
}