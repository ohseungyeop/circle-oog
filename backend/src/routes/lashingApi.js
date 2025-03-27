import replyHelper from '../utils/replyHelper.js';
import authMiddleware from '../utils/authMiddleware.js';
import {
    calculateCBM,
    filterListByWeight,
    filterListByLength,
    filterListByWidth,
    filterListByHeight,
    checkListByWeight,
    checkListByLength,
    checkListByWidth,
    checkListByHeight,
    groupItemListByLength,
    regroupItemList,
} from '../utils/calculateHelper.js';

/**
 * @typedef {Object} LashingConnection
 * @property {{ id: string, group: string, x: number, y: number }} from
 * @property {{ id: string, group: string, x: number, y: number }} to
 * @property {number} toX
 * @property {number} toY
 */

const saveLashingInfo = async (fastify, options) => {
    fastify.post(
        '/',
        {
            preHandler: [authMiddleware],
        },
        replyHelper(async (request, reply) => {
            const connections = /** @type {LashingConnection[]} */ (request.body); // JSON 배열 받기

            try {
                console.log('Received connections:', connections);

                return 'Lashing data saved successfully';
            } catch (error) {
                console.error('❌ Error fetching item list:', error);
                throw error; // 🚨 `replyHelper`가 오류 처리하도록 예외 던지기
            }
        }),
    );
};

export { saveLashingInfo };
