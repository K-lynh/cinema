package com.movie.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Lưu ID của người dùng (Giả sử bạn dùng Microservices, ID này lấy từ user-service)
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Sửa OrderCode thành orderCode
    @Column(name = "order_code", nullable = false)
    private String orderCode;

    // Quan hệ nhiều - 1 với Lịch chiếu
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false)
    @JsonIgnore // Tránh vòng lặp vô hạn khi parse JSON
    private Showtime showtime;

    @Column(name = "total_amount", nullable = false)
    private double totalAmount;

    @Column(name = "status", nullable = false)
    private String status = "PENDING"; // Trạng thái mặc định: PENDING (Chờ thanh toán), PAID (Đã thanh toán)

    // Quan hệ 1 - Nhiều với Ticket (Một đơn hàng có nhiều vé)
    // CascadeType.ALL giúp khi lưu Order sẽ tự động lưu luôn danh sách Ticket
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Ticket> tickets = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Tự động lấy giờ hệ thống khi tạo mới đơn hàng
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Hàm tiện ích để thêm vé vào đơn hàng (đảm bảo đồng bộ 2 chiều)
    public void addTicket(Ticket ticket) {
        tickets.add(ticket);
        ticket.setOrder(this);
    }
}