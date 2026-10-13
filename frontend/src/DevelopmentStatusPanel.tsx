import {Alert, Button, Card, Space, Statistic, Table, Tag} from 'antd';
import {useEffect, useState} from 'react';
import type {Api} from './ProjectHistory';
type Summary={total:number;completed:number;incomplete:number;inProgress:number;notStarted:number;verified:number;verificationPending:number};
type Item={id:string;name:string;description:string;development:string;verification:string;evidence:string};
type Status={updated:string;version:string;summary:Summary;items:Item[];verificationRuns:Record<string,unknown>;notes:string[]};
export function DevelopmentStatusPanel({api,compact=false}:{api:Api;compact?:boolean}) {
    const [status,setStatus]=useState<Status>();const [error,setError]=useState('');const [refresh,setRefresh]=useState(0);
    useEffect(()=>{const abort=new AbortController();setError('');api<Status>('/development/status',{signal:abort.signal}).then(v=>{if(!abort.signal.aborted)setStatus(v);}).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'개발현황 조회 실패');});return()=>abort.abort();},[refresh]);
    const labels:Record<string,string>={COMPLETE:'완료',IN_PROGRESS:'진행',NOT_STARTED:'미착수',PASSED:'통과',PENDING:'대기'};
    return <Card title="기능별 개발 · 검증 현황" style={{marginTop:20}} extra={<Button onClick={()=>setRefresh(v=>v+1)}>새로고침</Button>}>
        {error&&<Alert type="error" message={error} showIcon/>}
        {status&&<><p>기준일 {status.updated} · 관리 버전 {status.version} · 내부 개발 범위 기준</p><div className="stats">{[
            ['전체 기능',status.summary.total],['완료',status.summary.completed],['미완료',status.summary.incomplete],['검증 통과',status.summary.verified]
        ].map(([title,value])=><Card key={title}><Statistic title={title} value={value}/></Card>)}</div><Space wrap style={{marginBottom:16}}><Tag>진행 {status.summary.inProgress}</Tag><Tag>미착수 {status.summary.notStarted}</Tag><Tag color="orange">검증 대기 {status.summary.verificationPending}</Tag></Space>
        {!compact&&<Table rowKey="id" dataSource={status.items} pagination={{pageSize:25}} scroll={{x:1000}} columns={[
            {title:'ID',dataIndex:'id'},{title:'기능',dataIndex:'name'},{title:'기능 설명',dataIndex:'description'},
            {title:'개발',dataIndex:'development',render:(v:string)=><Tag color={v==='COMPLETE'?'green':v==='IN_PROGRESS'?'orange':'default'}>{labels[v]}</Tag>},
            {title:'검증',dataIndex:'verification',render:(v:string)=><Tag color={v==='PASSED'?'green':'orange'}>{labels[v]}</Tag>},
            {title:'근거 · 남은 범위',dataIndex:'evidence'}
        ]}/>}<p>완료는 코드와 표에 명시한 내부 범위를 뜻합니다. 실제 업무 승인과 UI 직접 조작 검증은 별도입니다.</p>
        <Space wrap>{Object.entries(status.verificationRuns).map(([k,v])=><Tag key={k}>{k}: {String(v)}</Tag>)}</Space>{!compact&&status.notes.map(n=><p key={n} className="secondary">{n}</p>)}</>}
    </Card>;
}
