import { imageProblem, MAX_IMAGE_BYTES } from '../images.js';

const png = (bytes) => `data:image/png;base64,${Buffer.alloc(bytes).toString('base64')}`;

describe('imageProblem', () => {
    it.each([undefined, null, '', 'https://cdn.example.com/ring.jpg', png(1000), 'data:image/webp;base64,AAAA'])('accepts %s', (v) => {
        expect(imageProblem(v)).toBeNull();
    });

    it('rejects anything that is not a small PNG/JPEG/WebP', () => {
        expect(imageProblem('data:text/html;base64,PHNjcmlwdD4=')).toMatch(/PNG, JPEG or WebP/);
        expect(imageProblem('javascript:alert(1)')).toMatch(/PNG, JPEG or WebP/);
        expect(imageProblem('http://insecure.example.com/x.png')).toMatch(/PNG, JPEG or WebP/);
        expect(imageProblem({})).toMatch(/PNG, JPEG or WebP/);
    });

    it('rejects images over the size limit', () => {
        expect(imageProblem(png(MAX_IMAGE_BYTES))).toBeNull();
        expect(imageProblem(png(MAX_IMAGE_BYTES + 10))).toMatch(/too large/);
    });
});
