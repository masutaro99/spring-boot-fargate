package com.example.sample.service;

import com.example.sample.repository.TaskRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TaskService {
  private final TaskRepository repository;
  
  public TaskEntity find() {
    var record = repository.select();
    return new TaskEntity(record.getContent());
  }
}
