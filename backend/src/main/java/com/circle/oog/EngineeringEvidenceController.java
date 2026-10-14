package com.circle.oog;

import com.fasterxml.jackson.databind.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;
import java.io.ByteArrayOutputStream;
import java.util.zip.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** Uploaded evidence is a recorded declaration, not an authenticated carrier approval. */
@RestController @RequestMapping("/api/projects/{id}/plans/{planId}/engineering/evidence")
public class EngineeringEvidenceController {
 public record Metadata(String category,String subject,String issuer,String reference,String decision,LocalDate issuedOn,LocalDate validUntil,String reason){}
 private final JdbcTemplate jdbc;private final ObjectMapper json;private final Path storage;
 public EngineeringEvidenceController(JdbcTemplate jdbc,ObjectMapper json,@Value("${oog.storage}")String storage){this.jdbc=jdbc;this.json=json;this.storage=Path.of(storage).toAbsolutePath().normalize().resolve("engineering-evidence");}
 private void plan(UUID project,UUID plan){if(jdbc.queryForObject("select count(*) from oog_clp_scenario s join oog_project p on p.id=s.project_id where p.tenant_id=? and s.project_id=? and s.id=?",Long.class,VerifiedActor.tenantId(),project,plan)!=1)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"계획을 찾을 수 없습니다");}
 static void validate(Metadata m){
  if(m==null||!EngineeringReviewController.REQUIRED.contains(Objects.toString(m.category(),""))||!text(m.subject(),200)||!text(m.issuer(),200)||!text(m.reference(),300)||!text(m.reason(),2000)||!Set.of("SUBMITTED","ACCEPTED","REJECTED").contains(Objects.toString(m.decision(),""))||m.issuedOn()==null||m.issuedOn().isAfter(LocalDate.now())||m.validUntil()!=null&&m.validUntil().isBefore(m.issuedOn()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"증빙 항목·대상 식별·발행자·문서번호·문서상 결정·발행일·유효기간·근거를 확인하세요");
  if(!m.category().equals("CARRIER_APPROVAL")&&!m.decision().equals("SUBMITTED"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"선사 확인 외 증빙의 문서상 결정은 제출로 기록하세요");
 }
 private static boolean text(String v,int max){return v!=null&&!v.isBlank()&&v.length()<=max;}
 static String media(String name,byte[] b){
  String n=Objects.toString(name,"").toLowerCase(Locale.ROOT);
  if(n.endsWith(".pdf")&&b.length>=5&&new String(b,0,5,StandardCharsets.US_ASCII).equals("%PDF-"))return "application/pdf";
  if(n.endsWith(".png")&&b.length>=8&&Arrays.equals(Arrays.copyOf(b,8),new byte[]{(byte)137,80,78,71,13,10,26,10}))return "image/png";
  if((n.endsWith(".jpg")||n.endsWith(".jpeg"))&&b.length>=3&&(b[0]&255)==255&&(b[1]&255)==216&&(b[2]&255)==255)return "image/jpeg";
  throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"PDF/PNG/JPEG 파일의 확장자와 파일 형식을 확인하세요");
 }
 static String sha(byte[] bytes)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}
 @PostMapping @Transactional(rollbackFor=Exception.class)
 public Object create(@PathVariable UUID id,@PathVariable UUID planId,@RequestParam String metadata,@RequestParam MultipartFile file)throws Exception{
  var actor=VerifiedActor.current();if(!Set.of("ENGINEER","ADMIN","SUPER_ADMIN").contains(actor.getRoleCode()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"증빙 등록은 엔지니어 또는 관리자 역할이 필요합니다");
  plan(id,planId);Metadata m;try{m=json.readValue(metadata,Metadata.class);}catch(Exception ex){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"증빙 정보를 확인하세요");}validate(m);
  if(file.isEmpty()||file.getSize()>10*1024*1024)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"증빙 파일은 0 초과 10MB 이하입니다");
  byte[] bytes=file.getBytes();String mime=media(file.getOriginalFilename(),bytes),hash=sha(bytes);UUID key=UUID.randomUUID();
  String name=Objects.toString(file.getOriginalFilename(),"evidence").replaceAll("[\\\\/\\p{Cntrl}]","_");if(name.length()>180)name=name.substring(name.length()-180);
  var detail=new LinkedHashMap<String,Object>();detail.put("kind","EVIDENCE_FILE");detail.put("metadata",m);detail.put("fileName",name);detail.put("mediaType",mime);detail.put("bytes",bytes.length);detail.put("sha256",hash);detail.put("storageKey",key.toString());detail.put("reason",m.reason());detail.put("observations",Map.of(m.category(),m.subject()+" · "+m.reference()));detail.put("approved",false);detail.put("planStatus","PRE_PLAN");
  Files.createDirectories(storage);Path target=storage.resolve(key.toString());Files.write(target,bytes,StandardOpenOption.CREATE_NEW);
  TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)try{Files.deleteIfExists(target);}catch(Exception ignored){}}});
  jdbc.update("insert into oog_engineering_review(id,tenant_id,project_id,plan_id,author_id,status,detail) values(?,?,?,?,?,'REVIEW_RECORDED_NOT_APPROVED',cast(? as jsonb))",key,actor.getTenantId(),id,planId,actor.getUserId(),json.writeValueAsString(detail));
  jdbc.update("insert into core_audit_history(project_id,action,actor,tenant_id,actor_user_id,detail) values(?,'ENGINEERING_EVIDENCE_ADDED',?,?,?,cast(? as jsonb))",id,actor.getName(),actor.getTenantId(),actor.getUserId(),json.writeValueAsString(Map.of("evidenceId",key,"planId",planId,"sha256",hash,"category",m.category(),"reference",m.reference())));
  return Map.of("id",key,"sha256",hash,"planStatus","PRE_PLAN","carrierApproved",false);
 }
 @GetMapping public Object list(@PathVariable UUID id,@PathVariable UUID planId)throws Exception{
  plan(id,planId);var rows=jdbc.queryForList("select id,author_id,created_at,detail::text from oog_engineering_review where tenant_id=? and project_id=? and plan_id=? and detail->>'kind'='EVIDENCE_FILE' order by created_at desc,id desc",VerifiedActor.tenantId(),id,planId);
  var items=new ArrayList<Map<String,Object>>();var current=new LinkedHashMap<String,JsonNode>();
  for(var row:rows){JsonNode d=json.readTree((String)row.remove("detail"));var m=d.path("metadata");String expiry=m.path("validUntil").asText("");boolean expired=!expiry.isBlank()&&!expiry.equals("null")&&LocalDate.parse(expiry).isBefore(LocalDate.now());
   row.put("metadata",m);for(String key:List.of("fileName","mediaType","bytes","sha256"))row.put(key,d.path(key));row.put("expired",expired);row.put("recordedDecision",m.path("decision").asText());items.add(row);current.putIfAbsent(m.path("category").asText()+"\u0000"+m.path("subject").asText(),json.valueToTree(row));}
  var missing=new ArrayList<String>();for(String category:EngineeringReviewController.REQUIRED)if(current.values().stream().noneMatch(v->v.path("metadata").path("category").asText().equals(category)&&!v.path("expired").asBoolean()&&!v.path("recordedDecision").asText().equals("REJECTED")))missing.add(category);
  return Map.of("items",items,"missingCategories",missing,"coverageScope","CATEGORY_PRESENCE_ONLY_NOT_ALL_CARGO_OR_UNITS","planStatus","PRE_PLAN","carrierApproved",false,"notes",List.of("문서상 승인/거절은 사용자가 기록한 외부 문서 내용이며 발행자 진위를 인증한 결과가 아닙니다.","범주 누락 점검은 모든 화물/장비별 증빙의 완전성 또는 계산 적합성을 보장하지 않습니다. 같은 범주·대상은 최신 기록을 사용합니다."));
 }
 @GetMapping("/{evidenceId}/file") public ResponseEntity<byte[]> download(@PathVariable UUID id,@PathVariable UUID planId,@PathVariable UUID evidenceId)throws Exception{
  plan(id,planId);var rows=jdbc.queryForList("select detail::text from oog_engineering_review where id=? and tenant_id=? and project_id=? and plan_id=? and detail->>'kind'='EVIDENCE_FILE'",evidenceId,VerifiedActor.tenantId(),id,planId);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"증빙을 찾을 수 없습니다");
  var d=json.readTree((String)rows.getFirst().get("detail"));String key=d.path("storageKey").asText();if(!key.equals(evidenceId.toString()))throw new ResponseStatusException(HttpStatus.CONFLICT,"증빙 저장 식별값이 일치하지 않습니다");
  Path file=storage.resolve(key);if(!Files.isRegularFile(file)||Files.size(file)>10*1024*1024)throw new ResponseStatusException(HttpStatus.CONFLICT,"증빙 원본을 확인할 수 없습니다");byte[] bytes=Files.readAllBytes(file);if(!sha(bytes).equals(d.path("sha256").asText()))throw new ResponseStatusException(HttpStatus.CONFLICT,"증빙 원본 해시가 일치하지 않습니다");
  return ResponseEntity.ok().contentType(MediaType.parseMediaType(d.path("mediaType").asText())).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(d.path("fileName").asText(),StandardCharsets.UTF_8).build().toString()).header("X-Content-Type-Options","nosniff").header(HttpHeaders.CACHE_CONTROL,"no-store").body(bytes);
 }
 @GetMapping("/package") @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
 public ResponseEntity<byte[]> pack(@PathVariable UUID id,@PathVariable UUID planId)throws Exception{
  plan(id,planId);var evidence=jdbc.queryForList("select id,detail::text from oog_engineering_review where tenant_id=? and project_id=? and plan_id=? and detail->>'kind'='EVIDENCE_FILE' order by created_at,id",VerifiedActor.tenantId(),id,planId);
  if(evidence.size()>100)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"검토 묶음은 증빙 100개까지 지원합니다");
  var originalPlan=jdbc.queryForMap("select input_snapshot::text,result::text from oog_clp_scenario where id=? and project_id=?",planId,id);var review=jdbc.queryForList("select id,author_id,created_at,detail::text from oog_engineering_review where tenant_id=? and project_id=? and plan_id=? order by created_at,id",VerifiedActor.tenantId(),id,planId);
  var calculations=jdbc.queryForList("select id,author_id,input_snapshot::text,result::text,created_at from oog_engineering_calculation where tenant_id=? and project_id=? and plan_id=? order by created_at,id",VerifiedActor.tenantId(),id,planId);
  var decisions=jdbc.queryForList("select d.id,d.calculation_id,d.version,d.decision,d.reason,d.evidence,d.reviewer_id,d.created_at from oog_engineering_decision d join oog_engineering_calculation c on c.id=d.calculation_id and c.tenant_id=d.tenant_id where c.tenant_id=? and c.project_id=? and c.plan_id=? order by c.id,d.version",VerifiedActor.tenantId(),id,planId);
  var manifest=new LinkedHashMap<String,Object>();manifest.put("format","OOG-REVIEW-PACKAGE-1.0");manifest.put("projectId",id);manifest.put("planId",planId);manifest.put("planStatus","PRE_PLAN");manifest.put("carrierApproved",false);manifest.put("plan",Map.of("input",json.readTree((String)originalPlan.get("input_snapshot")),"result",json.readTree((String)originalPlan.get("result"))));
  for(var row:review){var detail=(com.fasterxml.jackson.databind.node.ObjectNode)json.readTree((String)row.get("detail"));detail.remove("storageKey");row.put("detail",detail);}for(var row:calculations){row.put("input_snapshot",json.readTree((String)row.get("input_snapshot")));row.put("result",json.readTree((String)row.get("result")));}
  manifest.put("reviews",review);manifest.put("calculations",calculations);manifest.put("decisions",decisions);manifest.put("notice","포함된 문서·입력·계산·외부 문서상 결정은 검토 자료이며 발행자 진위나 운송 승인을 인증하지 않습니다. 파일 SHA-256은 각 증빙 기록에 있습니다.");
  byte[] metadata=json.writerWithDefaultPrettyPrinter().writeValueAsBytes(manifest);if(metadata.length>5*1024*1024)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"검토 정보가 5MB를 초과했습니다");
  var bytes=new ByteArrayOutputStream();long size=metadata.length;try(var zip=new ZipOutputStream(bytes,StandardCharsets.UTF_8)){zip.putNextEntry(new ZipEntry("manifest.json"));zip.write(metadata);zip.closeEntry();for(var item:evidence){UUID key=(UUID)item.get("id");var detail=json.readTree((String)item.get("detail"));byte[] file=download(id,planId,key).getBody();size+=file.length;if(size>50*1024*1024)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"검토 묶음 원본 합계는 50MB까지 지원합니다");zip.putNextEntry(new ZipEntry("evidence/"+key+"-"+detail.path("fileName").asText()));zip.write(file);zip.closeEntry();}}
  return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/zip")).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename("oog-review-"+planId+".zip").build().toString()).header(HttpHeaders.CACHE_CONTROL,"no-store").header("X-Content-Type-Options","nosniff").body(bytes.toByteArray());
 }
}
