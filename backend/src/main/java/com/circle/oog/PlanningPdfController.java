package com.circle.oog;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.Path;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{id}/plans")
public class PlanningPdfController {
    private final JdbcTemplate jdbc;private final ObjectMapper json;private final Path font;
    public PlanningPdfController(JdbcTemplate jdbc,ObjectMapper json,@Value("${oog.pdf-font:${OOG_PDF_FONT:C:/Windows/Fonts/malgun.ttf}}") String font){this.jdbc=jdbc;this.json=json;this.font=Path.of(font);}
    @GetMapping("/{planId}/export/pdf")
    public ResponseEntity<byte[]> export(@PathVariable UUID id,@PathVariable UUID planId)throws Exception {
        var rows=jdbc.queryForList("select s.result::text,s.input_snapshot::text,s.created_at,p.name from oog_clp_scenario s join oog_project p on p.id=s.project_id where s.project_id=? and s.id=? and p.tenant_id=?",id,planId,VerifiedActor.tenantId());
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"계획을 찾을 수 없습니다");
        var row=rows.getFirst();
        byte[] bytes=PlanningPdfRenderer.render(planId,String.valueOf(row.get("name")),String.valueOf(row.get("created_at")),json.readTree((String)row.get("result")),json.readTree((String)row.get("input_snapshot")),font);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=oog-clp-"+planId+".pdf").header("X-Content-Type-Options","nosniff").body(bytes);
    }
}
