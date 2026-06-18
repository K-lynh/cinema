package com.movie.client;

import com.movie.dto.SearchDtos.*;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

/**
 * Feign client gọi thẳng đến Python AI service (port 5001).
 * Không đi qua Eureka vì Python không register — dùng URL cứng.
 */
@FeignClient(
    name    = "python-ai-service",
    url     = "${ai.service.url:http://localhost:5001}",
    configuration = FeignConfig.class
)
public interface AiSearchClient {

    /** Gửi query ngôn ngữ tự nhiên → nhận list tên phim ranked */
    @PostMapping("/api/ai/search")
    List<AiMovieResult> search(@RequestBody AiSearchRequest request);

    /** Debug endpoint: xem AI hiểu query thế nào */
    @PostMapping("/api/ai/intent")
    IntentDebug debugIntent(@RequestBody AiSearchRequest request);
}
