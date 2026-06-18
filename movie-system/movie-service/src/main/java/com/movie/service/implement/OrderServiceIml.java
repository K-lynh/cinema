package com.movie.service.implement;

import com.movie.dto.OrderDtos.*;
import com.movie.entity.*;
import com.movie.repository.*;
import com.movie.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceIml implements OrderService {
    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;
    private final ShowtimeRepository showtimeRepository;

    @Override
    @Transactional
    public String createOrder(OrderCreateRequest request) { // Đổi kiểu trả về thành String
        // 1. Lấy thông tin lịch chiếu
        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new RuntimeException("Lịch chiếu không tồn tại"));

        // 2. Kiểm tra ghế trùng
        List<Ticket> soldTickets = ticketRepository.findByShowtimeId(showtime.getId());
        List<String> soldSeatNumbers = soldTickets.stream()
                .map(Ticket::getSeatNumber)
                .toList();

        for (String requestedSeat : request.getSeatNumbers()) {
            if (soldSeatNumbers.contains(requestedSeat)) {
                throw new RuntimeException("Ghế " + requestedSeat + " đã có người đặt!");
            }
        }

        // 3. Tạo Order tổng và sinh Order Code
        Order order = new Order();
        order.setUserId(request.getUserId());
        order.setShowtime(showtime);
        order.setStatus("PAID");

        // Tạo mã đơn hàng ngẫu nhiên (VD: 8 ký tự viết hoa)
        String uniqueOrderCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        order.setOrderCode(uniqueOrderCode); // Lưu mã này vào DB

        double totalAmount = showtime.getBasePrice() * request.getSeatNumbers().size();
        order.setTotalAmount(totalAmount);

        Order savedOrder = orderRepository.save(order);

        // 4. Tạo từng Ticket
        List<Ticket> newTickets = request.getSeatNumbers().stream().map(seatNum -> {
            Ticket ticket = new Ticket();
            ticket.setOrder(savedOrder);
            ticket.setShowtime(showtime);
            ticket.setSeatNumber(seatNum);
            ticket.setPrice(showtime.getBasePrice());
            return ticket;
        }).collect(Collectors.toList());

        ticketRepository.saveAll(newTickets);

        // Trả về mã đơn hàng cho Frontend
        return savedOrder.getOrderCode();
    }
    @Override
    public void cancelOrder(Long id) {
        Order order = getById(id);
        order.setStatus("CANCELLED");
        orderRepository.save(order);
    }

    @Override
    public Page<Order> getByUser(Long userId, Pageable pageable) {
        return orderRepository.findByUserId(userId, pageable);
    }

    @Override
    public Order getById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng id: " + id));
    }

    @Override
    public List<String> getBookedSeats(Long showtimeId) {
        return orderRepository.findBookedSeatsByShowtimeId(showtimeId);
    }
}
