// 256px q45 render of the comp's own grain texture, inlined so the hero's
// ground paints its final texture in the first paint — no request, no flash of
// flat green. The full 1024px file (static/texture-grain.webp, 54KB) is
// swapped in afterwards by HeartHero.
//
// Sizing was measured, not guessed. Composited over the real green ground at
// 2880px (a 1440@2x display) and diffed against the full-resolution master,
// 99% of pixels land within 3-4/255 at EVERY source width from 512 to 1536 —
// the texture is smooth and low-frequency (stdev 14.1 at every scale), so
// there is no fine grain to preserve. 1024px is where the mean difference
// crosses below 1/255, the visibility threshold on a flat field.
export const TEXTURE_LQIP =
  "data:image/webp;base64,UklGRngCAABXRUJQVlA4IGwCAABQFwCdASoAAb4APt1orVOoqq4sIbM6OcAbiWlu2SGhnkqMFpr9lUbCv31/HZQCEnvQ3Z3obibQ2B9RZ6DyUwWI5I+GBHMAis+SZ6yS8SGYPW4scPAYKrgLtk53IYkYMd1cFrBeLYum4GM235Hh9/YK8uAciwK9w3NEQFTgZIEm3ylRQxhk0+1W4s/R1vgaLavUwE+scZPwS72YXKfQdhqucwILhimaUGEsIZZFt+RZsSDXAaCR4a/t69qeFbzRLZ4IDTAA/u9b4XUO5kOGjlmzdf8hCK7NhmkneI9pB54SJsvLQqBmXlKslrU+IAAZLoOhf/o11n0F5/0zHirTsU3alIIaJRE5JHsMff0TcaFHSpI899mtPELSBWcVvDeJhWqbGKb9uqYIHntOmRbCGy0nFlBRdw2CJ7hU1rDdsQrCAwNq93MnrL3V1xMc01xaq04Dgb1T5sNaEBrjZ+aLCNEKLnwLtbpTCtqfAzATR/ZvEOKP2q+2iZSTGdBFh4WKle9mA/3Psvq+FXuoE1Abseiw0bAQ7cVsFUlX5ndtW6eEB8WtZvEOrwhHt5KQnXhGj4C0RFhjvpdQolGABxqztaOfPNM+P9DDS9UHBWHSZ29yWvFjdaShiNK8p/uIYFNhfYkyMahLG2Psl3vZi1bNeRTa17LJ+nRU01zsEGoEdp8t52j8n+bDYOM5C7h+7niAxpAaynoPF8UpM3HXrNN8j/OSAovCzmCDdJ03n/2+1KF/dAikvX2E/NSBI8kXXkW3A8BFtPsLbh5wOxb+zLmGgtBevB9oI18eBxxly3CkNi3gA4SSB/KOsg1hNMAAAA==";
