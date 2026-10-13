package com.circle.oog;

import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class AnalysisService {
    public record Candidate(String code, boolean feasible, List<String> reasons, double overLength,
        double overWidth, double overHeight, double overWeight, long ruleVersion) {}
    public record Analysis(Cargo cargo, double cbm, List<String> classification, String recommended,
        List<String> warnings, List<Candidate> candidates) {}

    public Analysis analyze(Cargo c, List<Equipment> equipment, List<PlanningRule> rules) {
        List<String> warnings = new ArrayList<>();
        if(c.netWeight > c.grossWeight) warnings.add("G/W가 N/W보다 작습니다");
        if(c.estimated) warnings.add("예상 포장치수입니다. 실제 포장 후 확인이 필요합니다");
        List<Candidate> candidates = new ArrayList<>();
        for(var e: equipment) {
            var r = rules.stream().filter(v -> v.equipmentCode.equals(e.code)).findFirst().orElseThrow();
            double l=c.length, w=c.width;
            if(c.rotationAllowed && c.length>e.length*r.usableLengthRatio && c.width<=e.length*r.usableLengthRatio) {
                l=c.width; w=c.length;
            }
            double ol=Math.max(0,l-e.length*r.usableLengthRatio), ow=Math.max(0,w-e.width),
                oh=Math.max(0,c.height-e.height), weight=Math.max(0,c.grossWeight-e.payload*r.planningWeightRatio);
            List<String> reasons = new ArrayList<>();
            if(ol>0) reasons.add("유효 길이 "+Math.round(e.length*r.usableLengthRatio)+"mm보다 "+Math.round(ol)+"mm 초과");
            if(ow>0) reasons.add("폭 "+Math.round(ow)+"mm 초과");
            if(oh>0) reasons.add("높이 "+Math.round(oh)+"mm 초과");
            if(weight>0) reasons.add("계획 중량 "+Math.round(weight)+"kg 초과");
            if(reasons.isEmpty()) reasons.add("치수 및 계획 중량 범위 내");
            boolean feasible=ol==0 && weight==0 && ow<=r.maxOverWidth && oh<=r.maxOverHeight && (ow==0||e.openWidth) && (oh==0||e.openHeight);
            candidates.add(new Candidate(e.code,feasible,reasons,ol,ow,oh,weight,r.version));
        }
        var base=candidates.stream().filter(e -> e.code.equals("40HC")).findFirst().orElseThrow();
        List<String> classification=new ArrayList<>();
        if(base.overLength>0) classification.add("OL");
        if(base.overWidth>0) classification.add("OW");
        if(base.overHeight>0) classification.add("OH");
        if(base.overWeight>0) classification.add("OVERWEIGHT");
        if(classification.isEmpty()) classification.add("NORMAL");
        String recommended=List.of("20GP","40HC","40OT","20FR","40FR").stream()
            .filter(code -> candidates.stream().anyMatch(v -> v.code.equals(code)&&v.feasible)).findFirst().orElse("ENGINEERING_REVIEW");
        if(recommended.equals("ENGINEERING_REVIEW")) warnings.add("Multi-FR / Platform / Breakbulk 공학 검토 필요");
        if(!classification.equals(List.of("NORMAL"))) warnings.add("선사 승인 및 지지점·라싱 검토 필요");
        double cbm = com.logistics.common.util.LogisticsCalcUtil.calculateCbm(
            java.math.BigDecimal.valueOf(c.width),java.math.BigDecimal.valueOf(c.length),java.math.BigDecimal.valueOf(c.height))
            .multiply(java.math.BigDecimal.valueOf(c.quantity)).doubleValue();
        return new Analysis(c,cbm,classification,recommended,warnings,candidates);
    }
}
