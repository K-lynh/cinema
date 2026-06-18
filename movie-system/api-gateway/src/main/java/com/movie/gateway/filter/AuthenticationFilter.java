package com.movie.gateway.filter; // Tên package của bạn

import com.movie.gateway.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    @Autowired
    private JwtUtil jwtUtil;

    public AuthenticationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return ((exchange, chain) -> {

            // 1. Nếu request gửi tới các route cần Auth (kiểm tra ở yml)
            if (!exchange.getRequest().getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                return onError(exchange.getResponse(), "Missing authorization header", HttpStatus.UNAUTHORIZED);
            }

            // 2. Lấy chuỗi Token từ Header
            String authHeader = exchange.getRequest().getHeaders().get(HttpHeaders.AUTHORIZATION).get(0);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                authHeader = authHeader.substring(7);
            }

            // 3. Kiểm tra tính hợp lệ của Token
            try {
                jwtUtil.validateToken(authHeader);
            } catch (Exception e) {
                // THÊM DÒNG NÀY ĐỂ XEM LỖI THỰC SỰ LÀ GÌ
                System.out.println("LỖI GIẢI MÃ TOKEN TẠI GATEWAY: " + e.getMessage());

                return onError(exchange.getResponse(), "Invalid or expired token", HttpStatus.UNAUTHORIZED);
            }

            // Nếu hợp lệ, cho phép đi tiếp
            return chain.filter(exchange);
        });
    }

    private Mono<Void> onError(ServerHttpResponse response, String err, HttpStatus httpStatus) {
        response.setStatusCode(httpStatus);
        // Có thể custom thêm message trả về dạng JSON ở đây
        return response.setComplete();
    }

    public static class Config {
        // Cấu hình thêm nếu cần
    }
}