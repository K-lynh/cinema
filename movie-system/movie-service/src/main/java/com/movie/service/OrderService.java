package com.movie.service;

import com.movie.dto.OrderDtos;
import com.movie.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface OrderService {
    String createOrder(OrderDtos.OrderCreateRequest request);
    void cancelOrder(Long id);
    public Page<Order> getByUser(Long userId, Pageable pageable);
    Order getById(Long id);

    List<String> getBookedSeats(Long showtimeId);
}
