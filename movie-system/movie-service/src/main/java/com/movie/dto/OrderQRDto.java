package com.movie.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderQRDto {

    private Long userId;

    private String orderCode;

    private double totalAmount;

    private String seatNumber;

    private String userName;

    private LocalDate showDate;

    private LocalTime startTime;

    private String roomName;

}
