package com.movie.service.implement;

import com.movie.dto.ShowtimeDtos;
import com.movie.entity.Movie;
import com.movie.entity.Room;
import com.movie.entity.Showtime;
import com.movie.repository.MovieRepository;
import com.movie.repository.RoomRepository;
import com.movie.repository.ShowtimeRepository;
import com.movie.service.ShowtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShowtimeServiceImpl implements ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final RoomRepository roomRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Showtime> getShowtimesByMovieAndDate(Long movieId, LocalDate date) {
        return showtimeRepository.findByMovieIdAndShowDate(movieId, date);
    }

    @Override
    @Transactional(readOnly = true)
    public Showtime getShowtimeById(Long id) {
        return showtimeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy suất chiếu với ID: " + id));
    }

    @Override
    public Page<Showtime> getFiltered(Long movieId, LocalDateTime startTime, Pageable pageable) {

        LocalTime safeLocalTime = (startTime != null) ? startTime.toLocalTime() : null;

        // 2. Truyền LocalTime xuống Repository
        return showtimeRepository.filterShowtimes(movieId, safeLocalTime, pageable);
    }
    @Override
    public Showtime getById(Long id) {
        return showtimeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lịch chiếu id: " + id));
    }

    @Override
    public Showtime updateShowtime(Long id, ShowtimeDtos.ShowtimeCreateRequest request) {
        Showtime showtime = getById(id);
        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new RuntimeException("Phim không tồn tại"));
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Phòng không tồn tại"));

        mapRequestToShowtime(request, showtime, movie, room);
        return showtimeRepository.save(showtime);
    }

    @Override
    @Transactional
    public void deleteShowtime(Long id) {
        Showtime showtime = getById(id);
        showtimeRepository.delete(showtime);
    }

    @Override
    @Transactional
    public void mapRequestToShowtime(ShowtimeDtos.ShowtimeCreateRequest request, Showtime showtime, Movie movie, Room room) {
        showtime.setMovie(movie);
        showtime.setRoom(room);
        showtime.setShowDate(request.getShowDate());
        showtime.setStartTime(request.getStartTime());
        showtime.setBasePrice(request.getBasePrice());

    }

    @Override
    public Showtime createShowtime(ShowtimeDtos.ShowtimeCreateRequest request) {

        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim"));
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng chiếu"));

        if (movie.getEndDate() != null && request.getShowDate().isAfter(movie.getEndDate())) {
            throw new RuntimeException("Lỗi: Phim này chỉ được phép chiếu đến ngày " + movie.getEndDate());
        }
        Showtime showtime = new Showtime();
        mapRequestToShowtime(request, showtime, movie, room);

        return showtimeRepository.save(showtime);
    }
}