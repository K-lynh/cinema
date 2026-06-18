package com.movie.service.implement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.movie.dto.MovieDtos;
import com.movie.entity.Actor;
import com.movie.entity.Movie;
import com.movie.entity.MovieActor;
import com.movie.entity.Trailer;
import com.movie.mapper.MovieMapper;
import com.movie.repository.ActorRepository;
import com.movie.repository.MovieRepository;
import com.movie.service.FileService;
import com.movie.service.MovieService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MovieServiceImpl implements MovieService {

    private final MovieRepository movieRepository;

    @Autowired
    private FileService fileService;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private MovieMapper movieMapper;

    @Autowired
    private ActorRepository actorRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Movie> getAllMovies() {
        return movieRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Movie> getMoviesByStatus(String status) {
        // Nếu là phim đang chiếu thì dùng hàm lọc ngày hạn
        if ("showing".equalsIgnoreCase(status)) {
            return movieRepository.findShowingAndValidMovies(status);
        }
        return movieRepository.findByStatus(status);
    }

    @Override
    @Transactional(readOnly = true)
    public Movie getMovieById(Long id) {
        return movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Movie> searchMovies(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return movieRepository.findAll();
        }
        return movieRepository.searchByKeyword(keyword);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Movie> getMoviesByTitles(List<String> titles) {

        List<Movie> movies = movieRepository.findByTitleIn(titles);

        java.util.Map<String, Movie> movieMap = movies.stream()
                .collect(Collectors.toMap(
                        Movie::getTitle,
                        m -> m,
                        (existing, replacement) -> existing
                ));

        return titles.stream()
                .map(movieMap::get)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MovieDtos.MovieDetailResponse createMovieWithPoster(Movie movie, MultipartFile file) {
        try {
            // 1. Upload ảnh lên MinIO và lấy URL
            if (file != null && !file.isEmpty()) {
                String posterUrl = fileService.uploadPoster(file);
                movie.setPosterUrl(posterUrl);
            }

            // 2. Xử lý Transient Actor và Relationship 2 chiều cho MovieActor
            if (movie.getMovieActors() != null) {
                for (MovieActor ma : movie.getMovieActors()) {
                    Actor reqActor = ma.getActor();
                    if (reqActor != null && reqActor.getName() != null) {
                        Actor existingActor = actorRepository.findByNameIgnoreCase(reqActor.getName())
                                .orElseGet(() -> actorRepository.save(reqActor));
                        ma.setActor(existingActor);
                    }
                    // BẮT BUỘC: Trỏ ngược MovieActor về Movie
                    ma.setMovie(movie);
                }
            }

            if (movie.getTrailers() != null) {
                for (Trailer trailer : movie.getTrailers()) {
                    // BẮT BUỘC: Trỏ ngược Trailer về Movie hiện tại để Hibernate map khóa ngoại
                    trailer.setMovie(movie);
                }
            }

            // 4. Lưu vào SQL Server
            Movie savedMovie = movieRepository.save(movie);

            return movieMapper.toDetail(savedMovie);
        } catch (Exception e) {
            throw new RuntimeException("Không thể tạo mới phim: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void updateMovie(Long id, Movie requestMovie, MultipartFile file) {
        // 1. Tìm phim cũ trong Database
        Movie existingMovie = movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + id));

        // 2. Cập nhật các trường thông tin cơ bản
        existingMovie.setTitle(requestMovie.getTitle());
        existingMovie.setGenre(requestMovie.getGenre());
        existingMovie.setReleaseYear(requestMovie.getReleaseYear());
        existingMovie.setDirector(requestMovie.getDirector());
        existingMovie.setDuration(requestMovie.getDuration());
        existingMovie.setDescription(requestMovie.getDescription());
        existingMovie.setEndDate(requestMovie.getEndDate()); // Nhớ update cả ngày kết thúc

        // 3. Xử lý ảnh Poster (Chỉ update nếu Admin có chọn file mới)
        if (file != null && !file.isEmpty()) {
            try {
                String newPosterUrl = fileService.uploadPoster(file);
                existingMovie.setPosterUrl(newPosterUrl);
            } catch (Exception e) {
                throw new RuntimeException("Lỗi khi upload ảnh mới: " + e.getMessage());
            }
        }

        // 4. Xử lý Trailer (Nếu Frontend có gửi danh sách trailer mới)
        if (requestMovie.getTrailers() != null && !requestMovie.getTrailers().isEmpty()) {
            // Xóa danh sách trailer cũ
            existingMovie.getTrailers().clear();

            // Thêm trailer mới vào và trỏ ngược lại Movie hiện tại (Quan trọng để lưu khóa ngoại)
            for (Trailer trailer : requestMovie.getTrailers()) {
                trailer.setMovie(existingMovie);
                existingMovie.getTrailers().add(trailer);
            }
        }

        // 5. Lưu lại xuống Database
        movieRepository.save(existingMovie);
    }


}