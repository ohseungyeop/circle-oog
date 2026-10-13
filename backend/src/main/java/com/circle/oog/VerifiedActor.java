package com.circle.oog;

import com.fms.security.FmsPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class VerifiedActor {
    private VerifiedActor() {}
    static FmsPrincipal current() {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication==null||!authentication.isAuthenticated()||!(authentication.getPrincipal() instanceof FmsPrincipal principal))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"인증이 필요합니다");
        return principal;
    }
    static long tenantId() {return current().getTenantId();}
}
