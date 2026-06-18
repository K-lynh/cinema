package com.movie.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

public class ShowtimeDtos {
    @Data
    public static class ShowtimeCreateRequest {
        private Long movieId;
        private Long roomId;
        private LocalDate showDate;
        private LocalTime startTime;
        private double basePrice;
    }
}
