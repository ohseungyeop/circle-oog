package com.circle.oog.auth;

import com.fms.security.FmsPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final CoreAuthService auth;
    public AuthController(CoreAuthService auth){this.auth=auth;}
    public record LoginRequest(String tenantCode,String username,String password){}
    public record RefreshRequest(String refreshToken){}
    @PostMapping("/login") public CoreAuthService.TokenResponse login(@RequestBody LoginRequest request){return auth.login(request.tenantCode(),request.username(),request.password());}
    @PostMapping("/refresh") public CoreAuthService.TokenResponse refresh(@RequestBody RefreshRequest request){return auth.refresh(request.refreshToken());}
    @PostMapping("/logout") public Map<String,Boolean> logout(@AuthenticationPrincipal FmsPrincipal principal){auth.logout(principal);return Map.of("loggedOut",true);}
}
