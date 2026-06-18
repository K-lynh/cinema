package com.movie.controller;

import com.movie.dto.SearchDtos.*;
import com.movie.service.SearchOrchestrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

//@CrossOrigin(origins = "*") // BẮT BUỘC THÊM DÒNG NÀY ĐỂ REACT CÓ THỂ GỌI ĐƯỢC
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Tag(name = "Search Service", description = "Tìm kiếm phim bằng ngôn ngữ tự nhiên qua AI")
public class SearchController {

    private final SearchOrchestrationService searchService;

    /**
     * POST /api/search/natural
     * Body: { "query": "phim mà Trấn Thành đóng vai bố", "topK": 5 }
     */
    @PostMapping("/natural")
    @Operation(summary = "Tìm kiếm ngôn ngữ tự nhiên",
            description = "Gọi Python AI → lấy tên phim → enrich từ DB → trả FE")
    public ResponseEntity<SearchResponse> naturalSearch(
            @Valid @RequestBody NaturalLanguageRequest request) {
        SearchResponse result = searchService.naturalLanguageSearch(
                request.getQuery(), request.getTopK());
        return ResponseEntity.ok(result);
    }

    /** GET /api/search/natural?query=...&topK=5 — tiện test từ browser */
    @GetMapping("/natural")
    @Operation(summary = "Tìm kiếm ngôn ngữ tự nhiên (GET — tiện test)")
    public ResponseEntity<SearchResponse> naturalSearchGet(
            @RequestParam String query,
            @RequestParam(defaultValue = "5") int topK) {
        return ResponseEntity.ok(searchService.naturalLanguageSearch(query, topK));
    }
}