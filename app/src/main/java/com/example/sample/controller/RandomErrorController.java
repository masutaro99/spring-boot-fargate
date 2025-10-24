package com.example.sample.controller;

import java.util.concurrent.ThreadLocalRandom;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RandomErrorController {

  @GetMapping("/random-error")
  public ResponseEntity<String> randomError() {
    boolean isError = ThreadLocalRandom.current().nextBoolean();
    if (isError) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal Server Error");
    }
    return ResponseEntity.ok("OK");
  }
}

