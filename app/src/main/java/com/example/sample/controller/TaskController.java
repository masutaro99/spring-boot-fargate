package com.example.sample.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import com.example.sample.service.TaskService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class TaskController {
  private final TaskService service;

  @GetMapping("/task")
  public String getTask() {
    return service.find().getContent();
  } 
}
