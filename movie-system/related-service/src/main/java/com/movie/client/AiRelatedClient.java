package com.movie.client;

import com.movie.dto.RelatedDtos.*;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@FeignClient(name = "python-ai-related", url = "${ai.service.url:http://localhost:5001}")
public interface AiRelatedClient {

    @PostMapping("/api/ai/search")
    List<AiMovieResult> search(@RequestBody AiSearchRequest request);
}