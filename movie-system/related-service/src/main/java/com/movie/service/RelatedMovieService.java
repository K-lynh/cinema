package com.movie.service;

import com.movie.client.AiRelatedClient;
import com.movie.client.MovieServiceInternalClient;
import com.movie.dto.RelatedDtos.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

/**
 * Lấy chi tiết phim + 3 nhóm liên quan song song bằng CompletableFuture.
 *
 * Flow:
 * 1. Lấy MovieDetail từ movie-service (blocking — cần data này trước)
 * 2. Song song:
 * a. Same-genre  → movie-service
 * b. Same-actor  → movie-service
 * c. AI suggest  → Python (dùng title+genre làm query)
 * 3. Join tất cả → trả response
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RelatedMovieService {

    private final MovieServiceInternalClient movieClient;
    private final AiRelatedClient            aiClient;

    // Inject custom Thread Pool
    @Qualifier("feignAsyncTaskExecutor")
    private final Executor asyncExecutor;

    public MovieWithRelatedResponse getMovieWithRelated(Long movieId) {
        long start = System.currentTimeMillis();

        // 1. Lấy thông tin phim chính (Nếu lỗi ở đây, quăng exception ra Controller xử lý @ExceptionHandler)
        MovieDetailDto movie = movieClient.getById(movieId);
        log.debug("[Related] Fetched movie: {} ({})", movie.getTitle(), movie.getGenre());

        List<String> actorNames = movie.getActors() == null ? List.of()
                : movie.getActors().stream().map(ActorDto::getName).collect(Collectors.toList());
        String aiQuery = buildAiQuery(movie);

        // 2. Gọi song song với Custom Executor
        CompletableFuture<List<MovieCardDto>> genreFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return movieClient.getSameGenre(movie.getGenre(), movieId, 6);
            } catch (Exception e) {
                log.warn("[Related] same-genre failed: {}", e.getMessage());
                return List.of();
            }
        }, asyncExecutor);

        CompletableFuture<List<MovieCardDto>> actorFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return actorNames.isEmpty() ? List.of()
                        : movieClient.getSameActors(actorNames, movieId, 6);
            } catch (Exception e) {
                log.warn("[Related] same-actor failed: {}", e.getMessage());
                return List.of();
            }
        }, asyncExecutor);

        CompletableFuture<List<MovieCardDto>> aiFuture = CompletableFuture.supplyAsync(() -> {
            try {
                List<AiMovieResult> aiResults = aiClient.search(new AiSearchRequest(aiQuery, 6));
                return aiResults.stream()
                        .filter(r -> !r.getTitle().equalsIgnoreCase(movie.getTitle()))
                        .map(this::aiResultToCard)
                        .collect(Collectors.toList());
            } catch (Exception e) {
                log.warn("[Related] AI recommend failed: {}", e.getMessage());
                return List.of();
            }
        }, asyncExecutor);

        // 3. Chờ tất cả hoàn thành
        CompletableFuture.allOf(genreFuture, actorFuture, aiFuture).join();

        log.info("[Related] Done for movieId={} in {}ms", movieId, System.currentTimeMillis() - start);

        return MovieWithRelatedResponse.builder()
                .movie(movie)
                .relatedBySameGenre(genreFuture.join())
                .relatedBySameActor(actorFuture.join())
                .aiRecommended(aiFuture.join())
                .build();
    }

    // ── Fallback khi movie-service không phản hồi (Dành cho @CircuitBreaker trên Client nếu có) ──
    public MovieWithRelatedResponse fallbackRelated(Long movieId, Throwable t) {
        log.error("[Related] Fallback for movieId={}: {}", movieId, t.getMessage());
        return MovieWithRelatedResponse.builder()
                .relatedBySameGenre(List.of())
                .relatedBySameActor(List.of())
                .aiRecommended(List.of())
                .build();
    }

    // ── Build AI query từ thông tin phim hiện tại ─────────────────────────
    private String buildAiQuery(MovieDetailDto movie) {
        StringBuilder sb = new StringBuilder();
        sb.append("phim ").append(movie.getGenre());
        if (movie.getActors() != null && !movie.getActors().isEmpty()) {
            sb.append(" có ").append(movie.getActors().get(0).getName());
        }
        // Thêm từ khóa từ description (lấy 50 ký tự đầu)
        if (movie.getDescription() != null && movie.getDescription().length() > 10) {
            sb.append(" ").append(movie.getDescription(), 0,
                    Math.min(50, movie.getDescription().length()));
        }
        return sb.toString();
    }

    private MovieCardDto aiResultToCard(AiMovieResult r) {
        MovieCardDto card = new MovieCardDto();
        card.setId(r.getId()); // Đã bổ sung mapping ID từ Python AI trả về
        card.setTitle(r.getTitle());
        card.setGenre(r.getGenre());
        card.setYear(r.getYear());
        card.setActorNames(r.getActors());
        return card;
    }
}