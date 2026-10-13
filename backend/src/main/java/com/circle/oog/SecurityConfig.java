package com.circle.oog;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.circle.oog.auth.JwtFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import java.util.List;

@Configuration
class SecurityConfig {
    @Bean PasswordEncoder passwords(){return new BCryptPasswordEncoder();}
    @Bean FilterRegistrationBean<JwtFilter> jwtRegistration(JwtFilter filter){var bean=new FilterRegistrationBean<>(filter);bean.setEnabled(false);return bean;}
    @Bean SecurityFilterChain security(HttpSecurity http,JwtFilter jwt) throws Exception {
        return http.cors(cors -> cors.configurationSource(request -> {
            var c = new CorsConfiguration();
            c.setAllowedOrigins(List.of("http://localhost:5175", "http://127.0.0.1:5175"));
            c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
            c.setAllowedHeaders(List.of("Authorization", "Content-Type")); return c;
        })).csrf(csrf -> csrf.disable())
          .sessionManagement(s -> s.sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
          .authorizeHttpRequests(a -> a.requestMatchers("/api/auth/login","/api/auth/refresh").permitAll().requestMatchers("/api/**").authenticated().anyRequest().permitAll())
          .exceptionHandling(e -> e.authenticationEntryPoint((request,response,error)->{response.setStatus(401);response.setContentType("application/json;charset=UTF-8");response.getWriter().write("{\"message\":\"로그인이 필요합니다\"}");})
            .accessDeniedHandler((request,response,error)->{response.setStatus(403);response.setContentType("application/json;charset=UTF-8");response.getWriter().write("{\"message\":\"접근 권한이 없습니다\"}");}))
          .addFilterBefore(jwt,UsernamePasswordAuthenticationFilter.class).build();
    }
}
