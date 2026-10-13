package com.circle.oog;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/projects/{id}")
public class HistoryController {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final Path storage;
    public HistoryController(JdbcTemplate jdbc,ObjectMapper json,@Value("${oog.storage}") String storage) {this.jdbc=jdbc;this.json=json;this.storage=Path.of(storage).toAbsolutePath().normalize();}

    @GetMapping("/history")
    public Object history(@PathVariable UUID id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(required=false) Integer limit) {
        if(limit!=null)size=limit;
        if(page<0||page>1000000||size<1||size>100)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"페이지는 0 이상, 조회 개수는 1~100입니다");
        long tenant=VerifiedActor.tenantId();
        if(jdbc.queryForObject("select count(*) from oog_project where id=? and tenant_id=?",Long.class,id,tenant)==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"프로젝트를 찾을 수 없습니다");
        long offset=(long)page*size;
        var audits=jdbc.queryForList("select id,action,actor,detail::text,created_at as \"createdAt\" from core_audit_history where project_id=? and tenant_id=? order by created_at desc,id desc limit ? offset ?",id,tenant,size,offset);
        var uploads=jdbc.queryForList("select id,original_name as \"originalName\",mapping::text,created_at as \"createdAt\" from oog_packing_list where project_id=? order by created_at desc,id desc limit ? offset ?",id,size,offset);
        var plans=jdbc.queryForList("select id,result::text,input_snapshot::text as \"inputSnapshot\",created_at as \"createdAt\" from oog_clp_scenario where project_id=? order by created_at desc,id desc limit ? offset ?",id,size,offset);
        decode(audits,"detail");decode(uploads,"mapping");decode(plans,"result","inputSnapshot");
        return Map.of("audits",audits,"uploads",uploads,"plans",plans,"page",page,"size",size);
    }
    private void decode(List<Map<String,Object>> rows,String... keys) {
        for(var row:rows)for(String key:keys)try {row.put(key,json.readTree((String)row.get(key)));}catch(Exception ex){throw new IllegalStateException("저장된 JSON을 읽을 수 없습니다",ex);}
    }
    @GetMapping("/imports/{uploadId}/file")
    public ResponseEntity<byte[]> original(@PathVariable UUID id,@PathVariable UUID uploadId) throws Exception {
        var rows=jdbc.queryForList("select u.relative_path,u.original_name from oog_packing_list u join oog_project p on p.id=u.project_id where u.project_id=? and u.id=? and p.tenant_id=?",id,uploadId,VerifiedActor.tenantId());
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"업로드를 찾을 수 없습니다");
        var row=rows.getFirst();Path path=safeOriginal(storage,String.valueOf(row.get("relative_path")));
        if(Files.size(path)>15*1024*1024)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"원본 크기가 허용 범위를 초과합니다");
        String original=String.valueOf(row.get("original_name"));String extension=original.toLowerCase(Locale.ROOT).endsWith(".xls")?".xls":".xlsx";
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=packing-list-"+uploadId+extension)
            .header("X-Content-Type-Options","nosniff").contentType(MediaType.parseMediaType(extension.equals(".xls")?"application/vnd.ms-excel":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).body(Files.readAllBytes(path));
    }
    static Path safeOriginal(Path storage,String relative) throws Exception {
        Path requested=Path.of(relative);Path root=storage.toAbsolutePath().normalize();Path target=root.resolve(requested).normalize();
        if(requested.isAbsolute()||!target.startsWith(root))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"원본 파일을 찾을 수 없습니다");
        if(!Files.isRegularFile(target))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"원본 파일을 찾을 수 없습니다");
        if(!target.toRealPath().startsWith(root.toRealPath()))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"원본 파일을 찾을 수 없습니다");
        return target;
    }
}
