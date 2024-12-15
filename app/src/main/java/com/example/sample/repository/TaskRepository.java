package com.example.sample.repository;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface TaskRepository {
  @Select("SELECT content FROM tasks WHERE id = 1")
  public TaskRecord select();
}
