package com.movie.service;

import com.movie.dto.MovieDtos;
import com.movie.entity.Movie;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MovieService {
    List<Movie> getAllMovies();
    List<Movie> getMoviesByStatus(String status);
    Movie getMovieById(Long id);
    List<Movie> searchMovies(String keyword);

    List<Movie> getMoviesByTitles(List<String> titles);
    MovieDtos.MovieDetailResponse createMovieWithPoster(Movie movie, MultipartFile file);

    void updateMovie(Long id, Movie movie, MultipartFile file);
}