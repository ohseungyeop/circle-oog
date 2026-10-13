package com.circle.oog;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.apache.poi.ss.usermodel.*;
import java.nio.file.*;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api")
public class OogController {
    private final Projects projects; private final Cargos cargos; private final Equipments equipments;
    private final Rules rules; private final AnalysisService analysis; private final JdbcTemplate jdbc;
    private final ObjectMapper json; private final Path storage; private final RestClient optimizer;
    public OogController(Projects p,Cargos c,Equipments e,Rules r,AnalysisService a,JdbcTemplate j,ObjectMapper mapper,
        @Value("${oog.storage}") String files,@Value("${oog.optimizer}") String url) {
        projects=p;cargos=c;equipments=e;rules=r;analysis=a;jdbc=j;json=mapper;storage=Path.of(files).toAbsolutePath().normalize();
        var factory=new SimpleClientHttpRequestFactory();factory.setConnectTimeout(3000);factory.setReadTimeout(30000);
        optimizer=RestClient.builder().baseUrl(url).requestFactory(factory).build();
    }
    private Project project(UUID id) { return projects.findByIdAndTenantId(id,VerifiedActor.tenantId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"프로젝트를 찾을 수 없습니다")); }
    private void audit(UUID id,String action,Object detail,Principal user) throws Exception {
        var actor=VerifiedActor.current();
        jdbc.update("insert into core_audit_history(project_id,action,actor,detail,tenant_id,actor_user_id) values(?,?,?,cast(? as jsonb),?,?)",id,action,actor.getName(),json.writeValueAsString(detail),actor.getTenantId(),actor.getUserId());
    }
    @GetMapping("/me") public Object me(Principal p) {var actor=VerifiedActor.current();return Map.of("username",actor.getName(),"role",actor.getRoleCode(),"tenantId",actor.getTenantId(),"userId",actor.getUserId());}
    @GetMapping("/projects") public Object projects(@RequestParam(defaultValue="0") int page) {
        if(page<0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"페이지 값 오류");
        return com.logistics.common.dto.PageResponse.of(projects.findByTenantId(VerifiedActor.tenantId(),PageRequest.of(page,50,Sort.by("createdAt").descending())));
    }
    @PostMapping("/projects") @Transactional public Project create(@Valid @RequestBody Project p,Principal user) throws Exception {
        p.id=UUID.randomUUID();p.tenantId=VerifiedActor.tenantId();p.version=0;p.status="DRAFT";p.createdAt=java.time.Instant.now();
        var saved=projects.saveAndFlush(p);audit(p.id,"PROJECT_CREATED",Map.of("name",p.name),user);return saved;
    }
    @GetMapping("/equipment") public Object equipment() { return Map.of("equipment",equipments.findAll(),"rules",rules.findAll()); }
    @PutMapping("/rules/{code}") @Transactional public PlanningRule rule(@PathVariable String code,@Valid @RequestBody PlanningRule value,Principal user) throws Exception {
        var existing=rules.findById(code).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(existing.version!=value.version) throw new ResponseStatusException(HttpStatus.CONFLICT,"다른 사용자가 규칙을 변경했습니다");
        existing.usableLengthRatio=value.usableLengthRatio;existing.planningWeightRatio=value.planningWeightRatio;
        existing.maxOverWidth=value.maxOverWidth;existing.maxOverHeight=value.maxOverHeight;
        audit(null,"RULE_UPDATED",value,user);return rules.save(existing);
    }
    @GetMapping("/projects/{id}/cargos") public Object cargoList(@PathVariable UUID id) { project(id);return cargos.findByProjectIdOrderByItemNo(id); }
    @PostMapping("/projects/{id}/cargos") @Transactional public Cargo cargo(@PathVariable UUID id,@Valid @RequestBody Cargo c,Principal user) throws Exception {
        project(id);c.id=UUID.randomUUID();c.projectId=id;
        validateCargo(c);var saved=cargos.saveAndFlush(c);audit(id,"CARGO_CREATED",saved,user);return saved;
    }
    @DeleteMapping("/projects/{id}/cargos/{cargoId}") @Transactional public void deleteCargo(@PathVariable UUID id,@PathVariable UUID cargoId,Principal user) throws Exception {
        project(id);
        var c=cargos.findById(cargoId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(!c.projectId.equals(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        cargos.delete(c);audit(id,"CARGO_DELETED",Map.of("cargoId",cargoId),user);
    }
    private void validateCargo(Cargo c) {
        if(c.itemNo==null||c.itemNo.isBlank()||c.itemNo.length()>120||c.quantity<1||c.quantity>10000||
            !Double.isFinite(c.length)||!Double.isFinite(c.width)||!Double.isFinite(c.height)||!Double.isFinite(c.grossWeight)||!Double.isFinite(c.netWeight)||
            c.length<=0||c.width<=0||c.height<=0||c.grossWeight<=0||c.netWeight<0||c.netWeight>c.grossWeight||
            c.length>100000||c.width>30000||c.height>30000||c.grossWeight>1000000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"화물 치수·중량·수량을 확인하세요 (mm/kg, G/W ≥ N/W)");
        if(!Double.isFinite(c.originalLength)||!Double.isFinite(c.originalWidth)||!Double.isFinite(c.originalHeight)||
            c.originalLength<0||c.originalWidth<0||c.originalHeight<0||c.originalLength>100000||c.originalWidth>30000||c.originalHeight>30000||
            (c.originalLength>0||c.originalWidth>0||c.originalHeight>0)&&(c.originalLength<=0||c.originalWidth<=0||c.originalHeight<=0))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"원치수는 길이·폭·높이를 모두 입력하거나 모두 비워두세요");
    }
    @GetMapping("/projects/{id}/analysis") public Object analyze(@PathVariable UUID id) {
        project(id);var eq=equipments.findAll();var rs=rules.findAll();
        return cargos.findByProjectIdOrderByItemNo(id).stream().map(c -> analysis.analyze(c,eq,rs)).toList();
    }
    @PostMapping("/imports/preview") public Object preview(@RequestParam MultipartFile file,@RequestParam(defaultValue="0") int sheet,@RequestParam(defaultValue="0") int header,
        @RequestParam(defaultValue="1") int headerRows) throws Exception {
        try(var wb=workbook(file)) {
            if(sheet<0||sheet>=wb.getNumberOfSheets()||header<0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"시트/헤더 행 오류");
            var s=wb.getSheetAt(sheet);var fmt=new DataFormatter();List<List<String>> rows=new ArrayList<>();
            for(int i=header;i<=Math.min(s.getLastRowNum(),header+20);i++) {
                var row=s.getRow(i);List<String> values=new ArrayList<>();
                if(row!=null) for(int k=0;k<Math.min(row.getLastCellNum(),80);k++) values.add(fmt.formatCellValue(row.getCell(k)));
                rows.add(values);
            }
            List<String> sheets=new ArrayList<>();for(int i=0;i<wb.getNumberOfSheets();i++) sheets.add(wb.getSheetName(i));
            var result=new LinkedHashMap<String,Object>();result.put("sheets",sheets);result.put("rows",rows);result.put("totalRows",s.getLastRowNum()+1);
            try {result.putAll(new ImportMappingService().suggest(s,header,headerRows));}
            catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,e.getMessage());}
            return result;
        }
    }
    private Workbook workbook(MultipartFile file) throws Exception {
        String name=importFileName(file).toLowerCase(Locale.ROOT);
        if(file.isEmpty()||file.getSize()>15*1024*1024||!(name.endsWith(".xlsx")||name.endsWith(".xls")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"15MB 이하 Excel 파일을 선택하세요");
        try(var input=file.getInputStream()){return WorkbookFactory.create(input);}
    }
    private String importFileName(MultipartFile file) {
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse("").replace('\\','/');
        name=name.substring(name.lastIndexOf('/')+1);
        if(name.isBlank()||name.length()>240||name.chars().anyMatch(c->c<32)||name.equals(".")||name.equals(".."))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Excel 파일명 오류");
        return name;
    }
    @PostMapping("/projects/{id}/imports") @Transactional(rollbackFor=Exception.class) public Object importExcel(@PathVariable UUID id,@RequestParam MultipartFile file,
        @RequestParam String mapping,@RequestParam(defaultValue="0") int sheet,@RequestParam(defaultValue="0") int header,
        @RequestParam(defaultValue="mm") String lengthUnit,@RequestParam(defaultValue="kg") String weightUnit,
        @RequestParam(defaultValue="1") int headerRows,@RequestParam(defaultValue="PER_PIECE") String weightBasis,Principal user) throws Exception {
        project(id);com.fasterxml.jackson.databind.JsonNode map;
        try {map=json.readTree(mapping);}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"컬럼 매핑 JSON 오류");}
        var importer=new ImportMappingService();
        try {
            if(map==null||!map.isObject()) throw new IllegalArgumentException("컬럼 매핑은 JSON 객체여야 합니다");
            for(String key:List.of("itemNo","length","width","height","grossWeight")) importer.column(map,key,true);
            for(String key:List.of("description","quantity","netWeight","originalLength","originalWidth","originalHeight")) importer.column(map,key,false);
            if(!Set.of("PER_PIECE","ROW_TOTAL").contains(weightBasis)) throw new IllegalArgumentException("중량 기준 오류");
            if(weightBasis.equals("ROW_TOTAL")) importer.column(map,"quantity",true);
        } catch(IllegalArgumentException e) {throw new ResponseStatusException(HttpStatus.BAD_REQUEST,e.getMessage());}
        double lm=switch(lengthUnit) {case "mm"->1;case "cm"->10;case "m"->1000;default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"길이 단위 오류");};
        double wm=switch(weightUnit) {case "kg"->1;case "ton"->1000;default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"중량 단위 오류");};
        List<Cargo> values=new ArrayList<>();List<String> errors=new ArrayList<>();Set<String> items=new HashSet<>();
        cargos.findByProjectIdOrderByItemNo(id).forEach(c -> items.add(c.itemNo));
        try(var wb=workbook(file)) {
            if(sheet<0||sheet>=wb.getNumberOfSheets()||header<0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"시트/헤더 행 오류");
            var s=wb.getSheetAt(sheet);if(s.getLastRowNum()>10000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"최대 10,000행까지 지원합니다");
            try {importer.checkHeaders(s,header,headerRows);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,e.getMessage());}
            var fmt=new DataFormatter();
            for(int i=header+headerRows;i<=s.getLastRowNum();i++) {
                var row=s.getRow(i);if(row==null) continue;
                boolean blank=true;for(var cell:row) if(!fmt.formatCellValue(cell).isBlank()) {blank=false;break;} if(blank) continue;
                try {
                    var c=importer.read(row,map,lm,wm,weightBasis,id);
                    validateCargo(c);if(!items.add(c.itemNo)) throw new IllegalArgumentException("중복 Item: "+c.itemNo);values.add(c);
                } catch(Exception ex) { errors.add((i+1)+"행: "+ex.getMessage()); }
            }
        }
        if(!errors.isEmpty()) return Map.of("imported",0,"errors",errors);
        if(values.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"가져올 화물 행이 없습니다");
        cargos.saveAllAndFlush(values);UUID uploadId=UUID.randomUUID();String originalName=importFileName(file);
        String relative="projects/"+id+"/packing-list/"+uploadId+(originalName.toLowerCase(Locale.ROOT).endsWith(".xls")?".xls":".xlsx");
        Path target=storage.resolve(relative).normalize();if(!target.startsWith(storage)) throw new IllegalStateException("저장 경로 오류");
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization(){
            @Override public void afterCompletion(int status) {
                if(status!=STATUS_COMMITTED) try {Files.deleteIfExists(target);}catch(java.io.IOException ignored) {org.slf4j.LoggerFactory.getLogger(OogController.class).warn("가져오기 롤백 파일 삭제 실패: {}",uploadId);}
            }
        });
        Files.createDirectories(target.getParent());file.transferTo(target);
        jdbc.update("insert into oog_packing_list(id,project_id,original_name,relative_path,mapping) values(?,?,?,?,cast(? as jsonb))",uploadId,id,
            originalName,relative,json.writeValueAsString(Map.of("columns",map,"sheet",sheet,"header",header,"headerRows",headerRows,"lengthUnit",lengthUnit,"weightUnit",weightUnit,"weightBasis",weightBasis)));
        audit(id,"PACKING_LIST_IMPORTED",Map.of("count",values.size(),"uploadId",uploadId),user);
        return Map.of("imported",values.size(),"errors",List.of());
    }
    @PostMapping("/projects/{id}/plans") @Transactional public Object plan(@PathVariable UUID id,Principal user) throws Exception {
        project(id);var cargo=cargos.findByProjectIdOrderByItemNo(id);
        if(cargo.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"화물을 먼저 등록하세요");
        var input=Map.of("cargos",cargo,"equipment",equipments.findAll(),"rules",rules.findAll());
        Object result;
        try {result=optimizer.post().uri("/optimize").body(input).retrieve().body(Object.class);}
        catch(org.springframework.web.client.RestClientException ex) {throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"최적화 서비스를 실행하거나 입력 제약을 확인하세요");}
        UUID scenario=UUID.randomUUID();jdbc.update("insert into oog_clp_scenario(id,project_id,result,input_snapshot) values(?,?,cast(? as jsonb),cast(? as jsonb))",scenario,id,json.writeValueAsString(result),json.writeValueAsString(input));
        audit(id,"CLP_GENERATED",Map.of("scenarioId",scenario),user);return Map.of("id",scenario,"result",result);
    }
    @GetMapping("/projects/{id}/plans") public Object plans(@PathVariable UUID id) {project(id);return jdbc.queryForList("select id,result,created_at from oog_clp_scenario where project_id=? order by created_at desc limit 20",id);}
    @GetMapping("/projects/{id}/export") public ResponseEntity<byte[]> export(@PathVariable UUID id) throws Exception {
        project(id);try(var wb=new org.apache.poi.xssf.usermodel.XSSFWorkbook();var out=new java.io.ByteArrayOutputStream()) {
            var s=wb.createSheet("OOG Analysis");var h=s.createRow(0);String[] headers={"Item","Description","Qty","L mm","W mm","H mm","GW kg per piece","CBM total","Class (40HC rule)","Recommendation","Warnings"};
            for(int i=0;i<headers.length;i++) h.createCell(i).setCellValue(headers[i]);int row=1;
            var eq=equipments.findAll();var rs=rules.findAll();
            for(var c:cargos.findByProjectIdOrderByItemNo(id)) {
                var a=analysis.analyze(c,eq,rs);var r=s.createRow(row++);String[] v={c.itemNo,c.description,""+c.quantity,""+c.length,""+c.width,""+c.height,""+c.grossWeight,""+a.cbm(),String.join(" + ",a.classification()),a.recommended(),String.join(" / ",a.warnings())};
                for(int i=0;i<v.length;i++) r.createCell(i).setCellValue(v[i]==null?"":v[i]);
            }
            for(int i=0;i<headers.length;i++) s.setColumnWidth(i,i==10?15000:6000);wb.write(out);
            return ResponseEntity.ok().header("Content-Disposition","attachment; filename=oog-analysis.xlsx").contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).body(out.toByteArray());
        }
    }
}
