package com.circle.oog;

import com.fms.security.FmsPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CoreAdminControllerTest {
    final JdbcTemplate jdbc=mock(JdbcTemplate.class);final CoreBootstrap bootstrap=mock(CoreBootstrap.class);
    final CoreAdminController controller=new CoreAdminController(jdbc,bootstrap);
    FmsPrincipal principal(long tenant,String role){return FmsPrincipal.builder().username("test").userId(10L).tenantId(tenant).roleId(20L).roleCode(role).priority(1).build();}
    @Test void authenticationAndAdminRoleRequiredBeforeReadingUsers(){
        assertThatThrownBy(()->controller.users(()->"basic")).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->controller.users(principal(1,"PLANNER"))).isInstanceOf(ResponseStatusException.class);verifyNoInteractions(jdbc);
    }
    @Test void platformRoleInOtherCompanyCannotReadOrCreateTenants(){assertThatThrownBy(()->controller.tenants(principal(2,"SUPER_ADMIN"))).isInstanceOf(ResponseStatusException.class);
        var input=new CoreAdminController.TenantInput("NEW","New company","companyadmin","example-password-123");
        assertThatThrownBy(()->controller.tenant(input,principal(2,"SUPER_ADMIN"))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->controller.tenant(new CoreAdminController.TenantInput("NEW","New company","companyadmin","가".repeat(30)),principal(1,"SUPER_ADMIN"))).hasMessageContaining("72바이트");verifyNoInteractions(jdbc);}
    @Test void userListingAlwaysUsesOwnTenantAndDoesNotSelectPasswordHash(){var p=principal(2,"ADMIN");controller.users(p);verify(jdbc).queryForList("SELECT user_id,tenant_id,role_id,username,status,token_version,failed_attempts,locked_until,version FROM core_user_account WHERE tenant_id=? ORDER BY user_id",2L);}
    @Test void staleVersionCannotModifyUserOrRevokeSessions(){var p=principal(2,"ADMIN");when(jdbc.queryForList(anyString(),eq(2L),eq(30L))).thenReturn(List.of(Map.of("version",4L,"role_id",20L,"role_code","PLANNER","status","ACTIVE")));
        assertThatThrownBy(()->controller.update(30,new CoreAdminController.UserUpdate("INACTIVE",null,3L),p)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("계정을 변경");verify(jdbc,never()).update(anyString(),any(Object[].class));}
    @Test void defaultPermissionsProtectMasterAndCustomerWrites(){
        assertThat(CoreBootstrap.permissions("ADMIN","MASTER")).containsOnly(true);
        assertThat(CoreBootstrap.permissions("PLANNER","MASTER")).containsExactly(true,false,false,false,false);
        assertThat(CoreBootstrap.permissions("CUSTOMER","PROJECT")).containsExactly(true,false,false,false,true);
        assertThat(CoreBootstrap.permissions("CUSTOMER","HISTORY")).containsOnly(false);
        assertThat(CoreBootstrap.permissions("ENGINEER","PLANNING")).containsExactly(true,true,true,false,true);
    }
}
