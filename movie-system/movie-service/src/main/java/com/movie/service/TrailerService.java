package com.movie.service;

import com.movie.entity.Trailer;
import java.util.List;

public interface TrailerService {
    List<Trailer> getTrailersByMovieId(Long movieId);
    Trailer createTrailer(Long movieId, Trailer trailer);
    void deleteTrailer(Long id);
}