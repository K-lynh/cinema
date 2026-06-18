package com.movie.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

public class RoomDtos {
    @Data
    public static class RoomCreateRequest {
        @NotBlank(message = "Tên phòng không được để trống")
        private String name;

        private Integer capacity;
    }
}