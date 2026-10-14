package com.circle.oog;

import org.apache.poi.ss.usermodel.*;
import java.util.*;
import java.util.regex.Pattern;

/** Bounded, header-evidence-only detection. Unknown units must be confirmed by the operator. */
public class ImportDetectionService {
    private static final List<String> REQUIRED=List.of("itemNo","length","width","height","grossWeight");
    @SuppressWarnings("unchecked")
    public Map<String,Object> detect(Workbook wb) {
        if(wb.getNumberOfSheets()>50)throw new IllegalArgumentException("자동 탐지는 최대 50개 시트를 지원합니다. 수동 미리보기를 사용하세요");
        var candidates=new ArrayList<Map<String,Object>>();
        for(int si=0;si<wb.getNumberOfSheets();si++) {
            var s=wb.getSheetAt(si);
            for(int h=0;h<=Math.min(29,s.getLastRowNum());h++) for(int count=1;count<=2;count++) {
                if(h+count>s.getLastRowNum()+1)continue;
                var suggestion=new ImportMappingService().suggest(s,h,count);
                var mapping=(Map<String,Integer>)suggestion.get("suggestedMapping");
                int matched=(int)REQUIRED.stream().filter(mapping::containsKey).count();
                if(matched<3)continue;
                var labels=(List<String>)suggestion.get("combinedHeaders");
                boolean data=hasData(s,h+count,mapping);
                // A second header row must add mapping evidence, never swallow the first data row.
                if(count==2) {
                    var top=s.getRow(h);boolean nonblank=false;
                    if(top!=null)for(var cell:top)if(!new DataFormatter().formatCellValue(cell).isBlank())nonblank=true;
                    if(!nonblank)continue;
                    var one=(Map<String,Integer>)new ImportMappingService().suggest(s,h,1).get("suggestedMapping");
                    if(REQUIRED.stream().allMatch(k->Objects.equals(mapping.get(k),one.get(k))))continue;
                }
                var warnings=new ArrayList<String>();var reasons=new ArrayList<String>();
                reasons.add("필수 헤더 "+matched+"/5개 일치");
                reasons.add(data?"헤더 아래 필수 숫자 데이터 행 확인":"헤더 아래 데이터 행 확인 필요");
                var missing=REQUIRED.stream().filter(k->!mapping.containsKey(k)).toList();
                if(!missing.isEmpty())warnings.add("필수 컬럼 직접 선택: "+String.join(", ",missing));
                ((List<String>)suggestion.get("suggestionsWarnings")).stream().filter(v->v.contains("여러 후보")||v.contains("Package Dimension")).forEach(warnings::add);
                var length=units(labels,mapping,List.of("length","width","height","originalLength","originalWidth","originalHeight"),true);
                var weight=units(labels,mapping,List.of("grossWeight","netWeight"),false);
                String basis=null;
                String gw=mapping.containsKey("grossWeight")?labels.get(mapping.get("grossWeight")).toLowerCase(Locale.ROOT):"";
                boolean total=gw.matches(".*(row\\s*total|total\\s*(gross|weight)|행\\s*합계|합계\\s*중량).*"),piece=gw.matches(".*(per\\s*piece|each|개당).*" );
                if(total!=piece)basis=total?"ROW_TOTAL":"PER_PIECE";
                if(length==null)warnings.add("길이 단위 미확정 또는 서로 다름: 수동 확인 필요");else reasons.add("길이 헤더 단위: "+length);
                if(weight==null)warnings.add("중량 단위 미확정 또는 서로 다름: 수동 확인 필요");else reasons.add("중량 헤더 단위: "+weight);
                if(basis==null)warnings.add("개당/행 합계 중량 기준 미확정: 수동 확인 필요");else reasons.add("중량 헤더 기준: "+basis);
                var c=new LinkedHashMap<String,Object>();c.put("id",si+":"+h+":"+count);c.put("sheet",si);c.put("sheetName",s.getSheetName());c.put("header",h);c.put("headerRows",count);c.put("suggestedMapping",mapping);c.put("combinedHeaders",labels);c.put("requiredMatched",matched);c.put("confidence",matched==5&&data?"HIGH":"MEDIUM");c.put("reasons",reasons);c.put("warnings",warnings);c.put("lengthUnit",length);c.put("weightUnit",weight);c.put("weightBasis",basis);c.put("requiresConfirmation",true);c.put("dataConfirmed",data);candidates.add(c);
            }
        }
        // Vertical merged labels can make the bottom header appear standalone. Keep its complete context.
        var deduplicated=new LinkedHashMap<String,Map<String,Object>>();
        for(var candidate:candidates){String key=candidate.get("sheet")+":"+((int)candidate.get("header")+(int)candidate.get("headerRows"))+":"+candidate.get("suggestedMapping");var previous=deduplicated.get(key);if(previous==null||(int)candidate.get("headerRows")>(int)previous.get("headerRows"))deduplicated.put(key,candidate);}
        candidates=new ArrayList<>(deduplicated.values());
        candidates.sort(Comparator.<Map<String,Object>>comparingInt(c->(int)c.get("requiredMatched")).reversed().thenComparing(c->!(boolean)c.get("dataConfirmed")));
        var result=new LinkedHashMap<String,Object>();boolean auto=false;String recommended=null;
        if(!candidates.isEmpty()) {
            var top=candidates.get(0);long equal=candidates.stream().filter(c->Objects.equals(c.get("requiredMatched"),top.get("requiredMatched"))&&Objects.equals(c.get("dataConfirmed"),top.get("dataConfirmed"))).count();
            auto=equal==1&&(int)top.get("requiredMatched")==5&&(boolean)top.get("dataConfirmed");if(auto)recommended=(String)top.get("id");
        }
        result.put("candidates",candidates);result.put("recommendedCandidateId",recommended);result.put("autoSelectable",auto);
        result.put("warnings",List.of(auto?"명확한 헤더 후보를 자동 선택했습니다. 단위·중량 기준과 미리보기를 확인한 뒤 가져오세요":"후보가 없거나 모호합니다. 시트/헤더를 직접 선택하세요", "자동 탐지는 각 시트 첫 30행의 헤더만 조사하며 값 크기로 단위를 추측하지 않습니다"));return result;
    }
    private boolean hasData(Sheet s,int start,Map<String,Integer> map) {
        if(!REQUIRED.stream().allMatch(map::containsKey))return false;
        var fmt=new DataFormatter();
        for(int r=start;r<=Math.min(s.getLastRowNum(),start+4);r++) {
            var row=s.getRow(r);if(row==null)continue;boolean valid=!fmt.formatCellValue(row.getCell(map.get("itemNo"))).isBlank();
            for(String key:List.of("length","width","height","grossWeight"))try{double v=Double.parseDouble(fmt.formatCellValue(row.getCell(map.get(key))).replace(",","").trim());valid&=Double.isFinite(v)&&v>0;}catch(NumberFormatException e){valid=false;}
            if(valid)return true;
        }return false;
    }
    private String units(List<String> labels,Map<String,Integer> mapping,List<String> keys,boolean length) {
        var found=new HashSet<String>();boolean unknown=false;
        for(String key:keys)if(mapping.containsKey(key)) {
            String value=java.text.Normalizer.normalize(labels.get(mapping.get(key)),java.text.Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
            var local=new HashSet<String>();for(String unit:length?List.of("mm","cm","m"):List.of("kg","ton")) {
                if(Pattern.compile("(?<![a-z])"+unit+"(?![a-z])").matcher(value).find()||unit.equals("ton")&&Pattern.compile("(?<![a-z])(tons|tonnes|t)(?![a-z])|톤").matcher(value).find())local.add(unit);
            }
            if(local.size()!=1)unknown=true;found.addAll(local);
        }return !unknown&&found.size()==1?found.iterator().next():null;
    }
}
