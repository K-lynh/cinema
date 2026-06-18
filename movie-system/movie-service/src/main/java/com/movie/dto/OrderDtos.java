package com.movie.dto;

import lombok.Data;
import java.util.List;

public class OrderDtos {
    @Data
    public static class OrderCreateRequest {
        private Long userId;
        private Long showtimeId;
        private List<String> seatNumbers;
    }
}