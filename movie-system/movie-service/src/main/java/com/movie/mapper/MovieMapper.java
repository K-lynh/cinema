package com.movie.mapper;

import com.movie.dto.MovieDtos.*;
import com.movie.entity.Movie;
import com.movie.entity.MovieActor;
import com.movie.entity.Trailer;
import org.mapstruct.*;

import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface MovieMapper {

    // ── Entity → DetailResponse ───────────────────────────────────────────
    @Mapping(source = "releaseYear", target = "year")
    @Mapping(target = "actors", expression = "java(mapActors(movie.getMovieActors()))")
    @Mapping(target = "trailerUrl", expression = "java(mapTrailerUrl(movie.getTrailers()))")
    MovieDetailResponse toDetail(Movie movie);

    // ── Entity → CardResponse ─────────────────────────────────────────────
    @Mapping(source = "releaseYear", target = "year") // Thêm dòng này
    @Mapping(target = "actorNames", expression = "java(mapActorNames(movie.getMovieActors()))")
    MovieCardResponse toCard(Movie movie);

    List<MovieCardResponse> toCardList(List<Movie> movies);

    // ── Helpers ───────────────────────────────────────────────────────────
    default List<ActorDto> mapActors(List<MovieActor> movieActors) {
        if (movieActors == null) return List.of();
        return movieActors.stream()
                .map(ma -> ActorDto.builder()
                        .id(ma.getActor().getId())
                        .name(ma.getActor().getName())
                        .avatarUrl(ma.getActor().getAvatarUrl())
                        .roleName(ma.getRoleName())
                        .build())
                .collect(Collectors.toList());
    }

    default List<String> mapActorNames(List<MovieActor> movieActors) {
        if (movieActors == null) return List.of();
        return movieActors.stream()
                .map(ma -> ma.getActor().getName())
                .collect(Collectors.toList());
    }

    default String mapTrailerUrl(List<Trailer> trailers) {
        if (trailers != null && !trailers.isEmpty()) {
            // Lấy URL của trailer đầu tiên trong danh sách
            return trailers.get(0).getVideoUrl();
        }
        return null;
    }

}
