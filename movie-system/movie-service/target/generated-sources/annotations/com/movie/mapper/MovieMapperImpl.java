package com.movie.mapper;

import com.movie.dto.MovieDtos;
import com.movie.entity.Movie;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-18T09:07:08+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 23.0.2 (Oracle Corporation)"
)
@Component
public class MovieMapperImpl implements MovieMapper {

    @Override
    public MovieDtos.MovieDetailResponse toDetail(Movie movie) {
        if ( movie == null ) {
            return null;
        }

        MovieDtos.MovieDetailResponse.MovieDetailResponseBuilder movieDetailResponse = MovieDtos.MovieDetailResponse.builder();

        movieDetailResponse.year( movie.getReleaseYear() );
        movieDetailResponse.id( movie.getId() );
        movieDetailResponse.title( movie.getTitle() );
        movieDetailResponse.genre( movie.getGenre() );
        movieDetailResponse.description( movie.getDescription() );
        if ( movie.getRating() != null ) {
            movieDetailResponse.rating( BigDecimal.valueOf( movie.getRating() ) );
        }
        movieDetailResponse.posterUrl( movie.getPosterUrl() );
        movieDetailResponse.director( movie.getDirector() );
        movieDetailResponse.duration( movie.getDuration() );

        movieDetailResponse.actors( mapActors(movie.getMovieActors()) );
        movieDetailResponse.trailerUrl( mapTrailerUrl(movie.getTrailers()) );

        return movieDetailResponse.build();
    }

    @Override
    public MovieDtos.MovieCardResponse toCard(Movie movie) {
        if ( movie == null ) {
            return null;
        }

        MovieDtos.MovieCardResponse.MovieCardResponseBuilder movieCardResponse = MovieDtos.MovieCardResponse.builder();

        movieCardResponse.year( movie.getReleaseYear() );
        movieCardResponse.id( movie.getId() );
        movieCardResponse.title( movie.getTitle() );
        movieCardResponse.genre( movie.getGenre() );
        if ( movie.getRating() != null ) {
            movieCardResponse.rating( BigDecimal.valueOf( movie.getRating() ) );
        }
        movieCardResponse.posterUrl( movie.getPosterUrl() );

        movieCardResponse.actorNames( mapActorNames(movie.getMovieActors()) );

        return movieCardResponse.build();
    }

    @Override
    public List<MovieDtos.MovieCardResponse> toCardList(List<Movie> movies) {
        if ( movies == null ) {
            return null;
        }

        List<MovieDtos.MovieCardResponse> list = new ArrayList<MovieDtos.MovieCardResponse>( movies.size() );
        for ( Movie movie : movies ) {
            list.add( toCard( movie ) );
        }

        return list;
    }
}
