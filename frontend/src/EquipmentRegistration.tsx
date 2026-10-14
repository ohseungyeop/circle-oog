import {useState} from 'react';
import {Alert,Button,Form,Input,InputNumber,Modal,Switch,Select} from 'antd';
import type {EquipmentSpecification} from './EquipmentEditor';

export type EquipmentRegistrationValue={code:string;specification:Omit<EquipmentSpecification,'code'>;usableLengthRatio:number;planningWeightRatio:number;maxOverWidth:number;maxOverHeight:number;evidence:string};
export type ReferenceCandidate=Omit<EquipmentSpecification,'version'>;
export function EquipmentRegistration({disabled,save,loadReferences}:{disabled:boolean;save:(value:EquipmentRegistrationValue)=>Promise<unknown>;loadReferences?:()=>Promise<{catalog:{candidates:ReferenceCandidate[]}}>}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const [form]=Form.useForm();
 const [references,setReferences]=useState<ReferenceCandidate[]>([]);
 async function submit(v:Record<string,unknown>){setBusy(true);setError('');try{const {code,evidence,usableLengthRatio,planningWeightRatio,maxOverWidth,maxOverHeight,...specification}=v;await save({code,evidence,usableLengthRatio,planningWeightRatio,maxOverWidth,maxOverHeight,specification:{...specification,version:0}} as EquipmentRegistrationValue);setOpen(false);form.resetFields();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <><Button disabled={disabled} onClick={()=>{setError('');setOpen(true);}}>장비 타입 등록</Button><Modal title="장비 타입·모델 등록" open={open} onCancel={()=>{if(!busy)setOpen(false);}} onOk={()=>form.submit()} confirmLoading={busy} cancelButtonProps={{disabled:busy}} maskClosable={!busy}>
 <Alert type="info" showIcon message="확인된 제원과 기본 계획 규칙을 함께 등록합니다" description="동일 타입도 선사·모델·FR 접힘 상태가 다르면 별도 코드를 사용하세요. 입력값은 새 분석과 계획에 사용됩니다. 냉동·탱크의 전용 운용 적합성은 계산하지 않습니다."/>
 {loadReferences&&<><Button disabled={busy} onClick={async()=>{setError('');try{const r=await loadReferences();setReferences(r.catalog.candidates);}catch(e){setError(String(e));}}}>원본 참고 제원 불러오기</Button>{references.length>0&&<><Alert type="warning" message="선사·모델·실제 명판이 확인되지 않은 일반 참고 표입니다" description="선택하면 물리 제원만 복사합니다. 실제 확인 근거와 계획 비율은 비워 두며 직접 확인 후 입력해야 합니다. 기존 DB를 자동 변경하지 않습니다."/><Select aria-label="원본 참고 장비" style={{width:'100%'}} placeholder="참고 장비 선택" options={references.map(r=>({value:r.code,label:r.code+' · '+r.name}))} onChange={code=>{const r=references.find(v=>v.code===code)!;form.setFieldsValue({code:r.code,name:r.name,length:r.length,width:r.width,height:r.height,payload:r.payload,openWidth:r.openWidth,openHeight:r.openHeight,usableLengthRatio:undefined,planningWeightRatio:undefined,maxOverWidth:0,maxOverHeight:0,evidence:undefined});}}/></>}</>}
 {error&&<Alert type="error" message={error}/>}
 <Form form={form} layout="vertical" onFinish={submit} disabled={busy} initialValues={{openWidth:false,openHeight:false,maxOverWidth:0,maxOverHeight:0}}>
 <Form.Item name="code" label="장비 코드" rules={[{required:true,pattern:/^[A-Z0-9][A-Z0-9_-]{1,29}$/,message:'대문자·숫자·_·- 2~30자'}]}><Input maxLength={30}/></Form.Item>
 <Form.Item name="name" label="장비명 · 선사/모델/상태" rules={[{required:true,whitespace:true,max:100}]}><Input maxLength={100}/></Form.Item>
 {([['length','유효 적재 길이 mm',100000],['width','유효 적재 폭 mm',30000],['height','유효 적재 높이 mm',30000],['payload','Payload kg',1000000],['usableLengthRatio','계획 길이 비율',1],['planningWeightRatio','계획 중량 비율',1]] as const).map(([name,label,max])=><Form.Item key={name} name={name} label={label} rules={[{required:true}]}><InputNumber aria-label={label} min={max===1?.1:.001} max={max} style={{width:'100%'}}/></Form.Item>)}
 <Form.Item name="openWidth" label="측면 개방" valuePropName="checked"><Switch/></Form.Item>
 <Form.Item name="openHeight" label="상부 개방" valuePropName="checked"><Switch/></Form.Item>
 {([['maxOverWidth','폭 초과 허용 mm'],['maxOverHeight','높이 초과 허용 mm']] as const).map(([name,label])=><Form.Item key={name} name={name} label={label} rules={[{required:true}]}><InputNumber min={0} max={30000}/></Form.Item>)}
 <Form.Item name="evidence" label="제원·규칙 확인 근거 (출처/명판/모델/상태)" rules={[{required:true,whitespace:true,max:2000}]}><Input.TextArea maxLength={2000}/></Form.Item>
 </Form></Modal></>;
}
