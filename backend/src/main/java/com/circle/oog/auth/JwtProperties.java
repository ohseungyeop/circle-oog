package com.circle.oog.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Adapted from Circle FMS auth JwtProperties; OOG has its own signing key. */
@Component
@ConfigurationProperties(prefix="jwt")
public class JwtProperties {
    private String secretKey;
    private long accessTokenExpireMs=1_800_000L;
    private long refreshTokenExpireMs=604_800_000L;
    public String getSecretKey(){return secretKey;}
    public void setSecretKey(String value){secretKey=value;}
    public long getAccessTokenExpireMs(){return accessTokenExpireMs;}
    public void setAccessTokenExpireMs(long value){accessTokenExpireMs=value;}
    public long getRefreshTokenExpireMs(){return refreshTokenExpireMs;}
    public void setRefreshTokenExpireMs(long value){refreshTokenExpireMs=value;}
}
