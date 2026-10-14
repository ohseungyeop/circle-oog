package com.circle.oog;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.util.CellRangeAddress;
import javax.swing.text.MutableAttributeSet;
import javax.swing.text.html.HTML;
import javax.swing.text.html.HTMLEditorKit;
import javax.swing.text.html.parser.ParserDelegator;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.util.*;

/** Reads binary Excel and inert table-only HTML exports commonly named .xls. No URL is opened. */
public final class ExcelWorkbookReader {
 private static final int MAX_BYTES=15*1024*1024,MAX_ROWS=10031,MAX_COLS=80;
 private ExcelWorkbookReader(){}
 public static Workbook read(InputStream input)throws IOException {
  byte[] bytes=input.readNBytes(MAX_BYTES+1);if(bytes.length>MAX_BYTES)throw new IOException("Excel 파일은 최대 15MB입니다");
  String probe=new String(bytes,0,Math.min(bytes.length,65536),StandardCharsets.ISO_8859_1).stripLeading().toLowerCase(Locale.ROOT);
  boolean htmlPrefix=probe.startsWith("<")||probe.startsWith("ï»¿");
  if(!htmlPrefix||!probe.contains("<table"))return WorkbookFactory.create(new ByteArrayInputStream(bytes));
  String html;try{html=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();}catch(CharacterCodingException e){html=Charset.forName("MS949").newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();}
  var workbook=new XSSFWorkbook();var parser=new TableParser(workbook);
  try{new ParserDelegator().parse(new StringReader(html),parser,true);if(workbook.getNumberOfSheets()==0||parser.cells==0)throw new IllegalArgumentException("HTML 표에 가져올 셀이 없습니다");return workbook;}
  catch(RuntimeException|IOException e){workbook.close();if(e instanceof IOException io)throw io;throw new IOException(e.getMessage(),e);}
 }
 private static final class TableParser extends HTMLEditorKit.ParserCallback {
  final XSSFWorkbook workbook;Sheet sheet;int tableDepth,row=-1,col,skipDepth,cells;boolean inCell;StringBuilder text;int rowSpan,colSpan;Set<Long> occupied=new HashSet<>();
  TableParser(XSSFWorkbook workbook){this.workbook=workbook;}
  @Override public void handleStartTag(HTML.Tag tag,MutableAttributeSet attrs,int position){
   if(tag==HTML.Tag.SCRIPT||tag==HTML.Tag.STYLE){skipDepth++;return;}
   if(skipDepth>0)return;
   if(tag==HTML.Tag.TABLE){if(++tableDepth==1){if(workbook.getNumberOfSheets()>=50)throw new IllegalArgumentException("HTML 표는 최대 50개입니다");sheet=workbook.createSheet("Table "+(workbook.getNumberOfSheets()+1));row=-1;col=0;occupied.clear();}return;}
   if(tableDepth!=1)return;
   if(tag==HTML.Tag.TR){finishCell();if(++row>=MAX_ROWS)throw new IllegalArgumentException("HTML 표 행 수 한도 초과");col=0;return;}
   if(tag==HTML.Tag.TD||tag==HTML.Tag.TH){finishCell();if(row<0)row=0;while(occupied.contains(key(row,col)))col++;colSpan=span(attrs,HTML.Attribute.COLSPAN,MAX_COLS);rowSpan=span(attrs,HTML.Attribute.ROWSPAN,MAX_ROWS);if(col+colSpan>MAX_COLS||row+rowSpan>MAX_ROWS)throw new IllegalArgumentException("HTML 표 행/열 병합 한도 초과");inCell=true;text=new StringBuilder();}
  }
  @Override public void handleEndTag(HTML.Tag tag,int position){
   if(tag==HTML.Tag.SCRIPT||tag==HTML.Tag.STYLE){skipDepth=Math.max(0,skipDepth-1);return;}
   if(skipDepth>0)return;
   if(tag==HTML.Tag.TABLE){if(tableDepth==1)finishCell();tableDepth=Math.max(0,tableDepth-1);return;}
   if(tableDepth==1&&(tag==HTML.Tag.TD||tag==HTML.Tag.TH||tag==HTML.Tag.TR))finishCell();
  }
  @Override public void handleSimpleTag(HTML.Tag tag,MutableAttributeSet attrs,int position){if(tag==HTML.Tag.BR&&inCell&&skipDepth==0)append("\n");}
  @Override public void handleText(char[] data,int position){if(inCell&&skipDepth==0)append(new String(data));}
  void append(String value){if(text.length()+value.length()>32767)throw new IllegalArgumentException("HTML 셀 길이 한도 초과");text.append(value);}
  void finishCell(){if(!inCell)return;inCell=false;if(cells>=200000)throw new IllegalArgumentException("HTML 표는 최대 200,000개 셀입니다");var r=sheet.getRow(row);if(r==null)r=sheet.createRow(row);r.createCell(col,CellType.STRING).setCellValue(text.toString().trim());cells++;
   for(int rr=row;rr<row+rowSpan;rr++)for(int cc=col;cc<col+colSpan;cc++)if(!occupied.add(key(rr,cc)))throw new IllegalArgumentException("HTML 병합 셀이 겹칩니다");
   if(rowSpan>1||colSpan>1)sheet.addMergedRegion(new CellRangeAddress(row,row+rowSpan-1,col,col+colSpan-1));col+=colSpan;
  }
  long key(int r,int c){return ((long)r)*MAX_COLS+c;}
  int span(MutableAttributeSet attrs,HTML.Attribute key,int max){Object raw=attrs.getAttribute(key);if(raw==null)return 1;try{int value=Integer.parseInt(raw.toString());if(value<1||value>max)throw new NumberFormatException();return value;}catch(NumberFormatException e){throw new IllegalArgumentException("HTML 병합 범위 오류");}}
 }
}
