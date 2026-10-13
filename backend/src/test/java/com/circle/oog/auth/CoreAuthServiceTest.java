package com.circle.oog.auth;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.web.server.ResponseStatusException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CoreAuthServiceTest {
    private JwtProvider jwt(){var p=new JwtProperties();p.setSecretKey("independent-test-oog-key-at-least-32-bytes");return new JwtProvider(p);}
    private Map<String,Object> account(){var row=new HashMap<String,Object>();row.putAll(Map.of("user_id",1L,"tenant_id",1L,"role_id",1L,"username","admin","role_code","ADMIN","priority",1,"status","ACTIVE","tenant_status","ACTIVE","role_status","ACTIVE","token_version",0L));row.put("password_hash","bcrypt-test");row.put("failed_attempts",4);return row;}
    @Test void fifthFailedLoginCommitsLockAndHistoryBefore401() {
        var jdbc=mock(JdbcTemplate.class);var encoder=mock(PasswordEncoder.class);var manager=mock(PlatformTransactionManager.class);var transaction=new SimpleTransactionStatus();when(manager.getTransaction(any())).thenReturn(transaction);
        when(jdbc.queryForList(anyString(),eq("OOG"),eq("admin"))).thenReturn(List.of(account()));when(encoder.matches("wrong","bcrypt-test")).thenReturn(false);
        var service=new CoreAuthService(jdbc,jwt(),encoder,manager);
        assertThrows(ResponseStatusException.class,()->service.login(null,"admin","wrong"));
        verify(jdbc).update(contains("failed_attempts=?"),eq(5),any(Timestamp.class),eq(1L));
        verify(jdbc).update(contains("core_login_history"),eq(1L),eq(1L),eq("admin"),eq("FAILURE"));
        verify(manager).commit(transaction);verify(manager,never()).rollback(any());
    }
    @Test void activeLockRejectsEvenCorrectPasswordWithoutReset() {
        var jdbc=mock(JdbcTemplate.class);var encoder=mock(PasswordEncoder.class);var manager=mock(PlatformTransactionManager.class);when(manager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());var user=account();user.put("locked_until",Timestamp.from(Instant.now().plusSeconds(900)));
        when(jdbc.queryForList(anyString(),eq("OOG"),eq("admin"))).thenReturn(List.of(user));when(encoder.matches("correct","bcrypt-test")).thenReturn(true);
        assertThrows(ResponseStatusException.class,()->new CoreAuthService(jdbc,jwt(),encoder,manager).login("OOG","admin","correct"));
        verify(jdbc).update(contains("core_login_history"),eq(1L),eq(1L),eq("admin"),eq("LOCKED"));
        verify(jdbc,never()).update(contains("failed_attempts=?"),any(),any(),any());
    }
    @Test void accessAndRefreshUsesAreNotInterchangeable() {
        var jdbc=mock(JdbcTemplate.class);var provider=jwt();var service=new CoreAuthService(jdbc,provider,mock(PasswordEncoder.class),mock(PlatformTransactionManager.class));
        assertThrows(ResponseStatusException.class,()->service.authenticate(provider.generateRefreshToken(1L)));
        assertThrows(ResponseStatusException.class,()->service.refresh(provider.generateAccessToken(1L,1L,0L,UUID.randomUUID())));
        verifyNoInteractions(jdbc);
    }
    @Test void issuerAndSessionJtiArePreservedAndRefreshHashHasNoToken() {
        var provider=jwt();UUID id=UUID.randomUUID();var token=provider.generateAccessToken(5L,9L,2L,id);var claims=provider.getClaims(token);
        assertEquals("circle-oog",claims.getIssuer());assertEquals(id.toString(),claims.getId());assertEquals("ACCESS",claims.get("tokenUse"));assertEquals(2,((Number)claims.get("tokenVersion")).intValue());
        var refresh=provider.generateRefreshToken(5L);assertTrue(CoreAuthService.hash(refresh).matches("[0-9a-f]{64}"));assertNotEquals(refresh,CoreAuthService.hash(refresh));
    }
    @Test void shortIndependentSecretRejected(){var p=new JwtProperties();p.setSecretKey("short");assertThrows(IllegalStateException.class,()->new JwtProvider(p));}
    @Test void signedButRevokedAccessDoesNotAuthenticate() {
        var jdbc=mock(JdbcTemplate.class);var provider=jwt();UUID jti=UUID.randomUUID();when(jdbc.queryForList(anyString(),eq(1L),eq(jti))).thenReturn(List.of());
        var service=new CoreAuthService(jdbc,provider,mock(PasswordEncoder.class),mock(PlatformTransactionManager.class));
        assertThrows(ResponseStatusException.class,()->service.authenticate(provider.generateAccessToken(1L,1L,0L,jti)));
        verify(jdbc).queryForList(contains("s.revoked_at is null"),eq(1L),eq(jti));
    }
}
