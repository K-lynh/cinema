package com.movie.repository;

import com.movie.entity.Movie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {

    List<Movie> findByStatus(String status);

    // Truy vấn kết hợp tìm kiếm theo tên phim, thể loại, hoặc tên diễn viên
    @Query("SELECT DISTINCT m FROM Movie m " +
            "LEFT JOIN MovieActor ma ON m.id = ma.movie.id " +
            "LEFT JOIN Actor a ON ma.actor.id = a.id " +
            "WHERE LOWER(m.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(m.genre) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(a.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Movie> searchByKeyword(@Param("keyword") String keyword);

    @Query(value = "SELECT * FROM movies WHERE title IN (:titles)", nativeQuery = true)
    List<Movie> findByTitleIn(@Param("titles") List<String> titles);

    @Query("SELECT m FROM Movie m WHERE m.status = :status AND (m.endDate IS NULL OR m.endDate >= CURRENT_DATE)")
    List<Movie> findShowingAndValidMovies(@Param("status") String status);
}