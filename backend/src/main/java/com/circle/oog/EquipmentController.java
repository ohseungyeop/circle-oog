package com.circle.oog;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {
    public record Registration(String code,Specification specification,Double usableLengthRatio,Double planningWeightRatio,Double maxOverWidth,Double maxOverHeight,String evidence) {}
    public record Specification(String name,Double length,Double width,Double height,Double payload,Boolean openWidth,Boolean openHeight,Long version) {}
    private final Equipments equipment;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public EquipmentController(Equipments equipment,JdbcTemplate jdbc,ObjectMapper json) {this.equipment=equipment;this.jdbc=jdbc;this.json=json;}
    @PostMapping("/{code}/clearance")
    public Object clearance(@PathVariable String code,@RequestBody EquipmentClearance.Input input){return EquipmentClearance.calculate(equipment.findById(code).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"장비를 찾을 수 없습니다")),input);}
    @PostMapping @Transactional(rollbackFor=Exception.class)
    public Equipment create(@RequestBody Registration request) throws Exception {
        var actor=VerifiedActor.current();
        if(!CoreAuthorizationInterceptor.platformRulesAdministrator(actor))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"공통 장비 등록은 플랫폼 관리자 권한이 필요합니다");
        validateRegistration(request);
        // A transaction-scoped database lock also serializes concurrent registrations of a new code.
        jdbc.queryForObject("select 1 from (select pg_advisory_xact_lock(hashtext(?))) locked",Integer.class,"oog_equipment:"+request.code());
        if(equipment.existsById(request.code()))throw new ResponseStatusException(HttpStatus.CONFLICT,"이미 등록된 장비 코드입니다");
        var s=request.specification();
        jdbc.update("insert into oog_equipment(code,name,length,width,height,payload,open_width,open_height,version) values(?,?,?,?,?,?,?,?,0)",request.code(),s.name().trim(),s.length(),s.width(),s.height(),s.payload(),s.openWidth(),s.openHeight());
        jdbc.update("insert into oog_carrier_rule(equipment_code,carrier,usable_length_ratio,planning_weight_ratio,max_over_width,max_over_height,version) values(?,'DEFAULT',?,?,?,?,0)",request.code(),request.usableLengthRatio(),request.planningWeightRatio(),request.maxOverWidth(),request.maxOverHeight());
        jdbc.update("insert into core_audit_history(project_id,action,actor,detail,tenant_id,actor_user_id) values(null,?,?,cast(? as jsonb),?,?)","EQUIPMENT_CREATED",actor.getName(),json.writeValueAsString(request),actor.getTenantId(),actor.getUserId());
        return equipment.findById(request.code()).orElseThrow();
    }
    static void validateRegistration(Registration r) {
        if(r==null||r.code()==null||!r.code().matches("[A-Z0-9][A-Z0-9_-]{1,29}")||r.evidence()==null||r.evidence().isBlank()||r.evidence().length()>2000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"장비 코드(대문자/숫자/_/- 2~30자)와 제원·규칙 확인 근거를 입력하세요");
        validate(r.specification());
        if(r.specification().version()!=0||!ratio(r.usableLengthRatio())||!ratio(r.planningWeightRatio())||!nonnegative(r.maxOverWidth(),30000)||!nonnegative(r.maxOverHeight(),30000)
            ||(!r.specification().openWidth()&&r.maxOverWidth()!=0)||(!r.specification().openHeight()&&r.maxOverHeight()!=0))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"초기 version은 0, 계획 비율은 0.1~1이며 닫힌 면의 초과 허용치는 0이어야 합니다");
    }
    private static boolean ratio(Double v){return v!=null&&Double.isFinite(v)&&v>=.1&&v<=1;}
    private static boolean nonnegative(Double v,double max){return v!=null&&Double.isFinite(v)&&v>=0&&v<=max;}
    @PutMapping("/{code}") @Transactional(rollbackFor=Exception.class)
    public Equipment update(@PathVariable String code,@RequestBody Specification specification) throws Exception {
        var actor=VerifiedActor.current();
        if(!CoreAuthorizationInterceptor.platformRulesAdministrator(actor))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"공통 장비 제원 변경은 플랫폼 관리자 권한이 필요합니다");
        validate(specification);
        var existing=equipment.findById(code).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"장비를 찾을 수 없습니다"));
        if(existing.version!=specification.version())throw new ResponseStatusException(HttpStatus.CONFLICT,"다른 사용자가 장비 제원을 변경했습니다. 다시 조회하세요");
        var before=json.valueToTree(existing);
        existing.name=specification.name().trim();existing.length=specification.length();existing.width=specification.width();existing.height=specification.height();existing.payload=specification.payload();existing.openWidth=specification.openWidth();existing.openHeight=specification.openHeight();
        Equipment saved=equipment.saveAndFlush(existing);
        jdbc.update("insert into core_audit_history(project_id,action,actor,detail,tenant_id,actor_user_id) values(null,?,?,cast(? as jsonb),?,?)","EQUIPMENT_UPDATED",actor.getName(),json.writeValueAsString(Map.of("equipmentCode",code,"before",before,"after",json.valueToTree(saved))),actor.getTenantId(),actor.getUserId());
        return saved;
    }
    static void validate(Specification value) {
        if(value==null||value.name()==null||value.name().isBlank()||value.name().trim().length()>100||value.version()==null||value.version()<0||value.openWidth()==null||value.openHeight()==null
            ||!positive(value.length(),100000)||!positive(value.width(),30000)||!positive(value.height(),30000)||!positive(value.payload(),1000000))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"장비명(최대 100자), 유효한 mm/kg 제원, 개방 여부와 현재 version을 입력하세요");
    }
    private static boolean positive(Double value,double maximum) {return value!=null&&Double.isFinite(value)&&value>0&&value<=maximum;}
}
