package com.movie.controller;

import com.movie.dto.MovieDtos;
import com.movie.dto.MovieDtos.*;
import com.movie.entity.Movie;
import com.movie.mapper.MovieMapper;
import com.movie.service.MovieService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;
    private final MovieMapper movieMapper;

    // ── 1. API Phục vụ Frontend (Trang chủ & Tìm kiếm) ──────────────────────────

    @GetMapping
    public ResponseEntity<List<MovieCardResponse>> getMovies(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status) {

        List<Movie> movies;
        if (keyword != null && !keyword.trim().isEmpty()) {
            log.info("Searching movies with keyword: {}", keyword);
            movies = movieService.searchMovies(keyword);
        } else if (status != null && !status.trim().isEmpty()) {
            movies = movieService.getMoviesByStatus(status);
        } else {
            movies = movieService.getAllMovies();
        }

        return ResponseEntity.ok(movieMapper.toCardList(movies));
    }

    // ── 2. API Lấy chi tiết phim (Frontend & related-service gọi) ───────────

    @GetMapping("/{id}")
    public ResponseEntity<MovieDetailResponse> getMovieById(@PathVariable Long id) {
        log.info("Fetching movie detail for ID: {}", id);
        Movie movie = movieService.getMovieById(id);
        return ResponseEntity.ok(movieMapper.toDetail(movie));
    }

    // ── 3. API Nội bộ: Lấy phim cùng thể loại (Dành cho related-service) ────

    @GetMapping("/same-genre")
    public ResponseEntity<List<MovieCardResponse>> getSameGenre(
            @RequestParam String genre,
            @RequestParam Long excludeId,
            @RequestParam(defaultValue = "6") int limit) {

        // Lấy từ khóa thể loại chính (Ví dụ: "Hài - Tâm lý" -> Chỉ lấy "Hài" để filter cho rộng)
        String primaryGenre = genre.split("-")[0].trim().toLowerCase();

        List<Movie> allMovies = movieService.getAllMovies();
        List<Movie> sameGenreMovies = allMovies.stream()
                .filter(m -> !m.getId().equals(excludeId)) // Loại bỏ bộ phim hiện tại đang xem
                .filter(m -> m.getGenre() != null && m.getGenre().toLowerCase().contains(primaryGenre))
                .limit(limit)
                .collect(Collectors.toList());

        return ResponseEntity.ok(movieMapper.toCardList(sameGenreMovies));
    }

    // ── 4. API Nội bộ: Lấy phim cùng diễn viên (Dành cho related-service) ───

    @GetMapping("/same-actors")
    public ResponseEntity<List<MovieCardResponse>> getSameActors(
            @RequestParam List<String> actorNames,
            @RequestParam Long excludeId,
            @RequestParam(defaultValue = "6") int limit) {

        if (actorNames == null || actorNames.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Movie> allMovies = movieService.getAllMovies();
        List<Movie> sameActorMovies = allMovies.stream()
                .filter(m -> !m.getId().equals(excludeId)) // Loại bỏ phim hiện tại
                .filter(m -> m.getMovieActors() != null && m.getMovieActors().stream()
                        // Nếu phim này có bất kỳ diễn viên nào nằm trong danh sách actorNames -> Lấy
                        .anyMatch(ma -> actorNames.contains(ma.getActor().getName())))
                .limit(limit)
                .collect(Collectors.toList());

        return ResponseEntity.ok(movieMapper.toCardList(sameActorMovies));
    }

    @PostMapping("/bulk-by-titles")
    public ResponseEntity<List<MovieCardResponse>> getBulkByTitles(@RequestBody List<String> titles) {
        if (titles == null || titles.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        // Gọi service lấy danh sách và giữ nguyên thứ tự AI đã sắp xếp
        List<Movie> orderedMovies = movieService.getMoviesByTitles(titles);
        return ResponseEntity.ok(movieMapper.toCardList(orderedMovies));
    }

    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tạo mới phim và upload poster",
            description = "")
    public ResponseEntity<MovieDtos.MovieDetailResponse> createMovie(
            @RequestPart("movie") Movie movie,
            @RequestPart(value = "file", required = false) MultipartFile file) {

        // Gọi đúng vào Service xử lý logic và lưu DB
        MovieDtos.MovieDetailResponse response = movieService.createMovieWithPoster(movie, file);

        return ResponseEntity.ok(response);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateMovie(
            @PathVariable Long id,
            @RequestPart("movie") Movie movie,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        movieService.updateMovie(id, movie, file);
        return ResponseEntity.ok("Cập nhật thành công");
    }

}