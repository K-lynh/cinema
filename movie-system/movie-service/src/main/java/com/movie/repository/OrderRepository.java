package com.movie.repository;

import com.movie.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findByUserId(Long userId, Pageable pageable);

    @Query("SELECT t.seatNumber FROM Ticket t WHERE t.showtime.id = :showtimeId")
    List<String> findBookedSeatsByShowtimeId(@Param("showtimeId") Long showtimeId);

    @Query(value = "SELECT * FROM orders o WHERE o.order_code = :orderCode", nativeQuery = true)
    Optional<Order> findByOrderCode(@Param("orderCode") String orderCode);
}