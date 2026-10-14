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
        if((pattern.startsWith("/api/rules/")||pattern.equals("/api/equipment/{code}")||(pattern.equals("/api/equipment")&&request.getMethod().equals("POST")))&&!platformRulesAdministrator(actor))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"공통 장비 규칙 변경은 플랫폼 관리자 권한이 필요합니다");
        // The column is selected from the fixed Permission contract, never from user input.
        String column=switch(required.action()) {case "view"->"can_view";case "create"->"can_create";case "edit"->"can_edit";case "delete"->"can_delete";case "export"->"can_export";default->throw new IllegalStateException();};
        Long count=jdbc.queryForObject("select count(*) from core_role_menu rm join core_menu m on m.menu_id=rm.menu_id and m.tenant_id=rm.tenant_id where rm.tenant_id=? and rm.role_id=? and m.menu_key=? and rm."+column+"=true",Long.class,actor.getTenantId(),actor.getRoleId(),required.menu());
        if(count==null||count==0)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"메뉴 작업 권한이 없습니다");
        return true;
    }
    static boolean platformRulesAdministrator(com.fms.security.FmsPrincipal actor) {
        return actor.getTenantId()==1L&&"SUPER_ADMIN".equals(actor.getRoleCode());
    }
    static Permission permission(String path,String method) {
        String menu;
        if(path.equals("/api/projects"))menu="PROJECT";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/\\{planId}/engineering/reconciliations"))return new Permission("PLANNING",method.equals("GET")?"view":"edit");
        else if(path.equals("/api/equipment/references"))return method.equals("GET")?new Permission("MASTER","view"):null;
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/\\{planId}/engineering/evidence/package"))return new Permission("PLANNING","export");
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/\\{planId}/engineering/checks(?:/\\{kind})?"))return new Permission("PLANNING",method.equals("GET")?"view":"edit");
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/\\{planId}/engineering/evidence(?:/\\{evidenceId}/file)?"))return new Permission("PLANNING",path.endsWith("/file")?"export":method.equals("GET")?"view":"edit");
        else if(path.equals("/api/equipment/{code}/clearance"))return method.equals("POST")?new Permission("MASTER","view"):null;
        else if(path.equals("/api/imports/preview")||path.equals("/api/imports/detect"))return method.equals("POST")?new Permission("PACKING","view"):null;
        else if(path.equals("/api/equipment")||path.equals("/api/equipment/{code}")||path.equals("/api/rules/{code}"))menu="MASTER";
        else if(path.equals("/api/carrier-rules"))menu="MASTER";
        else if(path.equals("/api/import-templates"))menu="PACKING";
        else if(path.equals("/api/quotation/rates")||path.equals("/api/packing/rules"))menu="MASTER";
        else if(path.equals("/api/development/status"))menu="DEVELOPMENT";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/cargos(?:/\\{cargoId})?")||path.matches("/api/projects/\\{(?:id|projectId)}/imports(?:/\\{uploadId}/file)?"))menu="PACKING";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/(?:analysis|export)"))menu="ANALYSIS";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans(?:/\\{planId}/(?:export(?:/pdf)?|revisions))?"))menu="PLANNING";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/history"))menu="HISTORY";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/packing-estimates"))menu="PACKING";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/quotations"))menu="PROJECT";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/quotations/\\{quoteId}/export(?:/pdf)?"))return new Permission("PROJECT","export");
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/compare"))return new Permission("PLANNING","view");
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/\\{planId}/engineering/calculations/(?:context|expanded/profiles|expanded/references)"))return new Permission("PLANNING","view");
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/\\{planId}/engineering/calculations/expanded/load-distribution"))return method.equals("POST")?new Permission("PLANNING","view"):null;
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/\\{planId}/engineering/calculations/expanded"))return method.equals("POST")?new Permission("PLANNING","create"):null;
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/\\{planId}/engineering/calculations"))return new Permission("PLANNING",method.equals("GET")?"view":"create");
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/\\{planId}/engineering/calculations/\\{calculationId}/decisions"))return new Permission("PLANNING","edit");
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/multifr/preview"))return method.equals("POST")?new Permission("PLANNING","view"):null;
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/multifr/reviews"))menu="PLANNING";
        else if(path.matches("/api/projects/\\{(?:id|projectId)}/plans/\\{planId}/engineering"))return new Permission("PLANNING",method.equals("GET")?"view":"edit");
        else return null;
        String action=path.endsWith("/export")||path.endsWith("/export/pdf")||path.endsWith("/file")?"export":path.endsWith("/revisions")?"edit":switch(method){case "GET"->"view";case "POST"->"create";case "PUT","PATCH"->"edit";case "DELETE"->"delete";default->null;};
        return action==null?null:new Permission(menu,action);
    }
}
