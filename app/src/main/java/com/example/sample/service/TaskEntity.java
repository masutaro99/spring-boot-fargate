package com.example.sample.service;

import lombok.Getter;

@Getter
public class TaskEntity {
  String content;

  public TaskEntity(String content) {
    this.content = content;
  }
}
