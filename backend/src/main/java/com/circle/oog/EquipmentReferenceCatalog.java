package com.circle.oog;
import java.util.*;

/** Transcribed from the supplied reference image, not a verified carrier or unit specification. */
public final class EquipmentReferenceCatalog {
 public static final String IMAGE_SHA256="3dc7679f129544075ce062b04319bad36c2c863e928ddd872df1304016acba45";
 public record Candidate(String code,String name,int length,int width,int height,int payload,int tareKg,int maximumGrossKg,Integer doorWidthMm,Integer doorHeightMm,boolean openWidth,boolean openHeight){}
 public static List<Candidate> candidates(){return List.of(
  new Candidate("20GP","20ft Dry · 원본 참고",5898,2352,2390,21750,2250,24000,2340,2280,false,false),
  new Candidate("40GP","40ft Dry · 원본 참고",12032,2352,2390,26740,3740,30480,2340,2280,false,false),
  new Candidate("40HC","40ft High Cube · 원본 참고",12032,2352,2695,26540,3940,30480,2340,2585,false,false),
  new Candidate("45HC","45ft High Cube · 원본 참고",13556,2352,2698,25760,4720,30480,2340,2585,false,false),
  new Candidate("20OT","20ft Open Top · 원본 참고",5889,2345,2312,21980,2020,24000,2335,2277,false,true),
  new Candidate("40OT","40ft Open Top · 원본 참고",12044,2350,2348,26500,3980,30480,2335,2280,false,true),
  new Candidate("20FR","20ft Flat Rack · 원본 참고",5612,2227,2213,31260,2740,34000,null,null,true,true),
  new Candidate("40FR","40ft Flat Rack · 원본 참고",11770,2380,1955,39400,5600,45000,null,null,true,true));}
 public static Map<String,Object> catalog(){return Map.of("candidates",candidates(),"sourceFile","lashing.xlsx","sourcePart","xl/media/image1.jpg","sourceImageSha256",IMAGE_SHA256,"sourceStatus","UNVERIFIED_GENERAL_REFERENCE","autoApply",false,"carrierApproved",false,"notes",List.of("원본 이미지의 m 값을 mm로 변환하고 중량 kg와 개구부를 전사했습니다. 자중+payload=최대 총중량을 검산했습니다.","선사·모델·실제 명판 확인 자료가 없는 일반 참고 표입니다. 현재 DB를 자동 변경하지 않으며 실제 장비 제원 확인 근거와 계획 규칙은 별도 입력해야 합니다.","원본의 냉동 3종은 OOG 핵심 후보에서 제외했습니다. 문 개구부 치수는 OT 상부 개구부 치수와 같다고 가정하지 않습니다."));}
 public static List<Map<String,Object>> compare(List<Equipment> current){var result=new ArrayList<Map<String,Object>>();for(var ref:candidates()){var e=current.stream().filter(v->v.code.equals(ref.code())).findFirst();var row=new LinkedHashMap<String,Object>();row.put("reference",ref);row.put("registered",e.isPresent());var diffs=new ArrayList<String>();if(e.isPresent()){var v=e.get();if(v.length!=ref.length())diffs.add("length");if(v.width!=ref.width())diffs.add("width");if(v.height!=ref.height())diffs.add("height");if(v.payload!=ref.payload())diffs.add("payload");if(v.openWidth!=ref.openWidth())diffs.add("openWidth");if(v.openHeight!=ref.openHeight())diffs.add("openHeight");row.put("current",v);}row.put("differentFields",diffs);row.put("autoApplied",false);result.add(row);}return result;}
}
