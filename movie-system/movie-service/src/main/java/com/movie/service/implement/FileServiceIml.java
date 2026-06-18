package com.movie.service;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileServiceIml implements FileService {

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${minio.url}")
    private String minioUrl;

    // ─── 1. HÀM CHẠY TỰ ĐỘNG LÚC KHỞI ĐỘNG (Bắt buộc không có tham số) ───
    @PostConstruct
    public void makeBucketPublic() {
        try {
            // Chuỗi cấu hình để mở cửa cho mọi người xem ảnh (Read-Only)
            String policyJson = """
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": "*",
                      "Action": "s3:GetObject",
                      "Resource": "arn:aws:s3:::%s/*"
                    }
                  ]
                }
                """.formatted(bucket);

            minioClient.setBucketPolicy(
                    SetBucketPolicyArgs.builder()
                            .bucket(bucket)
                            .config(policyJson)
                            .build()
            );
            log.info("✅ Đã tự động cấu hình quyền PUBLIC cho bucket: {}", bucket);
        } catch (Exception e) {
            log.error("⚠️ Cảnh báo: Không thể tự động set quyền Public - {}", e.getMessage());
        }
    }

    // ─── 2. HÀM XỬ LÝ UPLOAD ẢNH TỪ CONTROLLER GỌI XUỐNG ───
    @Override
    public String uploadPoster(MultipartFile file) {
        try {
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(fileName)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            // Trả về Full URL để FE có thể gắn thẳng vào thẻ <img>
            return minioUrl + "/" + bucket + "/" + fileName;

        } catch (Exception e) {
            throw new RuntimeException("Lỗi upload file lên MinIO: " + e.getMessage());
        }
    }
}