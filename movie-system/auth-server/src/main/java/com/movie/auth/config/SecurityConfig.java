package com.movie.auth.config; // Đảm bảo đúng package của bạn

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. TẮT CSRF (CỰC KỲ QUAN TRỌNG: Không tắt sẽ luôn bị 403 khi gọi POST)
                .csrf(AbstractHttpConfigurer::disable)

                // 2. Tắt các cấu hình UI mặc định
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. Cấu hình phân quyền
                .authorizeHttpRequests(auth -> auth
                        // Thay vì ghi cụ thể login/register, dùng /** để bao trọn mọi đường dẫn của Auth
                        .requestMatchers("/api/auth/**").permitAll()

                        // Mở cửa cho tài liệu Swagger
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/api-docs/**",
                                "/api-docs.yaml"
                        ).permitAll()

                        // Mọi request ngoại lai khác (nếu có) sẽ bị chặn
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}