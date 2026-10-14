import {useEffect,useState} from 'react';
import {Alert,Button,Card,Form,Input,Space,Table,Tag} from 'antd';
import type {Api} from './ProjectHistory';
import {EngineeringEvidencePanel} from './EngineeringEvidencePanel';
import {EngineeringChecksPanel} from './EngineeringChecksPanel';
import {MeasurementReconciliationPanel} from './MeasurementReconciliationPanel';
const labels:Record<string,string>={PACKED_DIMENSIONS:'실제 포장 치수·중량',COG_MEASURED:'실측 무게중심',SUPPORT_POINTS:'지지점',CONTACT_AREA:'접촉 면적',POINT_LOAD:'집중 하중',LASHING_POINTS:'라싱 지점',LASHING_MATERIAL_AND_ANGLES:'라싱 재료·각도',CARRIER_APPROVAL:'선사 확인'};
type Data={automatic:{requiredChecks:string[];warnings:string[]};history:{id:string;status:string;created_at:string;detail:{reason:string;observations:Record<string,string>}}[]};
export function EngineeringReviewPanel({api,projectId,planId,canRecord,download}:{api:Api;projectId:string;planId:string;canRecord:boolean;download?:(path:string,name:string)=>Promise<void>}){
 const [data,setData]=useState<Data>();const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);const [form]=Form.useForm();
 const path=`/projects/${projectId}/plans/${planId}/engineering`;
 useEffect(()=>{const abort=new AbortController();setData(undefined);api<Data>(path,{signal:abort.signal}).then(v=>{if(!abort.signal.aborted)setData(v);}).catch(e=>{if(!abort.signal.aborted)setError(String(e));});return()=>abort.abort();},[path,revision]);
 return <Card title="자동 점검과 수동 공학 검토 기록" style={{marginTop:20}}>
 <Alert type="warning" message="PRE_PLAN · 누락 점검과 검토 메모" description="자동 점검은 미배정과 포장 추정값을 표시합니다. 수치 계산과 독립 내부 검토 결정은 공학 계산 패널에서 진행하세요. 메모를 모두 작성해도 선사 승인으로 전환되지 않습니다." showIcon/>
 {error&&<Alert type="error" message={error}/>}<Space wrap style={{marginTop:12}}>{data?.automatic.warnings.map(w=><Tag key={w} color="orange">{w}</Tag>)}</Space>
 {canRecord&&<Form form={form} layout="vertical" onFinish={async value=>{setBusy(true);setError('');try{const observations=Object.fromEntries(Object.entries(value.observations||{}).filter(([,v])=>typeof v==='string'&&v.trim()));await api(path,{method:'POST',body:JSON.stringify({observations,reason:value.reason})});form.resetFields();setRevision(v=>v+1);}catch(e){setError(String(e));}finally{setBusy(false);}}}>
 {data?.automatic.requiredChecks.map(key=><Form.Item key={key} name={['observations',key]} label={labels[key]}><Input.TextArea maxLength={2000} placeholder="확인한 자료·수치·검토 근거를 기록하세요. 미확인은 비워두세요."/></Form.Item>)}
 <Form.Item name="reason" label="검토 메모" rules={[{required:true,whitespace:true,max:2000}]}><Input.TextArea/></Form.Item><Button htmlType="submit" type="primary" loading={busy}>검토 기록 저장</Button></Form>}
 <Table rowKey="id" dataSource={data?.history||[]} pagination={{pageSize:5}} columns={[{title:'기록 시각',dataIndex:'created_at'},{title:'상태',dataIndex:'status'},{title:'근거',render:(_,v)=><details><summary>{v.detail.reason}</summary>{Object.entries(v.detail.observations).map(([key,value])=><p key={key}>{labels[key]}: {value}</p>)}</details>}]} />
 <EngineeringEvidencePanel key={path} api={api} projectId={projectId} planId={planId} canRecord={canRecord} download={download} onSaved={()=>setRevision(v=>v+1)}/><MeasurementReconciliationPanel key={path+'/measurements'} api={api} projectId={projectId} planId={planId} canRecord={canRecord} version={revision}/><EngineeringChecksPanel key={path+'/checks'} api={api} projectId={projectId} planId={planId} canRecord={canRecord}/></Card>;
}
