package com.movie.controller;

import com.movie.dto.RelatedDtos.MovieWithRelatedResponse;
import com.movie.service.RelatedMovieService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/related")
@RequiredArgsConstructor
@Tag(name = "Related Service", description = "Phim liên quan: cùng thể loại, cùng diễn viên, AI gợi ý")
public class RelatedMovieController {

    private final RelatedMovieService relatedService;

    /**
     * GET /api/related/{movieId}
     * Trả về: chi tiết phim + 3 nhóm phim liên quan song song
     */
    @GetMapping("/{movieId}")
    @Operation(
        summary     = "Lấy phim + phim liên quan",
        description = "Gọi song song: same-genre, same-actor, AI recommend → join và trả về cùng lúc"
    )
    public ResponseEntity<MovieWithRelatedResponse> getWithRelated(@PathVariable Long movieId) {
        return ResponseEntity.ok(relatedService.getMovieWithRelated(movieId));
    }
}
