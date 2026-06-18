package com.movie.service;

import com.movie.dto.RoomDtos;
import com.movie.entity.Room;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RoomService {
    Room createRoom(RoomDtos.RoomCreateRequest request);
    public Room getById(Long id);
    public Page<Room> getAll(String name, Pageable pageable);
    public Room updateRoom(Long id, RoomDtos.RoomCreateRequest request);
    public void deleteRoom(Long id);
}
