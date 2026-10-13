package com.circle.oog.auth;

import com.fms.security.FmsPrincipal;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Service
public class CoreAuthService {
    private final JdbcTemplate jdbc;private final JwtProvider jwt;private final PasswordEncoder passwords;
    private final TransactionTemplate tx;private final String dummy;
    private static final String ACCOUNT="select u.*,t.status as tenant_status,r.status as role_status,r.role_code,r.priority from core_user_account u join core_tenant t on t.tenant_id=u.tenant_id join core_role r on r.role_id=u.role_id and r.tenant_id=u.tenant_id ";
    public CoreAuthService(JdbcTemplate jdbc,JwtProvider jwt,PasswordEncoder passwords,PlatformTransactionManager manager){this.jdbc=jdbc;this.jwt=jwt;this.passwords=passwords;tx=new TransactionTemplate(manager);dummy=passwords.encode(UUID.randomUUID().toString());}
    public record UserInfo(String username,Long userId,Long tenantId,String roleCode) {}
    public record TokenResponse(String accessToken,String refreshToken,UserInfo user,long expiresIn) {}

    public TokenResponse login(String tenantCode,String username,String password) {
        if(username==null||password==null||username.isBlank()||username.length()>120||password.length()>1024)throw unauthorized();
        String tenant=tenantCode==null||tenantCode.isBlank()?"OOG":tenantCode;
        if(tenant.length()>20)throw unauthorized();
        TokenResponse result=tx.execute(status -> {
            var rows=jdbc.queryForList(ACCOUNT+"where t.tenant_code=? and u.username=? for update of u",tenant,username);
            Map<String,Object> user=rows.isEmpty()?null:rows.getFirst();Instant now=Instant.now();
            boolean matches=passwords.matches(password,user==null?dummy:String.valueOf(user.get("password_hash")));
            Timestamp lock=user==null?null:(Timestamp)user.get("locked_until");
            boolean locked=lock!=null&&lock.toInstant().isAfter(now);
            if(user==null||!active(user)||locked||!matches) {
                if(user!=null&&!locked&&active(user)) {
                    int failures=lock!=null&&!lock.toInstant().isAfter(now)?1:((Number)user.get("failed_attempts")).intValue()+1;
                    jdbc.update("update core_user_account set failed_attempts=?,locked_until=?,version=version+1 where user_id=?",failures,failures>=5?Timestamp.from(now.plusSeconds(900)):null,user.get("user_id"));
                }
                history(user,username,locked?"LOCKED":"FAILURE");return null;
            }
            jdbc.update("update core_user_account set failed_attempts=0,locked_until=null,version=version+1 where user_id=?",user.get("user_id"));
            history(user,username,"SUCCESS");return issue(user);
        });
        if(result==null)throw unauthorized();return result;
    }
    public TokenResponse refresh(String token) {
        Claims claims=claims(token,"REFRESH");Long userId=subject(claims);
        TokenResponse result=tx.execute(status -> {
            // Account first, then session: same lock order as logout and concurrent rotations.
            var accounts=jdbc.queryForList(ACCOUNT+"where u.user_id=? for update of u",userId);
            if(accounts.isEmpty()||!active(accounts.getFirst()))return null;
            var user=accounts.getFirst();
            var sessions=jdbc.queryForList("select session_id,token_version from core_session where user_id=? and refresh_hash=? and revoked_at is null and expires_at>now() for update",userId,hash(token));
            if(sessions.isEmpty()||number(user,"token_version")!=number(sessions.getFirst(),"token_version"))return null;
            jdbc.update("update core_session set revoked_at=now() where session_id=?",sessions.getFirst().get("session_id"));
            history(user,String.valueOf(user.get("username")),"REFRESH");
            return issue(user);
        });
        if(result==null)throw unauthorized();return result;
    }
    public FmsPrincipal authenticate(String token) {
        Claims claims=claims(token,"ACCESS");Long userId=subject(claims);UUID jti;
        try {jti=UUID.fromString(claims.getId());}catch(Exception ex){throw unauthorized();}
        var rows=jdbc.queryForList(ACCOUNT+"join core_session s on s.user_id=u.user_id and s.tenant_id=u.tenant_id where u.user_id=? and s.access_jti=? and s.revoked_at is null and s.expires_at>now() and s.token_version=u.token_version",userId,jti);
        if(rows.isEmpty())throw unauthorized();var user=rows.getFirst();
        Number tenant=claims.get("tenantId",Number.class),version=claims.get("tokenVersion",Number.class);
        if(!active(user)||tenant==null||version==null||tenant.longValue()!=number(user,"tenant_id")||version.longValue()!=number(user,"token_version"))throw unauthorized();
        return new FmsPrincipal(String.valueOf(user.get("username")),userId,number(user,"tenant_id"),number(user,"role_id"),((Number)user.get("priority")).intValue(),String.valueOf(user.get("role_code")),List.of(),null);
    }
    public void logout(FmsPrincipal principal) {
        tx.executeWithoutResult(status -> {
            jdbc.queryForList("select user_id from core_user_account where user_id=? and tenant_id=? for update",principal.getUserId(),principal.getTenantId());
            jdbc.update("update core_user_account set token_version=token_version+1,version=version+1 where user_id=? and tenant_id=?",principal.getUserId(),principal.getTenantId());
            jdbc.update("update core_session set revoked_at=now() where user_id=? and tenant_id=? and revoked_at is null",principal.getUserId(),principal.getTenantId());
            jdbc.update("insert into core_login_history(tenant_id,user_id,username,status) values(?,?,?,?)",principal.getTenantId(),principal.getUserId(),principal.getName(),"LOGOUT");
        });
    }
    private TokenResponse issue(Map<String,Object> user) {
        Long id=number(user,"user_id"),tenant=number(user,"tenant_id"),version=number(user,"token_version");UUID jti=UUID.randomUUID();
        String access=jwt.generateAccessToken(id,tenant,version,jti),refresh=jwt.generateRefreshToken(id);
        jdbc.update("insert into core_session(session_id,user_id,tenant_id,access_jti,refresh_hash,expires_at,token_version) values(?,?,?,?,?,?,?)",UUID.randomUUID(),id,tenant,jti,hash(refresh),Timestamp.from(Instant.now().plusMillis(jwt.getRefreshTokenExpireMs())),version);
        return new TokenResponse(access,refresh,new UserInfo(String.valueOf(user.get("username")),id,tenant,String.valueOf(user.get("role_code"))),jwt.getAccessTokenExpireMs()/1000);
    }
    private void history(Map<String,Object> user,String username,String status){jdbc.update("insert into core_login_history(tenant_id,user_id,username,status) values(?,?,?,?)",user==null?null:user.get("tenant_id"),user==null?null:user.get("user_id"),username,status);}
    private boolean active(Map<String,Object> user){return "ACTIVE".equals(user.get("status"))&&"ACTIVE".equals(user.get("tenant_status"))&&"ACTIVE".equals(user.get("role_status"));}
    private static long number(Map<String,Object> row,String key){return ((Number)row.get(key)).longValue();}
    private Claims claims(String token,String use){try{var claims=jwt.getClaims(token);if(!use.equals(claims.get("tokenUse",String.class)))throw unauthorized();return claims;}catch(Exception ex){throw unauthorized();}}
    private Long subject(Claims claims){try{long id=Long.parseLong(claims.getSubject());if(id<=0)throw unauthorized();return id;}catch(Exception ex){throw unauthorized();}}
    static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception ex){throw new IllegalStateException("SHA-256 unavailable",ex);}}
    static ResponseStatusException unauthorized(){return new ResponseStatusException(HttpStatus.UNAUTHORIZED,"인증 정보를 확인하거나 다시 로그인하세요");}
}
