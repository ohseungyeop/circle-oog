import React, { useState, useEffect } from 'react';
import styles from './LashingPage.module.css';

interface ModalProps {
    pckOrdSeq: number;
    clpNo: number;
    tpsz: string;
    xCount?: number;
    yCount?: number;
    onClose: () => void;
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

const LashingPage: React.FC<ModalProps> = ({ pckOrdSeq, clpNo, tpsz, xCount, yCount, onClose }) => {
    const [nodes, setNodes] = useState<lashingPointProps[]>([]);
    const [connections, setConnections] = useState<lashingLinkProps[]>([]);
    const [dragging, setDragging] = useState<lashingLinkProps | null>(null);
    const [highlightedNode, setHighlightedNode] = useState<lashingPointProps | null>(null);
    const SVG_WIDTH = 600; // 전체 SVG 너비
    const SVG_HEIGHT = 850; // 전체 SVG 높이
    let X_CNT = 0; // Front, Back 갯수
    let Y_CNT = 0; // Left, Right 갯수

    useEffect(() => {
        console.log('xCount:', xCount);
        console.log('yCount:', yCount);
        X_CNT = xCount ?? 3; // Front, Back 갯수
        Y_CNT = yCount ?? 13; // Left, Right 갯수
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

        console.log(newNodes);

        setNodes(newNodes);
    }, []);

    useEffect(() => {
        console.log('Current Connections:', JSON.stringify(connections, null, 2));
    }, [connections]);

    const handleMouseDown = (node: lashingPointProps) => {
        setDragging({ from: node, to: null, toX: node.x, toY: node.y });
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!dragging) return;
        setDragging({ ...dragging, toX: e.clientX, toY: e.clientY });
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

                    // 연결이 없으면 추가하고, 있으면 그대로 반환
                    if (connectionExists) {
                        return prev;
                    }
                    return [...prev, newConnection];
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

    return (
        <div className={styles.lashingMain}>
            <div className={styles.lashingBody}>
                <div className={styles.lashingHeader}>
                    <h2 className={styles.lashingTitle}>
                        Lashing (<strong>PckOrdSeq:</strong> {pckOrdSeq},<strong>ClpNo:</strong> {clpNo},<strong>Tpsz:</strong>{' '}
                        {tpsz})
                    </h2>
                    <button onClick={onClose} className={styles.modalCloseButton}>
                        X
                    </button>
                </div>
                <svg
                    width={SVG_WIDTH}
                    height={SVG_HEIGHT}
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    onMouseMove={handleMouseMove}
                    onMouseUp={() => setDragging(null)}
                >
                    <g transform={`translate(${SVG_WIDTH / 2}, ${SVG_HEIGHT / 2})`}>
                        {connections.map((conn, index) => (
                            <line
                                key={`line-${index}`}
                                x1={conn.from?.x}
                                y1={conn.from?.y}
                                x2={conn.to?.x}
                                y2={conn.to?.y}
                                stroke="blue"
                                strokeWidth="2"
                                onClick={() => handleLineClick(index)}
                            />
                        ))}
                        {dragging && (
                            <line
                                x1={dragging.from?.x}
                                y1={dragging.from?.y}
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
                                cx={(node.x - X_CNT * 0.5) * SVG_WIDTH}
                                cy={(node.y - Y_CNT * 0.5) * SVG_HEIGHT}
                                r={20}
                                fill={highlightedNode === node ? 'green' : 'red'}
                                onMouseDown={() => handleMouseDown(node)}
                                onMouseUp={() => handleMouseUp(node)}
                                onMouseEnter={() => handleMouseEnter(node)} // 마우스가 circle에 들어올 때
                                onMouseLeave={handleMouseLeave} // 마우스가 circle을 벗어날 때
                            />
                        ))}
                    </g>
                </svg>
            </div>
        </div>
    );
};

export default LashingPage;
