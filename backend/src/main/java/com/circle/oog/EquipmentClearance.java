package com.circle.oog;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Axis-aligned rectangular opening screening, not swept-path or lifting analysis. */
public final class EquipmentClearance {
    public record Input(String mode,Double cargoLengthMm,Double cargoWidthMm,Double cargoHeightMm,Double openingAmm,Double openingBmm,Double clearancePerSideMm,Boolean rotationAllowed,String evidence) {}
    public static Map<String,Object> calculate(Equipment equipment,Input r){
        if(r==null||!Set.of("DOOR","TOP","SIDE").contains(Objects.toString(r.mode(),""))||!positive(r.cargoLengthMm())||!positive(r.cargoWidthMm())||!positive(r.cargoHeightMm())||!positive(r.openingAmm())||!positive(r.openingBmm())||r.clearancePerSideMm()==null||!Double.isFinite(r.clearancePerSideMm())||r.clearancePerSideMm()<0||r.clearancePerSideMm()>10000||r.rotationAllowed()==null||r.evidence()==null||r.evidence().isBlank()||r.evidence().length()>2000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"반입 방향·화물/개구부 mm 치수·면당 여유·회전 여부·개구부 확인 근거를 입력하세요");
        boolean accessible=r.mode().equals("DOOR")||r.mode().equals("TOP")&&equipment.openHeight||r.mode().equals("SIDE")&&equipment.openWidth;
        var orientations=new ArrayList<Map<String,Object>>();
        for(int i=0;i<(r.rotationAllowed()?2:1);i++){
            double l=i==0?r.cargoLengthMm():r.cargoWidthMm(),w=i==0?r.cargoWidthMm():r.cargoLengthMm();
            double a=r.mode().equals("DOOR")?w:l,b=r.mode().equals("TOP")?w:r.cargoHeightMm();
            double marginA=r.openingAmm()-a-2*r.clearancePerSideMm(),marginB=r.openingBmm()-b-2*r.clearancePerSideMm();
            orientations.add(Map.of("rotated",i==1,"cargoAlongAmm",a,"cargoAlongBmm",b,"remainingAmm",marginA,"remainingBmm",marginB,"openingFits",accessible&&marginA>=0&&marginB>=0));
        }
        boolean fits=orientations.stream().anyMatch(v->Boolean.TRUE.equals(v.get("openingFits")));
        var out=new LinkedHashMap<String,Object>();out.put("equipmentCode",equipment.code);out.put("equipmentVersion",equipment.version);out.put("status",!accessible?"OPENING_MODE_UNAVAILABLE":fits?"RECTANGULAR_OPENING_FITS":"RECTANGULAR_OPENING_EXCEEDED");out.put("mode",r.mode());out.put("axes",r.mode().equals("DOOR")?"A=폭, B=높이":r.mode().equals("TOP")?"A=길이, B=폭":"A=길이, B=높이");out.put("orientations",orientations);out.put("input",r);out.put("carrierApproved",false);out.put("planStatus","PRE_PLAN");out.put("notes",List.of("확인된 직사각형 유효 개구부에 대한 정방향/수평 90도 회전 단면 검사입니다.","회전은 반입 전에 완료한다고 가정합니다. 내부 회전·이동 경로·기울임·인양 장비·헤더 제거·구조 간섭·바닥/지지 하중은 계산하지 않습니다.","이 결과는 장비 내부 적재 적합성이나 저장된 계획의 자동 승인·변경을 뜻하지 않습니다."));return out;
    }
    private static boolean positive(Double v){return v!=null&&Double.isFinite(v)&&v>0&&v<=100000;}
}
