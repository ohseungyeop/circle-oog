package com.logistics.common.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;
import java.util.List;

@Getter
@NoArgsConstructor
public class PageResponse<T> {
    private List<T> content;          // 데이터 목록
    private long totalElements;       // 전체 건수
    private int totalPages;           // 전체 페이지 수
    private int size;                 // 페이지당 사이즈
    private int number;               // 현재 페이지 번호

    public PageResponse(Page<T> page) {
        this.content = page.getContent();
        this.totalElements = page.getTotalElements();
        this.totalPages = page.getTotalPages();
        this.size = page.getSize();
        this.number = page.getNumber();
    }


    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(page);
    }
}