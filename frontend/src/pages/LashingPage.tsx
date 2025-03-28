import React, { useState, useEffect } from 'react';
import { useCookies } from 'react-cookie';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface lashingPageProps {
    isOpen?: boolean;
    onClose?: () => void;
    pckOrdSeq: number;
    clpNo: number;
    tpsz: string;
    xCount?: number;
    yCount?: number;
}

interface lashingPageDataProps extends lashingPageProps {
    data: lashingLinkProps[];
}

interface lashingPointProps {
    id: string;
    group: string;
    x: number;
    y: number;
}

interface lashingLinkProps {
    from: lashingPointProps | null;
    to: lashingPointProps | null;
    toX: number;
    toY: number;
}

const LashingPage: React.FC<lashingPageProps> = ({ isOpen, onClose, pckOrdSeq, clpNo, tpsz, xCount, yCount }) => {
    const apiUrl = import.meta.env.VITE_BACKEND_URL;
    const [cookies] = useCookies(['authToken']);
    const [snackbar, setSnackbar] = React.useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning' | 'info';
    }>({ open: false, message: '', severity: 'success' });
    const handleCloseSnackbar = () => {
        setSnackbar((prevState) => ({
            ...prevState,
            open: false,
        }));
    };

    const [nodes, setNodes] = useState<lashingPointProps[]>([]);
    const [connections, setConnections] = useState<lashingLinkProps[]>([]);
    const [dragging, setDragging] = useState<lashingLinkProps | null>(null);
    const [highlightedNode, setHighlightedNode] = useState<lashingPointProps | null>(null);

    const SVG_WIDTH = 600; // 전체 SVG 너비
    const SVG_HEIGHT = 850; // 전체 SVG 높이
    const FORCE_ALIGN_X = 80;
    const FORCE_ALIGN_Y = 30;

    useEffect(() => {
        const X_CNT = xCount ?? 3; // Front, Back 갯수
        const Y_CNT = yCount ?? 13; // Left, Right 갯수
        const FB_X_POS = 100; // Front, Back 시작 x 좌표
        const F_Y_POS = 50; // Front 시작 y 좌표
        const L_X_POS = 50; // Left 시작 x 좌표
        const X_STEP = 100; // Front, Back 간격
        const Y_STEP = 50; // Left, Right 간격
        let newNodes = [];

        // Front, Back
        for (let i = 1; i <= X_CNT; i++) {
            let xRatio = (FB_X_POS + X_STEP * (i - 1)) / SVG_WIDTH;
            let frontYRatio = F_Y_POS / SVG_HEIGHT;
            let backYRatio = (Y_CNT * Y_STEP + Y_STEP * 2) / SVG_HEIGHT;

            newNodes.push({ id: `F${i}`, group: 'front', x: xRatio, y: frontYRatio });
            newNodes.push({ id: `B${i}`, group: 'back', x: xRatio, y: backYRatio });
        }

        // Left, Right
        for (let i = 1; i <= Y_CNT; i++) {
            let yRatio = (Y_STEP + Y_STEP * (i - 1) + Y_STEP) / SVG_HEIGHT;
            let leftXRatio = L_X_POS / SVG_WIDTH;
            let rightXRatio = (X_CNT * X_STEP + L_X_POS) / SVG_WIDTH;

            newNodes.push({ id: `L${i}`, group: 'left', x: leftXRatio, y: yRatio });
            newNodes.push({ id: `R${i}`, group: 'right', x: rightXRatio, y: yRatio });
        }

        setNodes(newNodes);
        setConnections([]);
    }, [isOpen]);

    useEffect(() => {
        console.log('Current Connections:', JSON.stringify(connections, null, 2));
    }, [connections]);

    useEffect(() => {
        const fetchData = async () => {
            if (pckOrdSeq === 0 || clpNo === 0) {
                console.log('Invalid pckOrdSeq or clpNo');
                return; // pckOrdSeq나 clpNo가 0인 경우 요청을 보내지 않음
            }
            try {
                const response = await fetch(`${apiUrl}/vos/oog/v1/lashing/${pckOrdSeq}/${clpNo}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${cookies.authToken}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch lashing data`);
                }
                const result = await response.json();
                setConnections(result);
            } catch (error) {
                console.error('❌ Error fetching lashing data:', error);
                setSnackbar({
                    open: true,
                    message: `데이터를 불러오는 데 실패했습니다.`,
                    severity: 'error',
                });
            }
        };
        fetchData();
    }, [isOpen]);

    const handleMouseDown = (node: lashingPointProps) => {
        setDragging({
            from: node,
            to: null,
            toX: (node.x - 0.5) * SVG_WIDTH + SVG_WIDTH / 2,
            toY: (node.y - 0.5) * SVG_HEIGHT + SVG_HEIGHT / 2,
        });
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!dragging) return;

        const svgElement = e.currentTarget; // 현재 SVG 요소 가져오기
        const svgRect = svgElement.getBoundingClientRect(); // SVG의 위치 정보 가져오기

        // SVG 내부 좌표 계산
        const relativeX = e.clientX - svgRect.left - FORCE_ALIGN_X;
        const relativeY = e.clientY - svgRect.top - FORCE_ALIGN_Y;

        setDragging({ ...dragging, toX: relativeX, toY: relativeY });
    };

    const handleMouseUp = (targetNode: lashingPointProps | null) => {
        if (dragging && targetNode && dragging.from?.id !== targetNode.id) {
            if (
                (dragging.from?.group === 'front' && targetNode.group === 'back') ||
                (dragging.from?.group === 'back' && targetNode.group === 'front') ||
                (dragging.from?.group === 'left' && targetNode.group === 'right') ||
                (dragging.from?.group === 'right' && targetNode.group === 'left')
            ) {
                const newConnection = { from: dragging.from, to: targetNode, toX: targetNode.x, toY: targetNode.y };
                // 기존 connections 배열에서 이미 같은 연결이 있는지 확인
                setConnections((prev) => {
                    const connectionExists = prev.some(
                        (conn) =>
                            (conn.from?.id === newConnection.from.id && conn.to?.id === newConnection.to.id) ||
                            (conn.from?.id === newConnection.to.id && conn.to?.id === newConnection.from.id),
                    );

                    return connectionExists ? prev : [...prev, newConnection];
                });
            }
        }
        setDragging(null);
        setHighlightedNode(null);
    };

    const handleLineClick = (index: number) => {
        setConnections(connections.filter((_, i) => i !== index));
    };

    const handleMouseEnter = (node: lashingPointProps) => {
        if (
            dragging &&
            ((dragging.from?.group === 'front' && node.group === 'back') ||
                (dragging.from?.group === 'back' && node.group === 'front') ||
                (dragging.from?.group === 'left' && node.group === 'right') ||
                (dragging.from?.group === 'right' && node.group === 'left'))
        ) {
            setHighlightedNode(node); // 연결 가능한 그룹일 경우 강조
        }
    };

    const handleMouseLeave = () => {
        setHighlightedNode(null); // 마우스가 원을 벗어났을 때 강조를 해제
    };

    const saveLashing = async () => {
        const lineList = document.getElementsByTagName('line');
        if (!lineList.length) {
            setSnackbar({
                open: true,
                message: '연결된 라인이 없습니다!',
                severity: 'warning',
            });
            return;
        }
        try {
            const lashingPageData: lashingPageDataProps = {
                pckOrdSeq: pckOrdSeq,
                clpNo: clpNo,
                tpsz: tpsz?.replace("'", '') ?? '40FR',
                xCount: xCount,
                yCount: yCount,
                data: connections,
            };
            console.log('lashingPageData:', JSON.stringify(lashingPageData));
            const response = await fetch(`${apiUrl}/vos/oog/v1/lashing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${cookies.authToken}`,
                },
                body: JSON.stringify(lashingPageData),
            });

            // ✅ 응답이 정상인지 체크
            if (!response.ok) {
                throw new Error(`저장 실패: ${response.status} ${response.statusText}`);
            }

            // ✅ 성공 메시지 출력
            setSnackbar({
                open: true,
                message: '저장되었습니다.',
                severity: 'success',
            });
        } catch (error) {
            setSnackbar({
                open: true,
                message: `저장을 실패했습니다.`,
                severity: 'error',
            });
        }
    };

    return (
        <>
            <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle sx={{ backgroundColor: '#1976d2', color: 'white' }}>
                    <strong>Lashing</strong> [PckOrdSeq: {pckOrdSeq}, ClpNo: {clpNo}, Tpsz: {tpsz}]
                    <IconButton
                        aria-label="close"
                        onClick={onClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: 'white',
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ overflowX: 'hidden' }}>
                    <svg
                        width={SVG_WIDTH}
                        height={SVG_HEIGHT}
                        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                        preserveAspectRatio="xMidYMid meet"
                        onMouseMove={handleMouseMove}
                        onMouseUp={() => setDragging(null)}
                    >
                        <g transform={`translate(${FORCE_ALIGN_X},${FORCE_ALIGN_Y})`}>
                            {Array.isArray(connections) &&
                                connections.map((conn, index) => (
                                    <line
                                        key={`line-${index}`}
                                        x1={conn.from ? conn.from.x * SVG_WIDTH : 0}
                                        y1={conn.from ? conn.from.y * SVG_HEIGHT : 0}
                                        x2={conn.to ? conn.to.x * SVG_WIDTH : conn.toX}
                                        y2={conn.to ? conn.to.y * SVG_HEIGHT : conn.toY}
                                        stroke="blue"
                                        strokeWidth="2"
                                        onClick={() => handleLineClick(index)}
                                    />
                                ))}
                            {dragging && (
                                <line
                                    x1={dragging.from ? dragging.from.x * SVG_WIDTH : 0}
                                    y1={dragging.from ? dragging.from.y * SVG_HEIGHT : 0}
                                    x2={dragging.toX}
                                    y2={dragging.toY}
                                    stroke="gray"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />
                            )}
                            {nodes.map((node) => (
                                <circle
                                    key={node.id}
                                    cx={(node.x - 0.5) * SVG_WIDTH + SVG_WIDTH / 2}
                                    cy={(node.y - 0.5) * SVG_HEIGHT + SVG_HEIGHT / 2}
                                    r={14}
                                    fill={highlightedNode === node ? 'green' : 'red'}
                                    onMouseDown={() => handleMouseDown(node)}
                                    onMouseUp={() => handleMouseUp(node)}
                                    onMouseEnter={() => handleMouseEnter(node)} // 마우스가 circle에 들어올 때
                                    onMouseLeave={handleMouseLeave} // 마우스가 circle을 벗어날 때
                                />
                            ))}
                        </g>
                    </svg>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={() => saveLashing()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default LashingPage;
