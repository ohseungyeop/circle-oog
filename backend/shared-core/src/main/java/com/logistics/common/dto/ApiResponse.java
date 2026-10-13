package com.logistics.common.dto;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

/** Immutable public envelope; field names remain part of the client contract. */
@Getter
public final class ApiResponse<T> {
    private final boolean success;
    private final int code;
    private final String message;
    private final T data;
    @Builder @JsonCreator
    public ApiResponse(@JsonProperty("success") boolean success,@JsonProperty("code") int code,
                       @JsonProperty("message") String message,@JsonProperty("data") T data) {
        if(code<100||code>599||success&&code!=200)throw new IllegalArgumentException("Invalid response envelope");
        this.success=success;this.code=code;this.message=message;this.data=data;
    }
    public static <T> ApiResponse<T> success(){return success(null);}
    public static <T> ApiResponse<T> success(T data){return success(data,"Success");}
    public static <T> ApiResponse<T> success(T data,String message){return new ApiResponse<>(true,200,message,data);}
    public static <T> ApiResponse<T> error(int code,String message){return new ApiResponse<>(false,code,message,null);}
}
