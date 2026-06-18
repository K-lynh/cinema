package com.movie.auth.controller;

import com.movie.auth.component.JwtUtils;
import com.movie.auth.entity.User;
import com.movie.auth.entity.dto.LoginDto;
import com.movie.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        Optional<User> existingUser = userRepository.findByEmail(user.getEmail());
        if (existingUser.isPresent()) {
            return ResponseEntity.badRequest().body("Email đã tồn tại");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginDto loginDto) {
        Optional<User> userOpt = userRepository.findByEmail(loginDto.getEmail());

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body("Tài khoản không tồn tại");
        }

        User user = userOpt.get();

        if (passwordEncoder.matches(loginDto.getPassword(), user.getPassword())) {
            String token = jwtUtils.generateToken(user.getEmail());
            return ResponseEntity.ok(Map.of("token", token, "user", user));
        }
        return ResponseEntity.status(401).body("Sai mật khẩu");
    }
}