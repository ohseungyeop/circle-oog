package com.circle.oog;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Component
public class CoreBootstrap implements ApplicationRunner {
    private final JdbcTemplate jdbc; private final String password;
    public CoreBootstrap(JdbcTemplate jdbc,@Value("${oog.admin-password}") String password){this.jdbc=jdbc;this.password=password;}
    @Override @Transactional public void run(ApplicationArguments args) {
        if(password.length()<12)throw new IllegalStateException("OOG_ADMIN_PASSWORD must contain at least 12 characters");
        seedTenant(1);
        jdbc.update("""
            INSERT INTO core_user_account(tenant_id,role_id,username,password_hash)
            SELECT 1,role_id,'admin',? FROM core_role WHERE tenant_id=1 AND role_code='SUPER_ADMIN'
            ON CONFLICT(tenant_id,username) DO NOTHING
            """,new BCryptPasswordEncoder().encode(password));
    }
    public void seedTenant(long tenant) {
        List<String> roles=tenant==1?List.of("SUPER_ADMIN","ADMIN","PLANNER","ENGINEER","SALES","CUSTOMER"):List.of("ADMIN","PLANNER","ENGINEER","SALES","CUSTOMER");
        for(int i=0;i<roles.size();i++)jdbc.update("INSERT INTO core_role(tenant_id,role_code,role_name,priority) VALUES(?,?,?,?) ON CONFLICT(tenant_id,role_code) DO NOTHING",tenant,roles.get(i),roles.get(i),i*10);
        String[][] menus={{"PROJECT","프로젝트"},{"PACKING","Packing List"},{"ANALYSIS","화물 분석"},{"PLANNING","적재 계획"},{"MASTER","기준정보"},{"HISTORY","변경 이력"},{"DEVELOPMENT","개발 현황"}};
        for(var menu:menus)jdbc.update("INSERT INTO core_menu(tenant_id,menu_key,menu_name) VALUES(?,?,?) ON CONFLICT(tenant_id,menu_key) DO NOTHING",tenant,menu[0],menu[1]);
        for(String role:roles)for(var menu:menus){boolean[] p=permissions(role,menu[0]);jdbc.update("""
            INSERT INTO core_role_menu(tenant_id,role_id,menu_id,can_view,can_create,can_edit,can_delete,can_export)
            SELECT ?,r.role_id,m.menu_id,?,?,?,?,? FROM core_role r JOIN core_menu m ON m.tenant_id=r.tenant_id
            WHERE r.tenant_id=? AND r.role_code=? AND m.menu_key=? ON CONFLICT(tenant_id,role_id,menu_id) DO NOTHING
            """,tenant,p[0],p[1],p[2],p[3],p[4],tenant,role,menu[0]);}
    }
    static boolean[] permissions(String role,String menu) {
        if(List.of("SUPER_ADMIN","ADMIN").contains(role))return new boolean[]{true,true,true,true,true};
        if(role.equals("PLANNER")){boolean write=!List.of("MASTER","HISTORY","DEVELOPMENT").contains(menu);return new boolean[]{true,write,write,write,write};}
        if(role.equals("ENGINEER")){boolean work=List.of("ANALYSIS","PLANNING").contains(menu);return new boolean[]{work,work,work,false,work};}
        boolean read=List.of("PROJECT","ANALYSIS","PLANNING").contains(menu)||(role.equals("SALES")&&menu.equals("HISTORY"));
        return new boolean[]{read,false,false,false,read};
    }
}
