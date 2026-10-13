package com.circle.oog;

import com.logistics.common.dto.ApiResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.*;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice(basePackages="com.circle.oog")
class ResponseEnvelope implements ResponseBodyAdvice<Object> {
    public boolean supports(MethodParameter p,Class<? extends HttpMessageConverter<?>> converter) {return true;}
    public Object beforeBodyWrite(Object body,MethodParameter p,MediaType type,
        Class<? extends HttpMessageConverter<?>> converter,ServerHttpRequest request,ServerHttpResponse response) {
        if(body instanceof byte[] || body instanceof ApiResponse<?>) return body;
        if(p.getContainingClass()==ApiErrors.class) return body;
        return ApiResponse.success(body);
    }
}
