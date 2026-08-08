import { shuffleBag } from './board.js';

export function createPieceQueue(bagFactory = shuffleBag) {
    const buffer = [];
    function ensure(min) {
        while (buffer.length < min) buffer.push(...bagFactory());
    }
    return {
        next() {
            ensure(1);
            const piece = buffer.shift();
            ensure(5);
            return piece;
        },
        preview(count = 5) {
            ensure(count);
            return buffer.slice(0, count);
        },
        reset() {
            buffer.length = 0;
        },
    };
}
