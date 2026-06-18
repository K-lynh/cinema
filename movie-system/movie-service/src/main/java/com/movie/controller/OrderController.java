package com.movie.controller;

import com.movie.dto.OrderDtos;
import com.movie.dto.OrderQRDto;
import com.movie.entity.Order;
import com.movie.entity.Ticket;
import com.movie.repository.OrderRepository;
import com.movie.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @GetMapping("/{id}")
    public ResponseEntity<Order> getById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getById(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<Order>> getByUser(@PathVariable Long userId, Pageable pageable) {
        return ResponseEntity.ok(orderService.getByUser(userId, pageable));
    }

    @PostMapping("/create")
    public ResponseEntity<String> create(@RequestBody OrderDtos.OrderCreateRequest request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        orderService.cancelOrder(id);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/showtime/{showtimeId}/booked-seats")
    public ResponseEntity<List<String>> getBookedSeats(@PathVariable Long showtimeId) {
        List<String> bookedSeats = orderService.getBookedSeats(showtimeId);
        return ResponseEntity.ok(bookedSeats);
    }

    @GetMapping("/code/{orderCode}")
    public ResponseEntity<OrderQRDto> getOrderByCode(@PathVariable String orderCode) {

        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new RuntimeException("Mã vé không hợp lệ hoặc không tồn tại!"));

        OrderQRDto orderQRDto = new OrderQRDto();

        orderQRDto.setUserId(order.getUserId());
        orderQRDto.setOrderCode(order.getOrderCode());
        orderQRDto.setTotalAmount(order.getTotalAmount());

        if (order.getShowtime() != null) {
            orderQRDto.setShowDate(order.getShowtime().getShowDate());
            orderQRDto.setStartTime(order.getShowtime().getStartTime());

            if (order.getShowtime().getRoom() != null) {
                orderQRDto.setRoomName(order.getShowtime().getRoom().getName());
            }
        }

        if (order.getTickets() != null && !order.getTickets().isEmpty()) {
            String seats = order.getTickets().stream()
                    .map(ticket -> ticket.getSeatNumber())
                    .collect(Collectors.joining(", "));
            orderQRDto.setSeatNumber(seats);
        } else {
            orderQRDto.setSeatNumber("");
        }

        orderQRDto.setUserName("Khách hàng ID: " + order.getUserId());

        return ResponseEntity.ok(orderQRDto);
    }
}