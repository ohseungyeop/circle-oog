package com.circle.oog;

import com.fasterxml.jackson.databind.JsonNode;
import org.apache.poi.ss.usermodel.*;
import java.util.*;

/** Suggestions never replace the user's explicit column/unit choices. */
public class ImportMappingService {
    public Map<String,Object> suggest(Sheet sheet,int header,int headerRows) {
        checkHeaders(sheet,header,headerRows);
        var fmt=new DataFormatter();var headers=new ArrayList<String>();var candidates=new LinkedHashMap<String,List<Integer>>();
        int columns=0;for(int r=header;r<header+headerRows;r++) if(sheet.getRow(r)!=null) columns=Math.max(columns,sheet.getRow(r).getLastCellNum());
        for(int c=0;c<Math.min(columns,80);c++) {
            String top=cell(sheet,header,c,fmt),bottom=headerRows==2?cell(sheet,header+1,c,fmt):"";
            String label=(top+" "+bottom).trim();headers.add(label);String n=normalize(label),t=normalize(top);
            String key=null;
            if(n.matches(".*(caseno|boxno|itemno|itemnumber|번호).*" )||n.equals("no")) key="itemNo";
            else if(n.matches(".*(description|descripton|itemname|품목|품명).*")) key="description";
            else if(n.matches(".*(qty|quantity|수량).*")) key="quantity";
            else if(t.contains("net")||t.contains("순중량")||(!t.contains("gross")&&(n.contains("netweight")||t.startsWith("nw")||normalize(bottom).startsWith("nw")))) key="netWeight";
            else if(n.contains("gross")||n.contains("gw")||n.contains("총중량")) key="grossWeight";
            else {
                String dimension=n.contains("length")||n.contains("길이")||n.contains("가로")||n.matches("l(mm|cm|m)?")?"Length":
                    n.contains("width")||n.contains("폭")||n.matches("w(mm|cm|m)?")?"Width":n.contains("height")||n.contains("높이")||n.matches("h(mm|cm|m)?")?"Height":null;
                if(dimension!=null) {
                    // Customer sheets use Package Dimension for the bare item and Box Dimension for packed size.
                    boolean original=n.contains("original")||n.contains("bare")||n.contains("원치수")||n.contains("packagedimension");
                    key=original?"original"+dimension:dimension.substring(0,1).toLowerCase(Locale.ROOT)+dimension.substring(1);
                }
            }
            if(key!=null) candidates.computeIfAbsent(key,k->new ArrayList<>()).add(c);
        }
        var mapping=new LinkedHashMap<String,Integer>();var warnings=new ArrayList<String>();
        candidates.forEach((key,cols)->{if(cols.size()==1) mapping.put(key,cols.get(0));else warnings.add(key+": 여러 후보 컬럼 "+cols+" 중 직접 선택하세요");});
        warnings.add("컬럼 제안을 확인하고 길이/중량 단위 및 개당/행합계 중량 기준을 직접 선택하세요");
        if(mapping.containsKey("originalLength")) warnings.add("고객 샘플의 Package Dimension은 원치수, Box Dimension은 포장치수로 제안합니다. 파일의 실제 의미를 확인하세요");
        return Map.of("suggestedMapping",mapping,"combinedHeaders",headers,"suggestionsWarnings",warnings);
    }
    private String cell(Sheet s,int r,int c,DataFormatter f) {
        for(var region:s.getMergedRegions()) if(region.isInRange(r,c)) {r=region.getFirstRow();c=region.getFirstColumn();break;}
        return s.getRow(r)==null?"":f.formatCellValue(s.getRow(r).getCell(c));
    }
    private String normalize(String value) {return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9가-힣]","");}
    public void checkHeaders(Sheet s,int header,int count) {
        if((count!=1&&count!=2)||header<0||header+count-1>s.getLastRowNum()) throw new IllegalArgumentException("헤더 행은 시트 내 1행 또는 2행이어야 합니다");
    }
    public Cargo read(Row row,JsonNode map,double lm,double wm,String basis,UUID projectId) {
        if(!Set.of("PER_PIECE","ROW_TOTAL").contains(basis)) throw new IllegalArgumentException("중량 기준은 PER_PIECE 또는 ROW_TOTAL이어야 합니다");
        var fmt=new DataFormatter();var c=new Cargo();c.projectId=projectId;
        c.itemNo=fmt.formatCellValue(row.getCell(column(map,"itemNo",true))).trim();
        int desc=column(map,"description",false);c.description=desc<0?"":fmt.formatCellValue(row.getCell(desc));
        if(c.description.length()>500) throw new IllegalArgumentException("품명/설명은 최대 500자입니다");
        int quantityColumn=column(map,"quantity",basis.equals("ROW_TOTAL"));
        double qty=quantityColumn<0?1:number(row,map,"quantity",fmt,true);
        if(!Double.isFinite(qty)||qty!=Math.floor(qty)||qty<1||qty>10000) throw new IllegalArgumentException("수량은 1~10,000의 정수여야 합니다");c.quantity=(int)qty;
        c.length=number(row,map,"length",fmt,true)*lm;c.width=number(row,map,"width",fmt,true)*lm;c.height=number(row,map,"height",fmt,true)*lm;
        c.grossWeight=number(row,map,"grossWeight",fmt,true)*wm;c.netWeight=number(row,map,"netWeight",fmt,false)*wm;
        if(basis.equals("ROW_TOTAL")) {c.grossWeight/=qty;c.netWeight/=qty;}
        c.originalLength=number(row,map,"originalLength",fmt,false)*lm;c.originalWidth=number(row,map,"originalWidth",fmt,false)*lm;c.originalHeight=number(row,map,"originalHeight",fmt,false)*lm;
        if(!Double.isFinite(c.netWeight)||c.netWeight<0||!Double.isFinite(c.originalLength)||!Double.isFinite(c.originalWidth)||!Double.isFinite(c.originalHeight)||c.originalLength<0||c.originalWidth<0||c.originalHeight<0||c.originalLength>100000||c.originalWidth>30000||c.originalHeight>30000) throw new IllegalArgumentException("원치수/순중량 범위 오류");
        boolean anyOriginal=c.originalLength>0||c.originalWidth>0||c.originalHeight>0;
        if(anyOriginal&&(c.originalLength<=0||c.originalWidth<=0||c.originalHeight<=0)) throw new IllegalArgumentException("원치수는 길이/폭/높이를 모두 입력하세요");
        return c;
    }
    public int column(JsonNode map,String key,boolean required) {
        var node=map.get(key);if(node==null||node.isNull()) {if(required) throw new IllegalArgumentException("필수 컬럼 매핑 누락: "+key);return -1;}
        if(!node.isIntegralNumber()||!node.canConvertToInt()||node.asInt() < -1||node.asInt()>79||(required&&node.asInt()<0)) throw new IllegalArgumentException("컬럼 매핑 오류: "+key);
        return node.asInt();
    }
    private double number(Row row,JsonNode map,String key,DataFormatter fmt,boolean required) {
        int col=column(map,key,required);if(col<0)return 0;
        String value=fmt.formatCellValue(row.getCell(col)).replace(",","").trim();
        if(value.isBlank()) {if(required)throw new IllegalArgumentException("필수 값 누락: "+key);return 0;}
        try {double n=Double.parseDouble(value);if(!Double.isFinite(n))throw new NumberFormatException();return n;}catch(NumberFormatException e){throw new IllegalArgumentException("숫자 오류: "+key);}
    }
}
