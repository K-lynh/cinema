package com.movie.service;

import com.movie.dto.ShowtimeDtos;
import com.movie.entity.Movie;
import com.movie.entity.Room;
import com.movie.entity.Showtime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface ShowtimeService {
    Showtime createShowtime(ShowtimeDtos.ShowtimeCreateRequest request);
    List<Showtime> getShowtimesByMovieAndDate(Long movieId, LocalDate date);
    Showtime getShowtimeById(Long id);

    Page<Showtime> getFiltered(Long movieId, LocalDateTime startTime, Pageable pageable);
    Showtime getById(Long id);
    Showtime updateShowtime(Long id, ShowtimeDtos.ShowtimeCreateRequest request);
    void deleteShowtime(Long id);
    void mapRequestToShowtime(ShowtimeDtos.ShowtimeCreateRequest request, Showtime showtime, Movie movie, Room room);
}