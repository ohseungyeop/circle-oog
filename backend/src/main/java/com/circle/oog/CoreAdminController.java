package com.circle.oog;

import com.fms.security.FmsPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.util.*;

@RestController @RequestMapping("/api/core")
public class CoreAdminController {
    private final JdbcTemplate jdbc;private final CoreBootstrap bootstrap;
    public CoreAdminController(JdbcTemplate jdbc,CoreBootstrap bootstrap){this.jdbc=jdbc;this.bootstrap=bootstrap;}
    public record TenantInput(@NotBlank @Pattern(regexp="[A-Z0-9_-]{1,20}") String tenantCode,@NotBlank @Size(max=160) String tenantName){}
    public record UserInput(@NotBlank @Size(max=120) String username,@NotBlank @Size(min=12,max=72) String password,@Positive long roleId){}
    public record UserUpdate(@Pattern(regexp="ACTIVE|INACTIVE|LOCKED") String status,@Positive Long roleId,@NotNull @PositiveOrZero Long version){}
    public record MenuPermissions(boolean canView,boolean canCreate,boolean canEdit,boolean canDelete,boolean canExport){}
    private FmsPrincipal identity(Principal p){Object source=p;if(p instanceof org.springframework.security.core.Authentication auth){if(!auth.isAuthenticated())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);source=auth.getPrincipal();}if(!(source instanceof FmsPrincipal f))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);return f;}
    private FmsPrincipal admin(Principal p){var f=identity(p);if(!Set.of("ADMIN","SUPER_ADMIN").contains(f.getRoleCode()))throw new ResponseStatusException(HttpStatus.FORBIDDEN);return f;}
    private FmsPrincipal platform(Principal p){var f=admin(p);if(f.getTenantId()!=1||!f.getRoleCode().equals("SUPER_ADMIN"))throw new ResponseStatusException(HttpStatus.FORBIDDEN);return f;}
    private void role(long tenant,long role){var found=jdbc.queryForList("SELECT role_code FROM core_role WHERE tenant_id=? AND role_id=? AND status='ACTIVE'",String.class,tenant,role);if(found.isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"현재 회사의 활성 역할을 선택하세요");}
    @GetMapping("/tenants") public Object tenants(Principal p){platform(p);return jdbc.queryForList("SELECT tenant_id,tenant_code,tenant_name,status,version FROM core_tenant ORDER BY tenant_id");}
    @PostMapping("/tenants") @Transactional public Object tenant(@Valid @RequestBody TenantInput input,Principal p){var f=platform(p);
        Long id=jdbc.queryForObject("INSERT INTO core_tenant(tenant_code,tenant_name) VALUES(?,?) RETURNING tenant_id",Long.class,input.tenantCode(),input.tenantName().trim());bootstrap.seedTenant(id);audit(f,"TENANT_CREATED",id);return Map.of("tenantId",id);}
    @GetMapping("/users") public Object users(Principal p){var f=admin(p);return jdbc.queryForList("SELECT user_id,tenant_id,role_id,username,status,token_version,failed_attempts,locked_until,version FROM core_user_account WHERE tenant_id=? ORDER BY user_id",f.getTenantId());}
    @PostMapping("/users") @Transactional public Object user(@Valid @RequestBody UserInput input,Principal p){var f=admin(p);role(f.getTenantId(),input.roleId());
        String roleCode=jdbc.queryForObject("SELECT role_code FROM core_role WHERE tenant_id=? AND role_id=?",String.class,f.getTenantId(),input.roleId());if(roleCode.equals("SUPER_ADMIN"))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"플랫폼 관리자는 추가할 수 없습니다");
        if(input.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"비밀번호는 UTF-8 72바이트 이하여야 합니다");
        Long id=jdbc.queryForObject("INSERT INTO core_user_account(tenant_id,role_id,username,password_hash) VALUES(?,?,?,?) RETURNING user_id",Long.class,f.getTenantId(),input.roleId(),input.username().trim(),new BCryptPasswordEncoder().encode(input.password()));audit(f,"USER_CREATED",id);return Map.of("userId",id);}
    @PatchMapping("/users/{id}") @Transactional public Object update(@PathVariable long id,@Valid @RequestBody UserUpdate input,Principal p){var f=admin(p);
        var rows=jdbc.queryForList("SELECT u.status,u.role_id,u.version,r.role_code FROM core_user_account u JOIN core_role r ON r.tenant_id=u.tenant_id AND r.role_id=u.role_id WHERE u.tenant_id=? AND u.user_id=? FOR UPDATE OF u",f.getTenantId(),id);
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);var old=rows.getFirst();
        if(((Number)old.get("version")).longValue()!=input.version())throw new ResponseStatusException(HttpStatus.CONFLICT,"다른 사용자가 계정을 변경했습니다");
        if(old.get("role_code").equals("SUPER_ADMIN")||id==f.getUserId())throw new ResponseStatusException(HttpStatus.FORBIDDEN,"플랫폼 관리자와 본인 계정은 변경할 수 없습니다");
        long role=input.roleId()==null?((Number)old.get("role_id")).longValue():input.roleId();role(f.getTenantId(),role);
        if(jdbc.queryForObject("SELECT role_code FROM core_role WHERE tenant_id=? AND role_id=?",String.class,f.getTenantId(),role).equals("SUPER_ADMIN"))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        String status=input.status()==null?old.get("status").toString():input.status();
        jdbc.update("UPDATE core_user_account SET status=?,role_id=?,version=version+1,token_version=token_version+1,failed_attempts=0,locked_until=NULL WHERE tenant_id=? AND user_id=?",status,role,f.getTenantId(),id);
        jdbc.update("UPDATE core_session SET revoked_at=GREATEST(now(),created_at) WHERE tenant_id=? AND user_id=? AND revoked_at IS NULL",f.getTenantId(),id);audit(f,"USER_UPDATED",id);return Map.of("userId",id,"version",input.version()+1);}
    @GetMapping("/roles") public Object roles(Principal p){var f=identity(p);return jdbc.queryForList("SELECT role_id,tenant_id,role_code,role_name,status,priority FROM core_role WHERE tenant_id=? ORDER BY priority,role_id",f.getTenantId());}
    @GetMapping("/menus") public Object menus(Principal p){var f=identity(p);return jdbc.queryForList("""
        SELECT m.menu_id,m.menu_key,m.menu_name,COALESCE(p.can_view,false) AS "canView",COALESCE(p.can_create,false) AS "canCreate",
        COALESCE(p.can_edit,false) AS "canEdit",COALESCE(p.can_delete,false) AS "canDelete",COALESCE(p.can_export,false) AS "canExport"
        FROM core_menu m LEFT JOIN core_role_menu p ON p.tenant_id=m.tenant_id AND p.menu_id=m.menu_id AND p.role_id=? WHERE m.tenant_id=? ORDER BY m.menu_id
        """,f.getRoleId(),f.getTenantId());}
    @PutMapping("/roles/{id}/menus/{menuId}") @Transactional public Object permissions(@PathVariable long id,@PathVariable long menuId,@RequestBody MenuPermissions input,Principal p){var f=admin(p);role(f.getTenantId(),id);
        String code=jdbc.queryForObject("SELECT role_code FROM core_role WHERE tenant_id=? AND role_id=?",String.class,f.getTenantId(),id);if(Set.of("SUPER_ADMIN","ADMIN").contains(code))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"시스템 관리자 권한은 변경할 수 없습니다");
        if(jdbc.queryForObject("SELECT count(*) FROM core_menu WHERE tenant_id=? AND menu_id=?",Long.class,f.getTenantId(),menuId)!=1)throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if(!input.canView()&&(input.canCreate()||input.canEdit()||input.canDelete()||input.canExport()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"조회 권한을 먼저 허용하세요");
        jdbc.update("""
            INSERT INTO core_role_menu(tenant_id,role_id,menu_id,can_view,can_create,can_edit,can_delete,can_export) VALUES(?,?,?,?,?,?,?,?)
            ON CONFLICT(tenant_id,role_id,menu_id) DO UPDATE SET can_view=EXCLUDED.can_view,can_create=EXCLUDED.can_create,can_edit=EXCLUDED.can_edit,can_delete=EXCLUDED.can_delete,can_export=EXCLUDED.can_export
            """,f.getTenantId(),id,menuId,input.canView(),input.canCreate(),input.canEdit(),input.canDelete(),input.canExport());audit(f,"ROLE_PERMISSION_UPDATED",id);return input;}
    private void audit(FmsPrincipal f,String action,long target){jdbc.update("INSERT INTO core_audit_history(tenant_id,actor_user_id,actor,action,detail) VALUES(?,?,?,?,jsonb_build_object('targetId',CAST(? AS bigint)))",f.getTenantId(),f.getUserId(),f.getUsername(),action,target);}
}
