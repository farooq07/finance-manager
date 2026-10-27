import { parse24kPerTola } from '../goldScraper.service.js';

describe('parse24kPerTola', () => {
    it('reads the hamariweb sentence', () => {
        const text = 'The gold rate in Pakistan today on Tuesday, Oct 27, 2026, is PKR 419,500 per tola for 24K gold and PKR 384,647 per tola for 22K gold in the local market.';
        expect(parse24kPerTola(text)).toBe(419500);
    });

    it('reads the urdupoint sentence', () => {
        const text = 'The gold rate in Pakistan today on 27 Oct, 2026 is Rs. 419,500 per tola for 24K gold and Rs. 384,537 per tola for 22K gold.';
        expect(parse24kPerTola(text)).toBe(419500);
    });

    it('never takes the 22K price', () => {
        expect(parse24kPerTola('PKR 384,647 per tola for 22K gold')).toBeNull();
    });

    it('rejects a page without the sentence (no guessing from other numbers)', () => {
        expect(parse24kPerTola('Silver Rs. 5,200 · Petrol Rs. 265 · Rs. 419,500')).toBeNull();
        expect(parse24kPerTola('')).toBeNull();
    });

    it('rejects implausible values', () => {
        expect(parse24kPerTola('is PKR 4,195 per tola for 24K gold')).toBeNull();
    });
});
