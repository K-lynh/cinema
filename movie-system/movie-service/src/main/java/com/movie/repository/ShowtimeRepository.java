package com.movie.repository;

import com.movie.entity.Showtime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {

    @Query(value = "SELECT * FROM showtimes WHERE movie_id = :movieId AND show_date = :showDate", nativeQuery = true)
    List<Showtime> findByMovieIdAndShowDate(
            @Param("movieId") Long movieId,
            @Param("showDate") LocalDate showDate
    );

    @Query("SELECT s FROM Showtime s WHERE " +
            "(:movieId IS NULL OR s.movie.id = :movieId) AND " +
            "(:startTime IS NULL OR s.startTime >= CAST(:startTime AS time))")
    Page<Showtime> filterShowtimes(@Param("movieId") Long movieId,
                                   @Param("startTime") LocalTime startTime,
                                   Pageable pageable);
}