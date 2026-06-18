package com.movie.client;

import com.movie.dto.RelatedDtos.*;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@FeignClient(name = "movie-service")
public interface MovieServiceInternalClient {

    @GetMapping("/api/movies/{id}")
    MovieDetailDto getById(@PathVariable Long id);

    @GetMapping("/api/movies/same-genre")
    List<MovieCardDto> getSameGenre(@RequestParam String genre,
                                    @RequestParam Long excludeId,
                                    @RequestParam(defaultValue = "6") int limit);

    @GetMapping("/api/movies/same-actors")
    List<MovieCardDto> getSameActors(@RequestParam List<String> actorNames,
                                     @RequestParam Long excludeId,
                                     @RequestParam(defaultValue = "6") int limit);
}