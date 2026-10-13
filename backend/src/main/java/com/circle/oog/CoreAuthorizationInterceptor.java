package com.circle.oog;

import jakarta.servlet.http.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CoreAuthorizationInterceptor implements HandlerInterceptor {
    record Permission(String menu,String action) {}
    private final JdbcTemplate jdbc;
    public CoreAuthorizationInterceptor(JdbcTemplate jdbc) {this.jdbc=jdbc;}
    @Override public boolean preHandle(HttpServletRequest request,HttpServletResponse response,Object handler) {
        if(!(handler instanceof HandlerMethod))return true;
        String pattern=String.valueOf(request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE));
        if(!pattern.startsWith("/api/"))return true;
        if(pattern.startsWith("/api/auth/"))return true;
        var actor=VerifiedActor.current();
        if(pattern.equals("/api/me")||pattern.startsWith("/api/core/"))return true;
        Permission required=permission(pattern,request.getMethod());
        if(required==null)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"허용되지 않은 기능입니다");
        if(pattern.startsWith("/api/projects/{")) {
            Object vars=request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
            if(!(vars instanceof Map<?,?> map))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            Object raw=map.containsKey("projectId")?map.get("projectId"):map.get("id");
            UUID projectId;try {projectId=UUID.fromString(String.valueOf(raw));}catch(IllegalArgumentException ex){throw new ResponseStatusException(HttpStatus.NOT_FOUND);}
            Long count=jdbc.queryForObject("select count(*) from oog_project where id=? and tenant_id=?",Long.class,projectId,actor.getTenantId());
            if(count==null||count==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"프로젝트를 찾을 수 없습니다");
        }
        if(pattern.startsWith("/api/rules/")&&!Set.of("ADMIN","SUPER_ADMIN").contains(actor.getRoleCode()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"장비 규칙 변경은 관리자 권한이 필요합니다");
        // The column is selected from the fixed Permission contract, never from user input.
        String column=switch(required.action()) {case "view"->"can_view";case "create"->"can_create";case "edit"->"can_edit";case "delete"->"can_delete";case "export"->"can_export";default->throw new IllegalStateException();};
        Long count=jdbc.queryForObject("select count(*) from core_role_menu rm join core_menu m on m.menu_id=rm.menu_id and m.tenant_id=rm.tenant_id where rm.tenant_id=? and rm.role_id=? and m.menu_key=? and rm."+column+"=true",Long.class,actor.getTenantId(),actor.getRoleId(),required.menu());
        if(count==null||count==0)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"메뉴 작업 권한이 없습니다");
        return true;
    }
    static Permission permission(String path,String method) {
        String menu;
        if(path.equals("/api/projects"))menu="PROJECT";
        else if(path.equals("/api/imports/preview"))return method.equals("POST")?new Permission("PACKING","view"):null;
        else if(path.equals("/api/equipment")||path.equals("/api/rules/{code}"))menu="MASTER";
        else if(path.equals("/api/development/status"))menu="DEVELOPMENT";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/cargos(?:/\\{cargoId})?")||path.matches("/api/projects/\\{(?:id|projectId)}/imports(?:/\\{uploadId}/file)?"))menu="PACKING";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/(?:analysis|export)"))menu="ANALYSIS";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans(?:/\\{planId}/(?:export|revisions))?"))menu="PLANNING";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/history"))menu="HISTORY";
        else return null;
        String action=path.endsWith("/export")||path.endsWith("/file")?"export":path.endsWith("/revisions")?"edit":switch(method){case "GET"->"view";case "POST"->"create";case "PUT","PATCH"->"edit";case "DELETE"->"delete";default->null;};
        return action==null?null:new Permission(menu,action);
    }
}
