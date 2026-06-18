package com.movie.client;

import com.movie.dto.SearchDtos.*;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Feign client gọi movie-service qua Eureka load balancing.
 */
@FeignClient(name = "movie-service")
public interface MovieServiceClient {

    @PostMapping("/api/movies/bulk-by-titles")
    List<MovieCardDto> getBulkByTitles(@RequestBody List<String> titles);

    @GetMapping("/api/movies/{id}")
    MovieDetailDto getById(@PathVariable Long id);

    @GetMapping("/api/movies/by-title")
    MovieDetailDto getByTitle(@RequestParam String title);


}
