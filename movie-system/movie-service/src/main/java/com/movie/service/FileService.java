package com.movie.service;

import org.springframework.web.multipart.MultipartFile;

public interface FileService {
    public String uploadPoster(MultipartFile file);
}
