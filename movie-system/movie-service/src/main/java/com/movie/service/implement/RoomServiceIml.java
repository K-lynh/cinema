package com.movie.service.implement;

import com.movie.dto.RoomDtos.*;
import com.movie.entity.Room;
import com.movie.repository.RoomRepository;
import com.movie.service.RoomService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RoomServiceIml implements RoomService {
    private final RoomRepository roomRepository;

    @Override
    public Room getById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng chiếu id: " + id));
    }

    @Override
    public Page<Room> getAll(String name, Pageable pageable) {
        if (name != null && !name.isEmpty()) {
            return roomRepository.findByNameContaining(name, pageable);
        }
        return roomRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public Room createRoom(RoomCreateRequest request) {
        Room room = new Room();
        room.setName(request.getName());
        room.setCapacity(request.getCapacity());
        return roomRepository.save(room);
    }

    @Override
    @Transactional
    public Room updateRoom(Long id, RoomCreateRequest request) {
        Room room = getById(id);
        room.setName(request.getName());
        room.setCapacity(request.getCapacity());
        return roomRepository.save(room);
    }

    @Override
    @Transactional
    public void deleteRoom(Long id) {
        Room room = getById(id);
        roomRepository.delete(room);
    }
}