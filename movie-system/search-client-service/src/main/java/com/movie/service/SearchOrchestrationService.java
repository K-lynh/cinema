package com.movie.service;

import com.movie.client.AiSearchClient;
import com.movie.client.MovieServiceClient;
import com.movie.dto.SearchDtos.*;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Orchestration layer:
 *  1. Gọi Python AI → nhận ranked list tên phim
 *  2. Bulk-call movie-service → lấy đầy đủ info từ DB (giữ rank order)
 *  3. Gọi intent debug → trả kèm explanation cho FE
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchOrchestrationService {

    private final AiSearchClient    aiSearchClient;
    private final MovieServiceClient movieServiceClient;

    // ── Natural Language Search ────────────────────────────────────────────
    @CircuitBreaker(name = "ai-service", fallbackMethod = "fallbackSearch")
    public SearchResponse naturalLanguageSearch(String query, int topK) {
        long start = System.currentTimeMillis();

        // Step 1: Gọi AI → ranked list tên phim
        log.debug("[Search] Calling Python AI: query='{}' topK={}", query, topK);
        List<AiMovieResult> aiResults = aiSearchClient.search(
                new AiSearchRequest(query, topK));

        // Step 2: Lấy intent explanation (async nhưng để đơn giản gọi sync ở đây)
        IntentDebug intent = null;
        try {
            intent = aiSearchClient.debugIntent(new AiSearchRequest(query, topK));
        } catch (Exception e) {
            log.warn("Intent debug failed (non-critical): {}", e.getMessage());
        }

        // Step 3: Nếu AI không tìm thấy → trả về rỗng ngay
        if (aiResults == null || aiResults.isEmpty()) {
            return SearchResponse.builder()
                    .query(query)
                    .parsedIntent(intent)
                    .results(List.of())
                    .totalFound(0)
                    .responseTimeMs(System.currentTimeMillis() - start)
                    .build();
        }

        // Step 4: Extract title list (giữ rank order)
        List<String> rankedTitles = aiResults.stream()
                .map(AiMovieResult::getTitle)
                .collect(Collectors.toList());

        // Step 5: Bulk call movie-service → enrich với đầy đủ data từ DB
        List<MovieCardDto> enriched;
        try {
            enriched = movieServiceClient.getBulkByTitles(rankedTitles);
        } catch (Exception e) {
            log.error("movie-service bulk call failed: {}", e.getMessage());
            // Fallback: trả kết quả từ AI mà không có DB data
            enriched = mapAiResultsToCards(aiResults);
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("[Search] Done: '{}' → {} results in {}ms", query, enriched.size(), elapsed);

        return SearchResponse.builder()
                .query(query)
                .parsedIntent(intent)
                .results(enriched)
                .totalFound(enriched.size())
                .responseTimeMs(elapsed)
                .build();
    }

    // ── Circuit Breaker Fallback ───────────────────────────────────────────
    public SearchResponse fallbackSearch(String query, int topK, Throwable t) {
        log.error("[Search] Circuit open — fallback for query='{}': {}", query, t.getMessage());
        return SearchResponse.builder()
                .query(query)
                .results(List.of())
                .totalFound(0)
                .responseTimeMs(0)
                .build();
    }

    // ── Helper: map AI result → card khi DB không available ──────────────
    private List<MovieCardDto> mapAiResultsToCards(List<AiMovieResult> aiResults) {
        return aiResults.stream().map(r -> {
            MovieCardDto card = new MovieCardDto();
            card.setTitle(r.getTitle());
            card.setGenre(r.getGenre());
            card.setYear(r.getYear());
            card.setActorNames(r.getActors());
            return card;
        }).collect(Collectors.toList());
    }
}
