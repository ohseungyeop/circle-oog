package com.circle.oog;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Map;

@RestControllerAdvice
class ApiErrors {
    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
    ResponseEntity<?> stale(org.springframework.dao.OptimisticLockingFailureException e) {return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message","다른 사용자가 데이터를 변경했습니다. 다시 조회하세요"));}
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) {return ResponseEntity.badRequest().body(Map.of("message","필수값과 치수·중량을 확인하세요"));}
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> duplicate(DataIntegrityViolationException e) {return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message","중복 항목 또는 데이터 제약 오류입니다"));}
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    ResponseEntity<?> status(org.springframework.web.server.ResponseStatusException e) {return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",java.util.Objects.requireNonNullElse(e.getReason(),"요청을 확인하세요")));}
    @ExceptionHandler(org.apache.poi.openxml4j.exceptions.InvalidFormatException.class)
    ResponseEntity<?> file(Exception e) {return ResponseEntity.badRequest().body(Map.of("message","올바른 Excel 파일이 아닙니다"));}
}
