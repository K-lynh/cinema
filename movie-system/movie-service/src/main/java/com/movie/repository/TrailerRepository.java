package com.movie.repository;

import com.movie.entity.Trailer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrailerRepository extends JpaRepository<Trailer, Long> {
    // Lấy toàn bộ trailer thuộc về một bộ phim cụ thể
    List<Trailer> findByMovieId(Long movieId);
}