import {useEffect,useState} from 'react';
import {Alert,Button,Form,Input,InputNumber,Modal,Switch} from 'antd';

export type EquipmentSpecification={code:string;name:string;length:number;width:number;height:number;payload:number;openWidth:boolean;openHeight:boolean;version:number};
type Props={equipment:EquipmentSpecification;disabled?:boolean;save:(value:EquipmentSpecification)=>Promise<unknown>};
export function EquipmentEditor({equipment,disabled=false,save}:Props){
 const [open,setOpen]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [form]=Form.useForm<EquipmentSpecification>();
 useEffect(()=>{if(open)form.setFieldsValue(equipment);},[equipment,form,open]);
 async function submit(values:EquipmentSpecification){setSaving(true);setError('');try{await save({...values,code:equipment.code,version:equipment.version});setOpen(false);}catch(reason){setError(reason instanceof Error?reason.message:String(reason));}finally{setSaving(false);}}
 return <><Button disabled={disabled} onClick={()=>{setError('');setOpen(true);}}>제원 편집</Button><Modal title={`${equipment.code} · 물리 제원 (mm / kg)`} open={open} onCancel={()=>{if(!saving)setOpen(false);}} onOk={()=>form.submit()} confirmLoading={saving} cancelButtonProps={{disabled:saving}} maskClosable={!saving}>
 <Alert type="info" showIcon message="장비 물리 제원을 변경합니다" description="계획 허용 비율·초과 허용치는 계획 규칙에서 별도로 설정하세요. 저장된 CLP 사본은 기존 제원을 유지하며 새 분석·계획부터 변경 제원을 사용합니다."/>
 {error&&<Alert style={{marginTop:12}} type="error" showIcon message={error}/>}
 <Form form={form} layout="vertical" onFinish={submit} disabled={saving} style={{marginTop:16}}>
 <Form.Item name="name" label="장비명" rules={[{required:true,whitespace:true,max:100}]}><Input maxLength={100}/></Form.Item>
 {([['length','길이 (mm)',100000],['width','폭 (mm)',30000],['height','높이 (mm)',30000],['payload','Payload (kg)',1000000]] as const).map(([key,label,max])=><Form.Item key={key} name={key} label={label} rules={[{required:true},{validator:(_,value)=>typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=max?Promise.resolve():Promise.reject(new Error(`0 초과 ${max.toLocaleString()} 이하 값을 입력하세요`))}]}><InputNumber min={0.001} max={max} style={{width:'100%'}}/></Form.Item>)}
 <Form.Item name="openWidth" label="측면 개방 (폭 초과 계획 가능)" valuePropName="checked"><Switch/></Form.Item><Form.Item name="openHeight" label="상부 개방 (높이 초과 계획 가능)" valuePropName="checked"><Switch/></Form.Item>
 </Form></Modal></>;
}
