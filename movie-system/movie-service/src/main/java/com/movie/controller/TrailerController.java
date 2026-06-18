package com.movie.controller;

import com.movie.entity.Trailer;
import com.movie.service.TrailerService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/trailers")
@RequiredArgsConstructor
public class TrailerController {

    private final TrailerService trailerService;

    // ── 1. Lấy danh sách trailer của một bộ phim ────────────────────────────────

    @GetMapping("/movie/{movieId}")
    @Operation(summary = "Lấy danh sách trailer theo ID phim")
    public ResponseEntity<List<Trailer>> getTrailersByMovieId(@PathVariable Long movieId) {
        log.info("Fetching trailers for movie ID: {}", movieId);
        List<Trailer> trailers = trailerService.getTrailersByMovieId(movieId);
        return ResponseEntity.ok(trailers);
    }

    // ── 2. Thêm mới trailer cho một bộ phim ─────────────────────────────────────

    @PostMapping("/movie/{movieId}")
    @Operation(summary = "Thêm mới trailer vào phim")
    public ResponseEntity<Trailer> createTrailer(
            @PathVariable Long movieId,
            @RequestBody Trailer trailer) {

        log.info("Creating new trailer for movie ID: {}", movieId);
        Trailer savedTrailer = trailerService.createTrailer(movieId, trailer);
        return ResponseEntity.ok(savedTrailer);
    }

    // ── 3. Xóa một trailer ──────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa trailer theo ID")
    public ResponseEntity<Void> deleteTrailer(@PathVariable Long id) {
        log.info("Deleting trailer ID: {}", id);
        trailerService.deleteTrailer(id);
        return ResponseEntity.noContent().build();
    }
}