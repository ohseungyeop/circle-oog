package com.circle.oog;

import com.fasterxml.jackson.databind.JsonNode;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.awt.Color;
import java.io.*;
import java.nio.file.*;
import java.util.*;

/** OOG owns the PDF layout. The configured installed font is subset embedded, never copied to source. */
final class PlanningPdfRenderer implements AutoCloseable {
    private static final float WIDTH=842,HEIGHT=595,MARGIN=40;
    private final PDDocument doc;private final PDType0Font font;private PDPageContentStream stream;private float y;private String footer="PRE_PLAN";
    private PlanningPdfRenderer(PDDocument doc,PDType0Font font){this.doc=doc;this.font=font;}
    static byte[] report(List<String> lines,Path fontPath)throws IOException {
        if(!Files.isRegularFile(fontPath))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"PDF 한글 글꼴을 설정하세요 (OOG_PDF_FONT)");
        try(var doc=new PDDocument();var source=Files.newInputStream(fontPath);var out=new ByteArrayOutputStream()){
            try(var r=new PlanningPdfRenderer(doc,PDType0Font.load(doc,source,true))){r.footer="PRE_QUOTE";r.page();for(int i=0;i<lines.size();i++)r.line(lines.get(i),i==0?19:10,i==0?new Color(23,49,69):Color.BLACK);}
            doc.save(out);return out.toByteArray();
        }
    }
    static byte[] render(UUID id,String project,String created,JsonNode result,JsonNode input,Path fontPath)throws IOException {
        if(!Files.isRegularFile(fontPath))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"PDF 한글 글꼴을 설정하세요 (OOG_PDF_FONT)");
        try(var doc=new PDDocument();var fontInput=Files.newInputStream(fontPath);var out=new ByteArrayOutputStream()) {
            var font=PDType0Font.load(doc,fontInput,true);
            try(var r=new PlanningPdfRenderer(doc,font)) {
                r.page();r.line("CIRCLE OOG | CLP 보고서",20,new Color(23,49,69));
                r.line("PRE_PLAN - 공학 검토 및 선사 승인 전 사전 계획",12,new Color(150,60,25));
                r.line("프로젝트: "+project,11,Color.BLACK);r.line("계획 ID: "+id,10,Color.BLACK);r.line("저장 일시: "+created,10,Color.BLACK);
                r.line("원본 저장 스냅샷 기준 | 치수 mm / 중량 kg | 계산 결과는 승인 완료를 뜻하지 않습니다.",10,Color.BLACK);
                long pieces=0;double gross=0,cbm=0;for(var cargo:input.path("cargos")){long qty=cargo.path("quantity").asLong(1);pieces+=qty;gross+=cargo.path("grossWeight").asDouble()*qty;cbm+=cargo.path("length").asDouble()*cargo.path("width").asDouble()*cargo.path("height").asDouble()*qty/1_000_000_000d;}
                r.line("입력 화물 "+input.path("cargos").size()+"품목 / "+pieces+"개 | 총 중량 "+String.format(Locale.ROOT,"%.2f",gross)+" kg | 포장 체적 "+String.format(Locale.ROOT,"%.3f",cbm)+" CBM",10,Color.BLACK);
                r.line("알고리즘: "+result.path("algorithm").asText("saved scenario"),10,Color.BLACK);
                JsonNode selection=input.has("ruleSelection")?input.path("ruleSelection"):result.path("ruleSelection");
                if(!selection.isMissingNode()){r.line("선사 / 규칙 선택 근거 (저장 당시)",13,new Color(23,49,69));r.line(selection.toString(),9,Color.DARK_GRAY);}
                if(result.has("revision")){r.line("수동 개정 / 원본 계획 추적",13,new Color(23,49,69));r.line(result.path("revision").toString(),9,Color.DARK_GRAY);}
                if(result.has("warnings")){r.line("전체 계획 경고",13,new Color(150,60,25));for(var warning:result.path("warnings"))r.line("- "+warning.asText(),10,Color.DARK_GRAY);}
                r.line("저장된 계획 규칙",13,new Color(23,49,69));
                for(var rule:input.path("rules"))r.line(rule.toString(),9,Color.DARK_GRAY);
                var scenarios=result.path("scenarios");List<JsonNode> values=new ArrayList<>();if(scenarios.isArray())scenarios.forEach(values::add);else values.add(result);
                int index=0;for(var scenario:values)r.scenario(index++,scenario);
            }
            doc.getDocumentInformation().setTitle("Circle OOG saved CLP PRE_PLAN");doc.save(out);return out.toByteArray();
        }
    }
    private void scenario(int index,JsonNode scenario)throws IOException {
        page();line("시나리오 "+(index+1)+" | "+scenario.path("objective").asText(),17,new Color(23,49,69));
        int assigned=0;for(var box:scenario.path("containers"))assigned+=box.path("assignments").size();
        line("PRE_PLAN | 장비 "+scenario.path("containers").size()+"대 | 배정 "+assigned+"개 | 미배정 "+scenario.path("unassigned").size()+"개",11,Color.BLACK);
        if(scenario.has("revision"))line("수정 이력: "+scenario.path("revision").toString(),9,Color.DARK_GRAY);
        line("경고 / 검토 사항",13,new Color(150,60,25));
        for(var warning:scenario.path("warnings"))line("- "+warning.asText(),10,Color.DARK_GRAY);
        line("미배정 화물 (계획에서 제외되지 않음)",13,new Color(150,60,25));
        if(scenario.path("unassigned").isEmpty())line("없음",10,Color.BLACK);
        for(var cargo:scenario.path("unassigned"))line(cargo.path("itemNo").asText()+" #"+cargo.path("piece").asText()+" | "+cargo.path("reason").asText(),10,Color.BLACK);
        for(var box:scenario.path("containers")) {
            page();line("시나리오 "+(index+1)+" | "+scenario.path("objective").asText()+" | 장비 #"+box.path("number").asText()+" "+box.path("equipment").asText(),15,new Color(23,49,69));
            line("PRE_PLAN | 물리치수 "+dimension(box)+" | 계획허용길이 "+number(box,"usableLength")+" mm | 중량 "+number(box,"weight")+" / "+number(box,"payloadLimit")+" kg | 규칙 버전 "+box.path("ruleVersion").asText(),9,Color.BLACK);
            line("Top / Side / Front 개략도 - 투영 축별 축척; 색상은 화물 구분, 정밀 좌표는 아래 목록 기준",9,Color.DARK_GRAY);
            diagram(box,0,1,40,285,235,175,"TOP (X / Y)");diagram(box,0,2,303,285,235,175,"SIDE (X / Z)");diagram(box,1,2,566,285,235,175,"FRONT (Y / Z)");
            y=257;line("배정 화물 - 좌표 및 포장 치수 (mm), 개당 중량 (kg)",12,new Color(23,49,69));
            for(var a:box.path("assignments")) {
                line(a.path("itemNo").asText()+" #"+a.path("piece").asText()+" | 좌표 ("+number(a,"x")+", "+number(a,"y")+", "+number(a,"z")+") | 치수 "+dimension(a)+" | "+number(a,"weight")+" kg | 회전 "+a.path("rotated").asBoolean()+" | 고정 "+a.path("locked").asBoolean(),9,Color.BLACK);
            }
        }
    }
    private void diagram(JsonNode box,int horizontal,int vertical,float x,float bottom,float width,float height,String label)throws IOException {
        String[] dims={"length","width","height"},pos={"x","y","z"};double minX=0,minY=0,maxX=Math.max(1,box.path(dims[horizontal]).asDouble()),maxY=Math.max(1,box.path(dims[vertical]).asDouble());
        for(var a:box.path("assignments")){minX=Math.min(minX,a.path(pos[horizontal]).asDouble());minY=Math.min(minY,a.path(pos[vertical]).asDouble());maxX=Math.max(maxX,a.path(pos[horizontal]).asDouble()+a.path(dims[horizontal]).asDouble());maxY=Math.max(maxY,a.path(pos[vertical]).asDouble()+a.path(dims[vertical]).asDouble());}
        text(label,x,bottom+height+14,10,Color.BLACK);stream.setStrokingColor(new Color(80,100,110));stream.setLineWidth(.8f);
        stream.addRect(x+(float)(-minX/(maxX-minX)*width),bottom+(float)(-minY/(maxY-minY)*height),(float)(box.path(dims[horizontal]).asDouble()/(maxX-minX)*width),(float)(box.path(dims[vertical]).asDouble()/(maxY-minY)*height));stream.stroke();
        Color[] colors={new Color(172,207,218),new Color(204,218,164),new Color(232,194,149),new Color(205,183,218)};int i=0;
        for(var a:box.path("assignments")) {
            float ax=x+(float)((a.path(pos[horizontal]).asDouble()-minX)/(maxX-minX)*width),ay=bottom+(float)((a.path(pos[vertical]).asDouble()-minY)/(maxY-minY)*height),aw=(float)(a.path(dims[horizontal]).asDouble()/(maxX-minX)*width),ah=(float)(a.path(dims[vertical]).asDouble()/(maxY-minY)*height);
            stream.setNonStrokingColor(colors[i++%colors.length]);stream.addRect(ax,ay,aw,ah);stream.fill();stream.setStrokingColor(Color.DARK_GRAY);stream.addRect(ax,ay,aw,ah);stream.stroke();
            // Clip labels to the cargo rectangle; full item names remain in the assignment list.
            if(aw>24&&ah>14){stream.saveGraphicsState();stream.addRect(ax,ay,aw,ah);stream.clip();text(a.path("itemNo").asText()+" #"+a.path("piece").asText(),ax+3,ay+ah-11,8,Color.BLACK);stream.restoreGraphicsState();}
        }
        text("범위 "+Math.round(minX)+".."+Math.round(maxX)+" / "+Math.round(minY)+".."+Math.round(maxY)+" mm",x,bottom-14,8,Color.DARK_GRAY);
    }
    private void line(String value,float size,Color color)throws IOException {
        String clean=clean(value);StringBuilder part=new StringBuilder();
        for(int offset=0;offset<clean.length();) {int cp=clean.codePointAt(offset);String next=new String(Character.toChars(cp));offset+=Character.charCount(cp);if(font.getStringWidth(part+next)/1000*size>WIDTH-2*MARGIN&&!part.isEmpty()){writeLine(part.toString(),size,color);part.setLength(0);}part.append(next);}
        if(!part.isEmpty())writeLine(part.toString(),size,color);else writeLine("",size,color);
        y-=4;
    }
    private String clean(String text)throws IOException {StringBuilder out=new StringBuilder();for(int i=0;i<text.length();) {int cp=text.codePointAt(i);i+=Character.charCount(cp);if(cp<32){out.append(' ');continue;}try{String ch=new String(Character.toChars(cp));font.getStringWidth(ch);out.append(ch);}catch(IllegalArgumentException ex){out.append('?');}}return out.toString();}
    private void writeLine(String value,float size,Color color)throws IOException {if(y<size+50)page();text(value,MARGIN,y,size,color);y-=size+5;}
    private void text(String value,float x,float y,float size,Color color)throws IOException {stream.beginText();stream.setFont(font,size);stream.setNonStrokingColor(color);stream.newLineAtOffset(x,y);stream.showText(clean(value));stream.endText();}
    private void page()throws IOException {if(stream!=null)stream.close();var p=new PDPage(new PDRectangle(WIDTH,HEIGHT));doc.addPage(p);stream=new PDPageContentStream(doc,p);y=HEIGHT-MARGIN;stream.setStrokingColor(new Color(215,222,226));stream.moveTo(MARGIN,30);stream.lineTo(WIDTH-MARGIN,30);stream.stroke();text("CIRCLE OOG | "+footer+" | "+doc.getNumberOfPages(),MARGIN,16,8,Color.DARK_GRAY);}
    private static String number(JsonNode value,String key){return value.path(key).asText("0");}
    private static String dimension(JsonNode value){return number(value,"length")+" x "+number(value,"width")+" x "+number(value,"height");}
    @Override public void close()throws IOException {if(stream!=null)stream.close();}
}
