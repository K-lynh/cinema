package com.movie.auth.config; // Đổi lại theo đúng tên package của bạn

import com.movie.auth.component.JwtUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            // 1. Lấy token từ header của request
            String jwt = getJwtFromRequest(request);

            // 2. Kiểm tra xem token có hợp lệ không
            if (StringUtils.hasText(jwt) && jwtUtils.validateToken(jwt)) {
                // 3. Lấy email (hoặc username) từ token
                String email = jwtUtils.getEmailFromToken(jwt);

                // 4. Tạo đối tượng Authentication (xác thực)
                // Lưu ý: Ở đây ta gán tạm danh sách quyền (authorities) là rỗng (Collections.emptyList())
                // Nếu sau này bạn có phân quyền ROLE_ADMIN, ROLE_USER thì sẽ thêm vào đây.
                UserDetails userDetails = new User(email, "", Collections.emptyList());

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());

                // 5. Lưu thông tin thêm về request hiện tại (IP, session...)
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // 6. Ghi nhận người dùng này đã đăng nhập thành công vào SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            logger.error("Không thể thiết lập xác thực người dùng trong context bảo mật", ex);
        }

        // Cho phép request tiếp tục đi tới các filter khác hoặc tới Controller
        filterChain.doFilter(request, response);
    }

    // Hàm hỗ trợ trích xuất JWT từ chuỗi "Bearer <token>" trong Header
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // Cắt bỏ chữ "Bearer " (7 ký tự) để lấy phần token
        }
        return null;
    }
}