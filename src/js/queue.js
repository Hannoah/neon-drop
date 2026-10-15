import { shuffleBag } from './board.js';

export function createPieceQueue(bagFactory = shuffleBag) {
    let factory = bagFactory;
    const buffer = [];
    function ensure(min) {
        while (buffer.length < min) buffer.push(...factory());
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
        setBagFactory(nextFactory) {
            factory = nextFactory || shuffleBag;
            buffer.length = 0;
        },
    };
}
