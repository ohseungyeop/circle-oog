package com.circle.oog.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.dao.DataAccessException;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {
    private final CoreAuthService auth;
    public JwtFilter(CoreAuthService auth){this.auth=auth;}
    @Override protected boolean shouldNotFilter(HttpServletRequest request){return request.getServletPath().equals("/api/auth/login")||request.getServletPath().equals("/api/auth/refresh");}
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException {
        String header=request.getHeader("Authorization");
        if(header!=null) {
            SecurityContextHolder.clearContext();
            if(header.length()>8192||!header.startsWith("Bearer ")||header.length()<=7){unauthorized(response);return;}
            try {var principal=auth.authenticate(header.substring(7));SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));}
            catch(org.springframework.web.server.ResponseStatusException ex){SecurityContextHolder.clearContext();unauthorized(response);return;}
            catch(DataAccessException ex){SecurityContextHolder.clearContext();response.setStatus(503);response.setContentType("application/json;charset=UTF-8");response.getWriter().write("{\"message\":\"인증 서비스를 잠시 사용할 수 없습니다\"}");return;}
        }
        chain.doFilter(request,response);
    }
    private void unauthorized(HttpServletResponse response)throws IOException{response.setStatus(401);response.setContentType("application/json;charset=UTF-8");response.getWriter().write("{\"message\":\"인증 정보를 확인하거나 다시 로그인하세요\"}");}
}
