package com.circle.oog;

import java.util.*;

/** Published guidance screening only. Never replaces actual unit loading charts or carrier acceptance. */
public final class PublishedCarrierGuidance {
    public static final String HAPAG="https://www.hapag-lloyd.com/content/dam/website/downloads/pdf/Weight_distribution_guideline_03.pdf";
    public static final String MAERSK="https://www.maersk.com/~/media_sc9/maersk/solutions/transportation-services/ocean-transport/special-cargo/out-of-gauge-cargo/files/maersk-lashing-guide.pdf";
    public static final String CMA="https://www.cma-cgm.com/assets/public/pdf/Customer%20Guideline%20-%20OOG-BREAK%20BULK-%20FLAT%20RACK-02092022.pdf";
    public record Request(String chartId,Double cargoWeightKg,Double restingLengthMm,Double actualPlatePayloadKg,Boolean mainBeamLoadPathConfirmed,Boolean chartApplicabilityConfirmed,String evidence) {}
    record Chart(String equipment,int labelPayloadKg,int[] lengthsMm,int[] limitsKg,boolean conflict) {}
    private static final Map<String,Chart> CHARTS=Map.of(
        "HL20_27900",chart("20FR",27900,new int[]{16700,20900,27900},false),
        "HL20_31200",chart("20FR",31200,new int[]{18700,23400,31200},false),
        "HL20_37000",chart("20FR",37000,new int[]{22200,27700,37000},false),
        "HL20_42100",chart("20FR",42100,new int[]{25200,31500,42100},false),
        "HL40_39300",chart("40FR",39300,new int[]{21400,23500,26200,29400,33600,39300},false),
        "HL40_44000",chart("40FR",44000,new int[]{24000,26400,29300,33000,37700,44000},false),
        "HL40_49000",chart("40FR",49000,new int[]{25600,29400,32700,36800,42100,49100},true),
        "HL40_54200",chart("40FR",54200,new int[]{29500,32500,36100,40600,46400,54200},false));
    private static Chart chart(String equipment,int label,int[] values,boolean conflict){return new Chart(equipment,label,values.length==3?new int[]{2000,4000,6000}:new int[]{2000,4000,6000,8000,10000,12000},values,conflict);}
    public static List<Map<String,Object>> equipmentFamilies(){return List.of(
        Map.of("family","DRY_HIGH_CUBE","examples",List.of("20GP","40GP","40HC","45HC"),"calculationScope","REGISTERED_GEOMETRY_PAYLOAD","requires","선사·모델별 내부/문 개구 치수·바닥 재질·집중하중 제원"),
        Map.of("family","OPEN_TOP","examples",List.of("20OT","40OT","40HCOT"),"calculationScope","REGISTERED_GEOMETRY_PAYLOAD","requires","높이 초과와 지붕/헤더 개구·허용 하중·선사 조건"),
        Map.of("family","FLAT_RACK","examples",List.of("20FR","40FR"),"calculationScope","REGISTERED_GEOMETRY_AND_PUBLISHED_RESTING_LENGTH_SCREEN","requires","실제 주보 전달·지지 길이·명판/모델별 하중표·벽 위치"),
        Map.of("family","PLATFORM_COLLAPSED_FR","examples",List.of("20PLATFORM","40PLATFORM"),"calculationScope","GEOMETRY_ONLY_WITH_CONFIRMED_UNIT_SPEC","requires","접은 벽과 적재면 높이·지지/고정 방식·foundation 하중과 운송 payload 구분"),
        Map.of("family","MULTI_FR_BREAKBULK","examples",List.of("MULTI_FR","BREAKBULK"),"calculationScope","PRELIMINARY_ENGINEERING_ONLY","requires","선박/장비별 결합 지지·리프팅·고박과 선사 개별 계획"),
        Map.of("family","REEFER_TANK_OTHER_SPECIAL","examples",List.of("REEFER","TANK"),"calculationScope","SPECIALIZED_MODEL_NOT_IMPLEMENTED","requires","온도·통풍·액체/위험물 등 별도 모델; 일반 OOG 자동 후보로 기본 등록하지 않음"));}
    public static List<Map<String,Object>> sources(){return List.of(
        Map.of("carrier","HAPAG_LLOYD","url",HAPAG,"pdfPage",4,"checkedOn","2026-10-14","purpose","FR 지지 길이별 하중표. 실제 장비·하중 전달 조건 확인 필요","autoApply",false),
        Map.of("carrier","MAERSK","url",MAERSK,"pdfPages","3-11","checkedOn","2026-10-14","purpose","CSC·실측 CoG·주보 전달·라싱 최약부와 치수 신고 지침","autoApply",false),
        Map.of("carrier","CMA_CGM","url",CMA,"pdfPage",2,"checkedOn","2026-10-14","purpose","일반 FR 조건과 개별 선적 승인 요구. 전 선사 공통 제원 아님","autoApply",false));}
    public static Object catalog(){var rows=new ArrayList<Map<String,Object>>();CHARTS.entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(e->{var c=e.getValue();var steps=new ArrayList<Map<String,Integer>>();for(int i=0;i<c.lengthsMm().length;i++)steps.add(Map.of("restingLengthMm",c.lengthsMm()[i],"publishedLimitKg",c.limitsKg()[i]));rows.add(Map.of("id",e.getKey(),"carrier","HAPAG_LLOYD","equipmentCode",c.equipment(),"columnLabelPayloadKg",c.labelPayloadKg(),"rows",steps,"sourceConflict",c.conflict(),"sourceUrl",HAPAG,"sourcePdfPage",4));});return Map.of("equipmentFamilies",equipmentFamilies(),"sources",sources(),"charts",rows,"autoApply",false,"carrierApproved",false,"interpolationPolicy","LOWER_PUBLISHED_ROW_NO_EXTRAPOLATION");}
    public static Map<String,Object> check(Request request){
        if(request==null||!CHARTS.containsKey(Objects.toString(request.chartId(),"")))throw EngineeringCalculationService.bad("공개 하중표의 정확한 열을 선택하세요");
        for(Double value:Arrays.asList(request.cargoWeightKg(),request.restingLengthMm(),request.actualPlatePayloadKg()))if(value!=null&&(!Double.isFinite(value)||value<=0||value>1000000))throw EngineeringCalculationService.bad("중량·실제 지지 길이·명판 payload를 확인하세요");
        var c=CHARTS.get(request.chartId());var missing=new ArrayList<String>();
        if(request.cargoWeightKg()==null)missing.add("TOTAL_LOAD_KG");if(request.restingLengthMm()==null)missing.add("ACTUAL_RESTING_LENGTH_MM");if(request.actualPlatePayloadKg()==null)missing.add("ACTUAL_UNIT_PLATE_PAYLOAD_KG");
        if(!Boolean.TRUE.equals(request.mainBeamLoadPathConfirmed()))missing.add("MAIN_BEAM_LOAD_PATH");if(!Boolean.TRUE.equals(request.chartApplicabilityConfirmed()))missing.add("CHART_UNIT_AND_GEOMETRY_APPLICABILITY");if(request.evidence()==null||request.evidence().isBlank())missing.add("APPLICABILITY_EVIDENCE");else EngineeringCalculationService.text(request.evidence(),"적용 근거");
        int row=-1;if(request.restingLengthMm()!=null)for(int i=0;i<c.lengthsMm().length;i++)if(request.restingLengthMm()>=c.lengthsMm()[i])row=i;
        boolean outside=request.restingLengthMm()!=null&&(row<0||request.restingLengthMm()>c.lengthsMm()[c.lengthsMm().length-1]);
        Double limit=row<0||outside||request.actualPlatePayloadKg()==null?null:Math.min(c.limitsKg()[row],Math.min(c.labelPayloadKg(),request.actualPlatePayloadKg()));
        boolean under=limit!=null&&request.cargoWeightKg()!=null&&request.cargoWeightKg()<=limit;
        String status=!missing.isEmpty()?"NEEDS_INFORMATION":c.conflict()?"SOURCE_CONFLICT_REQUIRES_CARRIER_CONFIRMATION":outside?"OUTSIDE_PUBLISHED_ROWS":!under?"EXCEEDS_PUBLISHED_GUIDANCE":"WITHIN_GUIDANCE_REQUIRES_CARRIER_REVIEW";
        var out=new LinkedHashMap<String,Object>();out.put("status",status);out.put("chartId",request.chartId());out.put("equipmentCode",c.equipment());out.put("missingInputs",missing);out.put("sourceUrl",HAPAG);out.put("sourcePdfPage",4);out.put("checkedOn","2026-10-14");out.put("publishedRowRestingLengthMm",row<0||outside?null:c.lengthsMm()[row]);out.put("publishedRowLimitKg",row<0||outside?null:c.limitsKg()[row]);out.put("screeningLimitKg",limit);out.put("numericallyUnderScreeningLimit",under);out.put("reviewCandidate",under&&missing.isEmpty()&&!outside&&!c.conflict());out.put("carrierApproved",false);out.put("eligibleForInternalApproval",false);out.put("planStatus","PRE_PLAN");out.put("autoApplied",false);
        out.put("notes",List.of("Actual total supported load and resting length are declared inputs, not inferred from packing dimensions","Lower published row is used between rows; no interpolation or extrapolation; this is an internal conservative screening policy","Actual unit serial/loading chart, load position, main-beam distribution, ports and carrier approval remain necessary","49t column differs from full-length row 49.1t; 2m diagram 26.8t differs from table 25.6t; affected column is blocked"));
        return out;
    }
}
