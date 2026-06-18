package com.movie.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "movies")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Movie {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Column(columnDefinition = "NVARCHAR(100)")
    private String genre;

    private String releaseYear;

    private Double rating;

    @Column(columnDefinition = "NVARCHAR(50)")
    private String duration;

    @Column(columnDefinition = "NVARCHAR(100)")
    private String director;

    @Column(columnDefinition = "VARCHAR(500)")
    private String posterUrl;

    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MovieActor> movieActors;

    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Trailer> trailers;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(length = 20)
    private String status;

    // THÊM TRƯỜNG NÀY: Ngày kết thúc chiếu
    @Column(name = "end_date")
    private LocalDate endDate;
}