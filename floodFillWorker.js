console.log('floodFillWorker.js loaded');

// floodFillWorker.js

const striptOrigin = self.origin;

self.addEventListener('message', function(e) {

    //verify origin of the recieved message
    if (e.origin!== striptOrigin) {
        self.postMessage({
            error: 'origin not allowed'
        });
        return;
    }

    const { imageData, width, height, clickedX, clickedY, targetColor, selectedColor } = e.data;
    const pixelData = new Uint8Array(imageData);
    const visited = new Array(height).fill().map(() => new Array(width).fill(false));
    const stack = [[clickedX, clickedY]];

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        if (x < 0 || x >= width || y < 0 || y >= height || visited[y][x]) continue;

        const index = (y * width + x) * 4;
        if (pixelData[index] !== targetColor[0] ||
            pixelData[index + 1] !== targetColor[1] ||
            pixelData[index + 2] !== targetColor[2] ||
            pixelData[index + 3] !== targetColor[3]) continue;

        pixelData[index] = selectedColor[0];
        pixelData[index + 1] = selectedColor[1];
        pixelData[index + 2] = selectedColor[2];
        pixelData[index + 3] = selectedColor[3];

        visited[y][x] = true;

        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
    }

    self.postMessage(imageData.buffer, [imageData.buffer]);
});
