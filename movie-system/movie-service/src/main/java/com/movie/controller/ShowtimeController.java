package com.movie.controller;

import com.movie.dto.ShowtimeDtos;
import com.movie.entity.Showtime;
import com.movie.service.ShowtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

//@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/showtimes")
@RequiredArgsConstructor
public class ShowtimeController {

    private final ShowtimeService showtimeService;

    // ─── 1. Lấy chi tiết 1 suất chiếu ───
    @GetMapping("/{id}")
    public ResponseEntity<Showtime> getById(@PathVariable Long id) {
        return ResponseEntity.ok(showtimeService.getShowtimeById(id));
    }

    // ─── 2. Lấy danh sách suất chiếu của 1 Phim trong 1 Ngày ───
    @GetMapping("/movie/{movieId}")
    public ResponseEntity<List<Showtime>> getShowtimesByMovieAndDate(
            @PathVariable Long movieId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(showtimeService.getShowtimesByMovieAndDate(movieId, date));
    }

    // ─── 3. Lọc suất chiếu có Phân trang (Pagination) ───
    @GetMapping("/filter")
    public ResponseEntity<Page<Showtime>> getFilteredShowtimes(
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            Pageable pageable) {

        return ResponseEntity.ok(showtimeService.getFiltered(movieId, startTime, pageable));
    }

    // ─── 4. Tạo suất chiếu mới ───
    @PostMapping("/create")
    public ResponseEntity<Showtime> createShowtime(@RequestBody ShowtimeDtos.ShowtimeCreateRequest request) {
        Showtime newShowtime = showtimeService.createShowtime(request);
        return ResponseEntity.ok(newShowtime);
    }

    // ─── 5. Cập nhật suất chiếu ───
    @PutMapping("/{id}")
    public ResponseEntity<Showtime> updateShowtime(
            @PathVariable Long id,
            @RequestBody ShowtimeDtos.ShowtimeCreateRequest request) {
        return ResponseEntity.ok(showtimeService.updateShowtime(id, request));
    }

    // ─── 6. Xóa suất chiếu ───
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShowtime(@PathVariable Long id) {
        showtimeService.deleteShowtime(id);
        return ResponseEntity.noContent().build(); // Trả về HTTP 204 No Content
    }
}