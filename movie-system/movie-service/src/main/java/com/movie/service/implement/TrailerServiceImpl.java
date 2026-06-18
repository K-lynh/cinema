package com.movie.service.implement;

import com.movie.entity.Movie;
import com.movie.entity.Trailer;
import com.movie.repository.MovieRepository;
import com.movie.repository.TrailerRepository;
import com.movie.service.TrailerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TrailerServiceImpl implements TrailerService {

    private final TrailerRepository trailerRepository;
    private final MovieRepository movieRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Trailer> getTrailersByMovieId(Long movieId) {
        return trailerRepository.findByMovieId(movieId);
    }

    @Override
    @Transactional
    public Trailer createTrailer(Long movieId, Trailer trailer) {
        try {
            // Kiểm tra xem phim có tồn tại không
            Movie movie = movieRepository.findById(movieId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + movieId));

            // Gán phim cho trailer (Thiết lập quan hệ)
            trailer.setMovie(movie);

            // Lưu vào DB
            return trailerRepository.save(trailer);
        } catch (Exception e) {
            throw new RuntimeException("Không thể tạo mới trailer: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void deleteTrailer(Long id) {
        if (!trailerRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy trailer với ID: " + id);
        }
        trailerRepository.deleteById(id);
    }
}