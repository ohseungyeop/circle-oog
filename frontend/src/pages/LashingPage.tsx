import React, { useState, useEffect } from 'react';

const LashingPage = () => {
    const [nodes, setNodes] = useState([]);
    const [connections, setConnections] = useState([]);
    const [dragging, setDragging] = useState(null);
    const [highlightedNode, setHighlightedNode] = useState(null);

    useEffect(() => {
        const X_CNT = 3; // Front, Back 갯수
        const Y_CNT = 13; // Left, Right 갯수
        const FB_X_POS = 100; // Front, Back 시작 x 좌표
        const F_Y_POS = 50; // Front 시작 y 좌표
        const L_X_POS = 50; // Left 시작 x 좌표
        const X_STEP = 100; // Front, Back 간격
        const Y_STEP = 50; // Left, Right 간격
        let newNodes = [];

        // Front, Back
        for (let i = 1; i <= X_CNT; i++) {
            newNodes.push({ id: `F${i}`, group: 'front', x: FB_X_POS + X_STEP * (i - 1), y: F_Y_POS });
            newNodes.push({ id: `B${i}`, group: 'back', x: FB_X_POS + X_STEP * (i - 1), y: Y_CNT * Y_STEP + Y_STEP * 2 });
        }
        // Left, Right
        for (let i = 1; i <= Y_CNT; i++) {
            newNodes.push({ id: `L${i}`, group: 'left', x: L_X_POS, y: Y_STEP + Y_STEP * (i - 1) + Y_STEP });
            newNodes.push({ id: `R${i}`, group: 'right', x: X_CNT * X_STEP + L_X_POS, y: Y_STEP + Y_STEP * (i - 1) + Y_STEP });
        }

        console.log(newNodes);

        setNodes(newNodes);
    }, []);

    useEffect(() => {
        console.log('Current Connections:', JSON.stringify(connections, null, 2));
    }, [connections]);

    const handleMouseDown = (node) => {
        setDragging({ from: node, toX: node.x, toY: node.y });
    };

    const handleMouseMove = (e) => {
        if (!dragging) return;
        setDragging({ ...dragging, toX: e.clientX, toY: e.clientY });
    };

    const handleMouseUp = (targetNode) => {
        if (dragging && targetNode && dragging.from.id !== targetNode.id) {
            if (
                (dragging.from.group === 'front' && targetNode.group === 'back') ||
                (dragging.from.group === 'back' && targetNode.group === 'front') ||
                (dragging.from.group === 'left' && targetNode.group === 'right') ||
                (dragging.from.group === 'right' && targetNode.group === 'left')
            ) {
                const newConnection = { from: dragging.from, to: targetNode };
                // 기존 connections 배열에서 이미 같은 연결이 있는지 확인
                setConnections((prev) => {
                    const connectionExists = prev.some(
                        (conn) =>
                            (conn.from.id === newConnection.from.id && conn.to.id === newConnection.to.id) ||
                            (conn.from.id === newConnection.to.id && conn.to.id === newConnection.from.id),
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

    const handleLineClick = (index) => {
        setConnections(connections.filter((_, i) => i !== index));
    };

    const handleMouseEnter = (node) => {
        if (
            dragging &&
            ((dragging.from.group === 'front' && node.group === 'back') ||
                (dragging.from.group === 'back' && node.group === 'front') ||
                (dragging.from.group === 'left' && node.group === 'right') ||
                (dragging.from.group === 'right' && node.group === 'left'))
        ) {
            setHighlightedNode(node.id); // 연결 가능한 그룹일 경우 강조
        }
    };

    const handleMouseLeave = () => {
        setHighlightedNode(null); // 마우스가 원을 벗어났을 때 강조를 해제
    };

    return (
        <svg width="600" height="850" onMouseMove={handleMouseMove} onMouseUp={() => setDragging(null)}>
            {connections.map((conn, index) => (
                <line
                    key={`line-${index}`}
                    x1={conn.from.x}
                    y1={conn.from.y}
                    x2={conn.to.x}
                    y2={conn.to.y}
                    stroke="blue"
                    strokeWidth="2"
                    onClick={() => handleLineClick(index)}
                />
            ))}
            {dragging && (
                <line
                    x1={dragging.from.x}
                    y1={dragging.from.y}
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
                    cx={node.x}
                    cy={node.y}
                    r="10"
                    fill={highlightedNode === node.id ? 'green' : 'red'}
                    onMouseDown={() => handleMouseDown(node)}
                    onMouseUp={() => handleMouseUp(node)}
                    onMouseEnter={() => handleMouseEnter(node)} // 마우스가 circle에 들어올 때
                    onMouseLeave={handleMouseLeave} // 마우스가 circle을 벗어날 때
                />
            ))}
        </svg>
    );
};

export default LashingPage;
