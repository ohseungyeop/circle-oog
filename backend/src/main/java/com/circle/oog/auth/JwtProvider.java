package com.circle.oog.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

/** Circle FMS JwtProvider adapted for OOG issuer and persisted session identity. */
@Component
public class JwtProvider {
    public static final String ISSUER="circle-oog";
    private final SecretKey key;
    private final long accessLifetime,refreshLifetime;
    public JwtProvider(JwtProperties properties) {
        String secret=properties.getSecretKey();
        if(secret==null||secret.getBytes(StandardCharsets.UTF_8).length<32)throw new IllegalStateException("JWT_SECRET_KEY must contain at least 32 UTF-8 bytes.");
        accessLifetime=properties.getAccessTokenExpireMs();refreshLifetime=properties.getRefreshTokenExpireMs();
        if(accessLifetime<=0||refreshLifetime<=0)throw new IllegalStateException("Token lifetimes must be positive.");
        key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    public String generateAccessToken(Long user,Long tenant,Long version,UUID jti) {
        if(user==null||user<=0||tenant==null||tenant<=0||version==null||version<0)throw new IllegalArgumentException("Account identity and authentication version are required.");
        Instant now=Instant.now();
        return Jwts.builder().issuer(ISSUER).subject(user.toString()).id(jti.toString()).claim("tokenUse","ACCESS")
            .claim("tenantId",tenant).claim("tokenVersion",version).issuedAt(Date.from(now)).expiration(Date.from(now.plusMillis(accessLifetime))).signWith(key).compact();
    }
    public String generateRefreshToken(Long user) {
        if(user==null||user<=0)throw new IllegalArgumentException("Account identity is required.");
        Instant now=Instant.now();
        return Jwts.builder().issuer(ISSUER).subject(user.toString()).id(UUID.randomUUID().toString()).claim("tokenUse","REFRESH")
            .issuedAt(Date.from(now)).expiration(Date.from(now.plusMillis(refreshLifetime))).signWith(key).compact();
    }
    public Claims getClaims(String token){return Jwts.parser().verifyWith(key).requireIssuer(ISSUER).build().parseSignedClaims(token).getPayload();}
    public long getAccessTokenExpireMs(){return accessLifetime;}
    public long getRefreshTokenExpireMs(){return refreshLifetime;}
}
